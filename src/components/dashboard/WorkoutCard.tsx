import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { UpcomingWorkout } from "@/types";

export interface WorkoutCardProps {
  workout: UpcomingWorkout;
}

/**
 * Formats an ISO date string to a localized, user-friendly format
 * e.g., "Dziś", "Jutro", "Piątek, 28 listopada"
 */
function formatWorkoutDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) {
    return "Dziś";
  }

  if (dateOnly.getTime() === tomorrow.getTime()) {
    return "Jutro";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

/**
 * WorkoutCard displays a single upcoming workout
 * Highlights the next workout with a distinctive border
 */
export function WorkoutCard({ workout }: WorkoutCardProps) {
  const { plan_name, day_name, date, is_next, plan_id } = workout;
  const formattedDate = formatWorkoutDate(date);

  // Build URL for starting the workout session
  const startWorkoutUrl = `/sessions/new?planId=${plan_id}&date=${date}`;

  return (
    <Card
      className={
        is_next
          ? "border-primary bg-primary/5 shadow-md"
          : "border-muted hover:border-muted-foreground/30 transition-colors"
      }
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg">{day_name}</CardTitle>
            <CardDescription className="mt-1">{plan_name}</CardDescription>
          </div>
          {is_next && (
            <span className="bg-primary text-primary-foreground text-xs font-medium px-2.5 py-1 rounded-full">
              Następny
            </span>
          )}
        </div>
      </CardHeader>
      <CardFooter className="flex items-center justify-between gap-4">
        <time dateTime={date} className="text-sm text-muted-foreground">
          {formattedDate}
        </time>
        <Button variant={is_next ? "default" : "outline"} size="sm" asChild>
          <a href={startWorkoutUrl}>Rozpocznij trening</a>
        </Button>
      </CardFooter>
    </Card>
  );
}
