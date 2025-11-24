import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell } from "lucide-react";
import type { WorkoutDay } from "@/types";

interface WorkoutDayCardProps {
  date: string;
  workout: WorkoutDay;
}

export function WorkoutDayCard({ date, workout }: WorkoutDayCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pl-PL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const formatRestTime = (seconds: number) => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    return `${seconds}s`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <CardTitle className="text-lg">{workout.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              <time dateTime={date}>{formatDate(date)}</time>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {workout.exercises.length > 0 ? (
          <div className="space-y-4" role="list" aria-label="Lista ćwiczeń">
            {workout.exercises.map((exercise, exerciseIndex) => (
              <div key={exerciseIndex} className="border-l-2 border-primary/20 pl-4" role="listitem">
                <h4 className="font-semibold mb-2">{exercise.name}</h4>
                <div className="space-y-1" role="list" aria-label={`Serie ćwiczenia ${exercise.name}`}>
                  {exercise.sets.map((set, setIndex) => (
                    <div
                      key={setIndex}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"
                      role="listitem"
                    >
                      <span className="font-medium text-foreground min-w-[4rem]">Seria {setIndex + 1}:</span>
                      <span>{set.reps} powtórzeń</span>
                      {set.weight && <span>• {set.weight} kg</span>}
                      <span>• Przerwa: {formatRestTime(set.rest_seconds)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Brak ćwiczeń na ten dzień</p>
        )}
      </CardContent>
    </Card>
  );
}
