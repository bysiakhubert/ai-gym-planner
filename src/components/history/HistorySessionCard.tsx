import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Clock, CheckCircle2, Calendar } from "lucide-react";
import type { SessionSummary } from "@/types";

export interface HistorySessionCardProps {
  session: SessionSummary;
}

/**
 * Formats an ISO date string to Polish locale format
 * e.g., "15 stycznia 2025"
 */
function formatSessionDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Formats duration in minutes to a user-friendly string
 * e.g., "45 min" or "1h 15 min"
 */
function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes} min`;
}

/**
 * HistorySessionCard displays a summary of a completed training session
 * Clicking the card navigates to the session details view
 */
export function HistorySessionCard({ session }: HistorySessionCardProps) {
  const { id, plan_name, day_name, date, duration_minutes, completed_sets, total_sets } = session;

  const formattedDate = formatSessionDate(date);
  const formattedDuration = formatDuration(duration_minutes);
  const completionRate = total_sets > 0 ? Math.round((completed_sets / total_sets) * 100) : 0;

  return (
    <a href={`/history/${id}`} className="block">
      <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-lg">{day_name}</CardTitle>
              <CardDescription className="mt-1">{plan_name}</CardDescription>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <time dateTime={date}>{formattedDate}</time>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>{formattedDuration}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>
                {completed_sets}/{total_sets} serii
                {completionRate === 100 && (
                  <span className="ml-1.5 text-green-600 dark:text-green-400 font-medium">✓</span>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
