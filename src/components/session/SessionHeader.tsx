import { Cloud, CloudOff, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SessionHeaderProps {
  planName: string;
  dayName: string;
  date: string;
  isSaving: boolean;
  lastSavedAt: Date | null;
}

/**
 * Formats a date string to Polish locale
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

/**
 * Formats relative time for last saved
 */
function formatLastSaved(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) {
    return "przed chwilą";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} min temu`;
  }

  return date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

/**
 * SessionHeader displays information about the current workout session
 * Shows plan name, day name, date, and save status
 * Optimized for mobile with appropriate spacing and touch targets
 */
export function SessionHeader({ planName, dayName, date, isSaving, lastSavedAt }: SessionHeaderProps) {
  const handleBack = () => {
    // Navigate back - will trigger beforeunload warning if dirty
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-b safe-area-inset-top">
      <div className="container mx-auto px-3 sm:px-4 py-3">
        <div className="flex items-start gap-2 sm:gap-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 -ml-2 touch-manipulation"
            onClick={handleBack}
            aria-label="Wróć do pulpitu"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* Session Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold truncate leading-tight">{planName}</h1>
            <p className="text-sm text-muted-foreground truncate">{dayName}</p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{formatDate(date)}</p>
          </div>

          {/* Save Status */}
          <div className="flex items-center gap-1.5 text-muted-foreground shrink-0 pt-0.5">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs hidden sm:inline">Zapisywanie...</span>
              </>
            ) : lastSavedAt ? (
              <>
                <Cloud className="h-4 w-4 text-green-500" />
                <span className="text-xs hidden sm:inline">{formatLastSaved(lastSavedAt)}</span>
              </>
            ) : (
              <>
                <CloudOff className="h-4 w-4 text-orange-500" />
                <span className="text-xs hidden sm:inline">Niezapisane</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
