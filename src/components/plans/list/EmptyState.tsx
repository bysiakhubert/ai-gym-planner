/**
 * EmptyState - Empty state component for plans list
 *
 * Displays when user has no training plans, with a CTA to create one.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, Plus } from "lucide-react";

export function EmptyState() {
  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="flex flex-col items-center text-center py-12">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Dumbbell className="size-8 text-primary" />
        </div>

        <h2 className="text-xl font-semibold mb-2">Brak planów treningowych</h2>

        <p className="text-muted-foreground mb-6">
          Nie masz jeszcze żadnych planów treningowych. Stwórz swój pierwszy plan, aby rozpocząć treningi!
        </p>

        <Button asChild size="lg">
          <a href="/generate">
            <Plus className="size-5 mr-2" />
            Stwórz pierwszy plan
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
