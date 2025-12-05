import type { SessionExercise, SessionSet } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SetRow } from "./SetRow";
import { cn } from "@/lib/utils";

export interface ExerciseCardProps {
  exercise: SessionExercise;
  exerciseIndex: number;
  onUpdateSet: (exerciseIdx: number, setIdx: number, field: keyof SessionSet, value: number | boolean | null) => void;
  onStartRest: (seconds: number) => void;
}

/**
 * ExerciseCard displays a single exercise with all its sets
 * Groups sets in a table-like layout for easy data entry
 * Optimized for mobile with responsive spacing and typography
 */
export function ExerciseCard({ exercise, exerciseIndex, onUpdateSet, onStartRest }: ExerciseCardProps) {
  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const totalSets = exercise.sets.length;
  const isFullyCompleted = completedSets === totalSets;

  return (
    <Card className={cn(isFullyCompleted && "border-green-200 dark:border-green-800")}>
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base sm:text-lg font-semibold leading-tight">
            {exercise.name}
          </CardTitle>
          <Badge
            variant={isFullyCompleted ? "default" : "secondary"}
            className={cn(
              "shrink-0 tabular-nums",
              isFullyCompleted && "bg-green-600 hover:bg-green-600"
            )}
          >
            {completedSets}/{totalSets}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-2 sm:px-6">
        {/* Table Header - hidden on very small screens */}
        <div className="hidden xs:grid grid-cols-[36px_1fr_1fr_44px_44px] sm:grid-cols-[40px_1fr_1fr_48px_48px] gap-1.5 sm:gap-2 mb-1 px-2 sm:px-3 text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
          <span className="text-center">#</span>
          <span className="text-center">Ciężar (kg)</span>
          <span className="text-center">Powtórzenia</span>
          <span className="text-center">
            <span className="sr-only">Timer</span>
            ⏱
          </span>
          <span className="text-center">
            <span className="sr-only">Wykonane</span>
            ✓
          </span>
        </div>

        {/* Sets */}
        <div className="space-y-1">
          {exercise.sets.map((set: SessionSet, setIdx: number) => (
            <SetRow
              key={setIdx}
              set={set}
              setIndex={setIdx}
              exerciseIndex={exerciseIndex}
              onUpdate={(field, value) => onUpdateSet(exerciseIndex, setIdx, field, value)}
              onStartRest={() => onStartRest(set.rest_seconds)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
