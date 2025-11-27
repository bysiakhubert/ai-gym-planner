/**
 * PlansGrid - Grid layout component for displaying plan cards
 *
 * Renders a responsive grid of PlanCard components.
 */

import type { PlanSummary } from "@/types";
import type { PlanStatus } from "@/hooks/usePlansList";
import { PlanCard } from "./PlanCard";

interface PlansGridProps {
  plans: (PlanSummary & { status: PlanStatus })[];
  onArchive: (plan: PlanSummary) => void;
}

export function PlansGrid({ plans, onArchive }: PlansGridProps) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="list"
      aria-label="Lista planów treningowych"
    >
      {plans.map((plan) => (
        <div key={plan.id} role="listitem">
          <PlanCard plan={plan} onArchive={onArchive} />
        </div>
      ))}
    </div>
  );
}

