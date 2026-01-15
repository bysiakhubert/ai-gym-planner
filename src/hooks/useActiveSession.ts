/* eslint-disable react-compiler/react-compiler */
import { useState, useEffect, useCallback, useRef } from "react";
import type { SessionResponse, SessionStructure, SessionSet } from "@/types";
import { updateSession, completeSession } from "@/lib/api/sessions";
import { toast } from "sonner";

/**
 * Local storage key prefix for session backup
 */
const STORAGE_KEY_PREFIX = "active_session_";

/**
 * Debounce delay for autosave (ms)
 */
const AUTOSAVE_DELAY = 5000;

/**
 * Session state interface
 */
export interface SessionState {
  data: SessionStructure | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
}

/**
 * Completion stats interface
 */
export interface CompletionStats {
  completed: number;
  total: number;
  percent: number;
}

/**
 * Return type for useActiveSession hook
 */
export interface UseActiveSessionReturn {
  sessionId: string | null;
  sessionData: SessionStructure | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  isCompleting: boolean;
  stats: CompletionStats;
  updateSet: (exerciseIdx: number, setIdx: number, field: keyof SessionSet, value: number | boolean | null) => void;
  handleComplete: () => Promise<void>;
  handleCancel: () => void;
  forceSave: () => Promise<void>;
}

/**
 * Custom hook for managing active training session state
 * Handles session data, autosave, localStorage persistence, and completion
 *
 * @param initialSession - Initial session data from server
 * @returns Session state and control functions
 */
export function useActiveSession(initialSession: SessionResponse | null): UseActiveSessionReturn {
  // Session state
  const [sessionData, setSessionData] = useState<SessionStructure | null>(initialSession?.session ?? null);
  const [sessionId] = useState<string | null>(initialSession?.id ?? null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Autosave debounce ref
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Clean up old session data from localStorage on mount
   */
  useEffect(() => {
    // Clean up any old session data from localStorage
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        // Keep only the current session's data
        if (sessionId && key === `${STORAGE_KEY_PREFIX}${sessionId}`) {
          continue;
        }
        keysToRemove.push(key);
      }
    }

    // Remove old session data
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount, sessionId used for filtering

  /**
   * Load session from localStorage if available, valid, and newer
   */
  useEffect(() => {
    if (!sessionId || !initialSession) return;

    const storageKey = `${STORAGE_KEY_PREFIX}${sessionId}`;
    const storedData = localStorage.getItem(storageKey);

    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        const storedTimestamp = parsed.timestamp;
        const serverTimestamp = new Date(initialSession.created_at).getTime();

        // Validate that localStorage data matches this session
        const isValidSession =
          parsed.session &&
          parsed.session.plan_name === initialSession.session.plan_name &&
          parsed.session.day_name === initialSession.session.day_name &&
          parsed.session.date === initialSession.session.date;

        if (!isValidSession) {
          // Data doesn't match this session - remove stale data
          localStorage.removeItem(storageKey);
          return;
        }

        // Use localStorage data if it's newer than server data
        if (storedTimestamp > serverTimestamp) {
          setSessionData(parsed.session);
          toast.info("Przywrócono niezapisane zmiany z poprzedniej sesji.");
        }
      } catch {
        // Invalid localStorage data, ignore
        localStorage.removeItem(storageKey);
      }
    }
  }, [sessionId, initialSession]);

  /**
   * Save to localStorage on session data change
   */
  useEffect(() => {
    if (!sessionId || !sessionData) return;

    const storageKey = `${STORAGE_KEY_PREFIX}${sessionId}`;
    const dataToStore = {
      session: sessionData,
      timestamp: Date.now(),
    };

    localStorage.setItem(storageKey, JSON.stringify(dataToStore));
  }, [sessionId, sessionData]);

  /**
   * Perform autosave to API
   */
  const performAutosave = useCallback(async () => {
    // Don't autosave if session is being completed or already completing
    if (!sessionId || !sessionData || isCompleting) return;

    setIsSaving(true);
    try {
      await updateSession(sessionId, { session: sessionData });
      setLastSavedAt(new Date());
      setIsDirty(false);
    } catch {
      toast.error("Błąd zapisu. Dane są bezpiecznie zapisane lokalnie.");
    } finally {
      setIsSaving(false);
    }
  }, [sessionId, sessionData, isCompleting]);

  /**
   * Autosave to API with debounce
   */
  useEffect(() => {
    // Don't autosave if completing or not dirty
    if (!isDirty || !sessionId || !sessionData || isCompleting) return;

    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Set new timeout for autosave
    autosaveTimeoutRef.current = setTimeout(performAutosave, AUTOSAVE_DELAY);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [isDirty, sessionId, sessionData, performAutosave, isCompleting]);

  /**
   * Warn user before leaving with unsaved changes
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "Masz niezapisane zmiany. Czy na pewno chcesz opuścić stronę?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  /**
   * Update a specific set in the session
   */
  const updateSet = useCallback(
    (exerciseIdx: number, setIdx: number, field: keyof SessionSet, value: number | boolean | null) => {
      if (!sessionData) return;

      setSessionData((prev) => {
        if (!prev) return prev;

        const newExercises = [...prev.exercises];
        const newSets = [...newExercises[exerciseIdx].sets];
        const currentSet = { ...newSets[setIdx] };

        // Handle completion logic - copy planned to actual if empty
        if (field === "completed" && value === true) {
          if (currentSet.actual_reps == null) {
            currentSet.actual_reps = currentSet.planned_reps;
          }
          if (currentSet.actual_weight == null && currentSet.planned_weight != null) {
            currentSet.actual_weight = currentSet.planned_weight;
          }
        }

        // Update the field
        (currentSet as Record<string, unknown>)[field] = value;
        newSets[setIdx] = currentSet;
        newExercises[exerciseIdx] = { ...newExercises[exerciseIdx], sets: newSets };

        return { ...prev, exercises: newExercises };
      });

      setIsDirty(true);
    },
    [sessionData]
  );

  /**
   * Force save to API immediately
   */
  const forceSave = useCallback(async () => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    await performAutosave();
  }, [performAutosave]);

  /**
   * Handle session completion
   */
  const handleComplete = useCallback(async () => {
    if (!sessionId || !sessionData) return;

    // Cancel any pending autosave to prevent race condition
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    setIsCompleting(true);
    setIsDirty(false); // Prevent further autosaves

    try {
      await completeSession(sessionId, { session: sessionData });

      // Clear localStorage
      const storageKey = `${STORAGE_KEY_PREFIX}${sessionId}`;
      localStorage.removeItem(storageKey);

      toast.success("Trening zakończony!");
      window.location.href = "/";
    } catch {
      toast.error("Błąd zakończenia treningu. Spróbuj ponownie.");
      setIsCompleting(false);
    }
  }, [sessionId, sessionData]);

  /**
   * Handle cancel session
   */
  const handleCancel = useCallback(() => {
    const confirmCancel = window.confirm("Czy na pewno chcesz anulować trening? Twój postęp zostanie utracony.");

    if (confirmCancel && sessionId) {
      const storageKey = `${STORAGE_KEY_PREFIX}${sessionId}`;
      localStorage.removeItem(storageKey);
      window.location.href = "/";
    }
  }, [sessionId]);

  /**
   * Calculate completion stats
   */
  const stats: CompletionStats = (() => {
    if (!sessionData) return { completed: 0, total: 0, percent: 0 };

    let completed = 0;
    let total = 0;

    for (const exercise of sessionData.exercises) {
      for (const set of exercise.sets) {
        total++;
        if (set.completed) {
          completed++;
        }
      }
    }

    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percent };
  })();

  return {
    sessionId,
    sessionData,
    isDirty,
    isSaving,
    lastSavedAt,
    isCompleting,
    stats,
    updateSet,
    handleComplete,
    handleCancel,
    forceSave,
  };
}
