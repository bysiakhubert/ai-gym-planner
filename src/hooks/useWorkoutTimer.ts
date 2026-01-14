import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Timer state interface
 */
export interface TimerState {
  isRunning: boolean;
  timeLeft: number;
  initialTime: number;
  isActive: boolean;
}

/**
 * Return type for useWorkoutTimer hook
 */
export interface UseWorkoutTimerReturn {
  timerState: TimerState;
  startTimer: (seconds: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  addTime: (seconds: number) => void;
  skipTimer: () => void;
}

/**
 * Plays the timer end sound
 */
function playTimerEndSound(): void {
  try {
    // Try to play a sound file first
    const audio = new Audio("/sounds/timer-end.mp3");
    audio.play().catch(() => {
      // If file doesn't exist, use Web Audio API beep
      playBeep();
    });
  } catch {
    playBeep();
  }
}

/**
 * Creates a beep sound using Web Audio API
 */
function playBeep(): void {
  try {
    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch {
    // Audio not available, ignore
  }
}

/**
 * Triggers device vibration if available
 */
function triggerVibration(): void {
  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 200]);
  }
}

/**
 * Custom hook for managing workout rest timer
 * Handles countdown, sound notifications, and vibration
 *
 * Features:
 * - Accurate time tracking using Date.now() delta
 * - Sound notification on timer end
 * - Vibration notification on timer end
 * - Pause/Resume/Skip controls
 * - Add time functionality
 *
 * @returns Timer state and control functions
 */
export function useWorkoutTimer(): UseWorkoutTimerReturn {
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    timeLeft: 0,
    initialTime: 0,
    isActive: false,
  });

  // Reference to track the last tick time for accurate countdown
  const lastTickRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Start the timer with specified duration
   */
  const startTimer = useCallback((seconds: number) => {
    setTimerState({
      isRunning: true,
      timeLeft: seconds,
      initialTime: seconds,
      isActive: true,
    });
    lastTickRef.current = Date.now();
  }, []);

  /**
   * Pause the timer
   */
  const pauseTimer = useCallback(() => {
    setTimerState((prev) => ({ ...prev, isRunning: false }));
  }, []);

  /**
   * Resume the timer
   */
  const resumeTimer = useCallback(() => {
    lastTickRef.current = Date.now();
    setTimerState((prev) => ({ ...prev, isRunning: true }));
  }, []);

  /**
   * Add time to the timer
   */
  const addTime = useCallback((seconds: number) => {
    setTimerState((prev) => ({
      ...prev,
      timeLeft: prev.timeLeft + seconds,
      isActive: true,
    }));
  }, []);

  /**
   * Skip/dismiss the timer
   */
  const skipTimer = useCallback(() => {
    setTimerState({
      isRunning: false,
      timeLeft: 0,
      initialTime: 0,
      isActive: false,
    });
  }, []);

  /**
   * Timer tick effect using accurate time delta
   */
  useEffect(() => {
    if (!timerState.isRunning || timerState.timeLeft <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Use interval with delta time calculation for accuracy
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const delta = Math.floor((now - lastTickRef.current) / 1000);

      if (delta >= 1) {
        lastTickRef.current = now;

        setTimerState((prev) => {
          const newTimeLeft = Math.max(0, prev.timeLeft - delta);

          if (newTimeLeft <= 0 && prev.timeLeft > 0) {
            // Timer just finished
            playTimerEndSound();
            triggerVibration();

            return {
              ...prev,
              isRunning: false,
              timeLeft: 0,
              isActive: true, // Keep active to show "done" state
            };
          }

          return { ...prev, timeLeft: newTimeLeft };
        });
      }
    }, 100); // Check every 100ms for smoother updates

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState.isRunning, timerState.timeLeft]);

  /**
   * Auto-hide timer after it's been at 0 for a while
   */
  useEffect(() => {
    if (timerState.timeLeft === 0 && timerState.isActive && !timerState.isRunning) {
      const timeout = setTimeout(() => {
        setTimerState((prev) => ({ ...prev, isActive: false }));
      }, 3000); // Hide after 3 seconds

      return () => clearTimeout(timeout);
    }
  }, [timerState.timeLeft, timerState.isActive, timerState.isRunning]);

  return {
    timerState,
    startTimer,
    pauseTimer,
    resumeTimer,
    addTime,
    skipTimer,
  };
}
