import type { SessionSummary } from "@/types";
import { HistorySessionCard } from "./HistorySessionCard";

export interface HistoryListProps {
  sessions: SessionSummary[];
}

/**
 * HistoryList renders a list of completed training session cards
 */
export function HistoryList({ sessions }: HistoryListProps) {
  return (
    <div className="flex flex-col gap-4">
      {sessions.map((session) => (
        <HistorySessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}
