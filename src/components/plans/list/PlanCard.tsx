/**
 * PlanCard - Card component displaying a single training plan summary
 *
 * Shows plan name, dates, status badge, source indicator,
 * and provides actions via dropdown menu.
 */

import type { PlanSummary } from "@/types";
import type { PlanStatus } from "@/hooks/usePlansList";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Archive, Sparkles, User, Calendar, Copy } from "lucide-react";

interface PlanCardProps {
  plan: PlanSummary & { status: PlanStatus };
  onArchive: (plan: PlanSummary) => void;
  onContinue: (plan: PlanSummary) => void;
}

/**
 * Status configuration for badge styling
 */
const statusConfig: Record<PlanStatus, { label: string; className: string }> = {
  active: {
    label: "Aktywny",
    className: "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400",
  },
  upcoming: {
    label: "Nadchodzący",
    className: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400",
  },
  completed: {
    label: "Zakończony",
    className: "bg-neutral-500/15 text-neutral-600 border-neutral-500/30 dark:text-neutral-400",
  },
};

/**
 * Formats a date string to Polish locale format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Source icon component
 */
function SourceIcon({ source }: { source: string }) {
  if (source === "ai") {
    return (
      <span
        className="text-violet-500 dark:text-violet-400"
        title="Wygenerowany przez AI"
        aria-label="Plan wygenerowany przez AI"
      >
        <Sparkles className="size-4" />
      </span>
    );
  }

  return (
    <span className="text-muted-foreground" title="Stworzony ręcznie" aria-label="Plan stworzony ręcznie">
      <User className="size-4" />
    </span>
  );
}

export function PlanCard({ plan, onArchive, onContinue }: PlanCardProps) {
  const { label: statusLabel, className: statusClassName } = statusConfig[plan.status];

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on dropdown or its content
    const target = e.target as HTMLElement;
    if (target.closest('[data-slot="dropdown-menu"]') || target.closest("button")) {
      return;
    }
    window.location.href = `/plans/${plan.id}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      window.location.href = `/plans/${plan.id}`;
    }
  };

  const handleContinue = (e: React.MouseEvent) => {
    e.stopPropagation();
    onContinue(plan);
  };

  return (
    <Card
      className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="link"
      aria-label={`Plan treningowy: ${plan.name}`}
    >
      <CardHeader>
        <div className="flex items-start gap-2">
          <SourceIcon source={plan.source} />
          <CardTitle className="text-base leading-tight line-clamp-2 flex-1">{plan.name}</CardTitle>
        </div>

        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                aria-label="Menu akcji planu"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleContinue}>
                <Copy className="size-4" />
                Kontynuuj
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={`/plans/${plan.id}/edit`} className="cursor-pointer">
                  <Pencil className="size-4" />
                  Edytuj
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(plan);
                }}
              >
                <Archive className="size-4" />
                Archiwizuj
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="size-4 shrink-0" />
          <span>
            {formatDate(plan.effective_from)} – {formatDate(plan.effective_to)}
          </span>
        </div>

        <Badge className={statusClassName}>{statusLabel}</Badge>
      </CardContent>
    </Card>
  );
}
