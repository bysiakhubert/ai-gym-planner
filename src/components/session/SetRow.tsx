import type { SessionSet } from "@/types";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SetRowProps {
  set: SessionSet;
  setIndex: number;
  exerciseIndex: number;
  onUpdate: (field: keyof SessionSet, value: number | boolean | null) => void;
  onStartRest: () => void;
}

/**
 * Formats rest time for display
 */
function formatRestTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${mins}m`;
}

/**
 * SetRow displays a single set within an exercise
 * Handles input for actual weight/reps, completion checkbox, and rest timer trigger
 * Optimized for mobile touch interactions with larger touch targets
 */
export function SetRow({ set, setIndex, onUpdate, onStartRest }: SetRowProps) {
  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      onUpdate("actual_weight", null);
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      onUpdate("actual_weight", numValue);
    }
  };

  const handleRepsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      onUpdate("actual_reps", null);
      return;
    }
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      onUpdate("actual_reps", numValue);
    }
  };

  const handleCompletedChange = (checked: boolean) => {
    onUpdate("completed", checked);
  };

  // Display values - show actual if set, otherwise planned as placeholder
  const displayWeight = set.actual_weight ?? "";
  const displayReps = set.actual_reps ?? "";
  const placeholderWeight = set.planned_weight?.toString() ?? "-";
  const placeholderReps = set.planned_reps.toString();

  return (
    <div
      className={cn(
        "grid grid-cols-[36px_1fr_1fr_44px_44px] sm:grid-cols-[40px_1fr_1fr_48px_48px] gap-1.5 sm:gap-2 items-center p-2 sm:p-3 rounded-lg transition-colors",
        set.completed && "bg-green-50 dark:bg-green-950/30"
      )}
    >
      {/* Set Number */}
      <span className="text-center text-sm font-semibold text-muted-foreground">
        {setIndex + 1}
      </span>

      {/* Weight Input */}
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0"
          value={displayWeight}
          onChange={handleWeightChange}
          placeholder={placeholderWeight}
          disabled={set.completed}
          className={cn(
            "h-11 sm:h-10 text-center text-base sm:text-sm font-medium",
            set.completed && "bg-transparent border-transparent opacity-75"
          )}
          aria-label={`Ciężar dla serii ${setIndex + 1}`}
        />
        {/* Planned value indicator */}
        {!set.completed && set.planned_weight && (
          <span className="absolute -top-1.5 right-1 text-[10px] text-muted-foreground/70 bg-background px-1">
            {set.planned_weight}kg
          </span>
        )}
      </div>

      {/* Reps Input */}
      <div className="relative">
        <Input
          type="number"
          inputMode="numeric"
          min="0"
          value={displayReps}
          onChange={handleRepsChange}
          placeholder={placeholderReps}
          disabled={set.completed}
          className={cn(
            "h-11 sm:h-10 text-center text-base sm:text-sm font-medium",
            set.completed && "bg-transparent border-transparent opacity-75"
          )}
          aria-label={`Powtórzenia dla serii ${setIndex + 1}`}
        />
        {/* Planned value indicator */}
        {!set.completed && (
          <span className="absolute -top-1.5 right-1 text-[10px] text-muted-foreground/70 bg-background px-1">
            {set.planned_reps}×
          </span>
        )}
      </div>

      {/* Rest Timer Button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 sm:h-10 sm:w-10 touch-manipulation"
        onClick={onStartRest}
        title={`Przerwa: ${formatRestTime(set.rest_seconds)}`}
        aria-label={`Rozpocznij przerwę ${formatRestTime(set.rest_seconds)}`}
      >
        <Timer className="h-5 w-5 sm:h-4 sm:w-4" />
      </Button>

      {/* Completion Checkbox */}
      <div className="flex justify-center">
        <Checkbox
          checked={set.completed}
          onCheckedChange={handleCompletedChange}
          aria-label={`Oznacz serię ${setIndex + 1} jako ukończoną`}
          className="h-6 w-6 sm:h-5 sm:w-5 touch-manipulation"
        />
      </div>
    </div>
  );
}
