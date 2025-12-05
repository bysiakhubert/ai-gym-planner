import { Button } from "@/components/ui/button";
import { Play, Pause, Plus, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkoutTimerProps {
  isActive: boolean;
  timeLeft: number;
  initialTime: number;
  isRunning: boolean;
  onPause: () => void;
  onResume: () => void;
  onAddTime: (seconds: number) => void;
  onSkip: () => void;
}

/**
 * Formats seconds into MM:SS display
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * WorkoutTimer displays a floating/sticky timer for rest periods
 * Slides up from the bottom when active
 * Optimized for mobile with larger touch targets and better visibility
 */
export function WorkoutTimer({
  isActive,
  timeLeft,
  initialTime,
  isRunning,
  onPause,
  onResume,
  onAddTime,
  onSkip,
}: WorkoutTimerProps) {
  const progressPercent = initialTime > 0 ? (timeLeft / initialTime) * 100 : 0;

  // Determine urgency states
  const isUrgent = timeLeft <= 10 && timeLeft > 0;
  const isFinished = timeLeft === 0 && !isRunning && initialTime > 0;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ease-out safe-area-inset-bottom",
        isActive ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div
        className={cn(
          "bg-background border-t-2 shadow-2xl",
          isUrgent && "bg-orange-50 dark:bg-orange-950/50 border-orange-400 dark:border-orange-600",
          isFinished && "bg-green-50 dark:bg-green-950/50 border-green-400 dark:border-green-600",
          !isUrgent && !isFinished && "border-primary"
        )}
      >
        {/* Progress Bar */}
        <div className="h-1.5 bg-muted">
          <div
            className={cn(
              "h-full transition-all duration-1000 ease-linear",
              isUrgent ? "bg-orange-500" : "bg-primary",
              isFinished && "bg-green-500"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="container mx-auto px-4 py-4 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Timer Display */}
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={cn(
                  "text-4xl sm:text-3xl font-mono font-bold tabular-nums tracking-tight",
                  isUrgent && "text-orange-600 dark:text-orange-400",
                  isFinished && "text-green-600 dark:text-green-400",
                  isUrgent && isRunning && "animate-pulse"
                )}
              >
                {formatTime(timeLeft)}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">Przerwa</span>
                {isFinished && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Zakończona!
                  </span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* +30s Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddTime(30)}
                className="h-11 sm:h-10 px-3 touch-manipulation font-semibold"
                aria-label="Dodaj 30 sekund"
              >
                <Plus className="h-4 w-4 mr-1" />
                30s
              </Button>

              {/* Play/Pause Button */}
              <Button
                variant={isRunning ? "secondary" : "default"}
                size="icon"
                onClick={isRunning ? onPause : onResume}
                className={cn(
                  "h-12 w-12 sm:h-10 sm:w-10 touch-manipulation",
                  !isRunning && !isFinished && "bg-primary"
                )}
                aria-label={isRunning ? "Pauza" : "Wznów"}
              >
                {isRunning ? (
                  <Pause className="h-5 w-5 sm:h-4 sm:w-4" />
                ) : (
                  <Play className="h-5 w-5 sm:h-4 sm:w-4 ml-0.5" />
                )}
              </Button>

              {/* Skip Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onSkip}
                className="h-12 w-12 sm:h-10 sm:w-10 touch-manipulation"
                aria-label="Pomiń przerwę"
              >
                <SkipForward className="h-5 w-5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
