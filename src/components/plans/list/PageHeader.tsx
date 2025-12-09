/**
 * PageHeader - Header section for the plans list page
 *
 * Displays the page title and a button to create a new plan.
 */

import { NewPlanButton } from "@/components/NewPlanButton";

export function PageHeader() {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Moje plany</h1>
        <p className="text-muted-foreground mt-1">Zarządzaj swoimi cyklami treningowymi</p>
      </div>

      <NewPlanButton variant="button" />
    </header>
  );
}
