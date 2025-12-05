import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

export interface CompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  completedSets: number;
  totalSets: number;
}

/**
 * CompletionDialog asks for confirmation before finishing the workout
 * Shows warning if there are incomplete sets
 */
export function CompletionDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  completedSets,
  totalSets,
}: CompletionDialogProps) {
  const incompleteSets = totalSets - completedSets;
  const hasIncompleteSets = incompleteSets > 0;
  const isFullyCompleted = completedSets === totalSets && totalSets > 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isFullyCompleted ? "Gratulacje! 🎉" : "Zakończyć trening?"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {isFullyCompleted ? (
                <p>Wykonałeś wszystkie zaplanowane serie! Świetna robota!</p>
              ) : (
                <>
                  <p>
                    Masz{" "}
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {incompleteSets} nieukończon{incompleteSets === 1 ? "ą" : "e"} seri
                      {incompleteSets === 1 ? "ę" : "i"}
                    </span>
                    .
                  </p>
                  <p>Czy na pewno chcesz zakończyć trening?</p>
                </>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                Twój postęp: {completedSets}/{totalSets} serii (
                {totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0}%)
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Wróć do treningu</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className={hasIncompleteSets ? "bg-orange-600 hover:bg-orange-700" : ""}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Zapisywanie...
              </>
            ) : (
              "Zakończ trening"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

