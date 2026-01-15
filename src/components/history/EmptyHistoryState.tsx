import { Button } from "@/components/ui/button";
import { History } from "lucide-react";

/**
 * EmptyHistoryState displays when user has no completed training sessions
 */
export function EmptyHistoryState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="rounded-full bg-muted p-4 mb-6">
        <History className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-3">Brak historii treningów</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Nie masz jeszcze żadnych zakończonych treningów. Rozpocznij swój pierwszy trening, aby zobaczyć tutaj swoją
        historię.
      </p>
      <Button size="lg" asChild>
        <a href="/">Przejdź do dashboardu</a>
      </Button>
    </div>
  );
}
