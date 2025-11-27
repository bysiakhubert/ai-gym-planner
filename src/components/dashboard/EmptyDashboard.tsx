import { Button } from "@/components/ui/button";

export interface EmptyDashboardProps {
  state: "new" | "completed";
}

/**
 * EmptyDashboard displays when user has no active workouts
 * Handles two variants: new user or completed cycle
 */
export function EmptyDashboard({ state }: EmptyDashboardProps) {
  const content = {
    new: {
      icon: "🏋️",
      title: "Witaj w GymPlanner!",
      description:
        "Rozpocznij swoją przygodę z treningiem. Wygeneruj spersonalizowany plan treningowy przy pomocy AI lub stwórz własny plan manualnie.",
    },
    completed: {
      icon: "🎉",
      title: "Gratulacje!",
      description:
        "Ukończyłeś wszystkie zaplanowane treningi w tym cyklu. Czas na nowy plan - kontynuuj progresję z AI lub stwórz nowy plan samodzielnie.",
    },
  };

  const { icon, title, description } = content[state];

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="text-6xl mb-6" role="img" aria-hidden="true">
        {icon}
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-3">{title}</h2>
      <p className="text-muted-foreground max-w-md mb-8">{description}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="lg" asChild>
          <a href="/generate">Wygeneruj plan z AI</a>
        </Button>
        <Button variant="outline" size="lg" asChild>
          <a href="/plans/create">Stwórz plan manualnie</a>
        </Button>
      </div>
    </div>
  );
}

