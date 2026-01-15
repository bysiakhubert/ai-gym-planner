import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SessionFooterProps {
  completedSets: number;
  totalSets: number;
  onFinish: () => void;
  onCancel: () => void;
  hasTimerActive: boolean;
}

/**
 * SessionFooter displays the bottom navigation bar with completion actions
 * Shows progress and action buttons for finishing or canceling the workout
 * Optimized for mobile with larger touch targets
 */
export function SessionFooter({ completedSets, totalSets, onFinish, onCancel, hasTimerActive }: SessionFooterProps) {
  const progressPercent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const isFullyCompleted = completedSets === totalSets && totalSets > 0;

  return (
    <footer
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-t z-30 safe-area-inset-bottom",
        hasTimerActive && "bottom-24 sm:bottom-20"
      )}
    >
      <div className="container mx-auto px-4 py-3 sm:py-4">
        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs sm:text-sm text-muted-foreground mb-1.5">
            <span className="font-medium">Postęp treningu</span>
            <span className="tabular-nums font-semibold">
              {completedSets}/{totalSets} serii ({progressPercent}%)
            </span>
          </div>
          <div className="h-2.5 sm:h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-500 ease-out rounded-full",
                isFullyCompleted ? "bg-green-500" : "bg-primary"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="lg"
            className="flex-1 h-12 sm:h-11 text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation"
            onClick={onCancel}
          >
            <XCircle className="h-5 w-5 mr-2" />
            Anuluj
          </Button>
          <Button
            variant={isFullyCompleted ? "default" : "secondary"}
            size="lg"
            className={cn(
              "flex-1 h-12 sm:h-11 touch-manipulation font-semibold",
              isFullyCompleted && "bg-green-600 hover:bg-green-700"
            )}
            onClick={onFinish}
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Zakończ trening
          </Button>
        </div>
      </div>
    </footer>
  );
}
