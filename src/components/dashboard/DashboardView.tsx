import type { DashboardResponse } from "@/types";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyDashboard } from "./EmptyDashboard";
import { WorkoutCard } from "./WorkoutCard";

export interface DashboardViewProps {
  initialData: DashboardResponse | null;
  error?: string;
}

/**
 * Formats the current date in Polish locale
 */
function formatCurrentDate(): string {
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

/**
 * DashboardHeader displays greeting and current date
 */
function DashboardHeader() {
  const formattedDate = formatCurrentDate();

  return (
    <header className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight">Witaj z powrotem!</h1>
      <p className="text-muted-foreground mt-1 capitalize">{formattedDate}</p>
    </header>
  );
}

/**
 * WorkoutList renders the grid of upcoming workout cards
 */
function WorkoutList({ workouts }: { workouts: DashboardResponse["upcoming_workouts"] }) {
  return (
    <section aria-labelledby="upcoming-workouts-heading">
      <h2 id="upcoming-workouts-heading" className="text-xl font-semibold mb-4">
        Nadchodzące treningi
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workouts.map((workout) => (
          <WorkoutCard key={`${workout.plan_id}-${workout.date}`} workout={workout} />
        ))}
      </div>
    </section>
  );
}

/**
 * ErrorAlert displays when data fetching fails
 */
function ErrorAlert({ message }: { message: string }) {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <Alert variant="destructive" className="max-w-lg mx-auto">
      <AlertTitle>Błąd ładowania</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{message}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={handleRetry}>
          Spróbuj ponownie
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * DashboardView is the main container component for the dashboard
 * Renders different content based on user_state: new, active, or completed
 */
export function DashboardView({ initialData, error }: DashboardViewProps) {
  // Handle error state
  if (error || !initialData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <DashboardHeader />
        <ErrorAlert message={error || "Nie udało się załadować pulpitu. Spróbuj odświeżyć stronę."} />
      </div>
    );
  }

  const { user_state, upcoming_workouts } = initialData;

  // Handle empty states (new user or completed cycle)
  if (user_state === "new" || user_state === "completed") {
    return (
      <div className="container mx-auto px-4 py-8">
        <DashboardHeader />
        <EmptyDashboard state={user_state} />
      </div>
    );
  }

  // Handle edge case: active state but empty workouts (data inconsistency)
  if (upcoming_workouts.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <DashboardHeader />
        <EmptyDashboard state="completed" />
      </div>
    );
  }

  // Active user with upcoming workouts
  return (
    <div className="container mx-auto px-4 py-8">
      <DashboardHeader />
      <WorkoutList workouts={upcoming_workouts} />
    </div>
  );
}
