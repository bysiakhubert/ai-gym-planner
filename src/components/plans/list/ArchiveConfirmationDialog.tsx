/**
 * ArchiveConfirmationDialog - Modal for confirming plan archival
 *
 * Uses AlertDialog from Shadcn UI to confirm destructive action.
 */

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

interface ArchiveConfirmationDialogProps {
  open: boolean;
  planName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ArchiveConfirmationDialog({
  open,
  planName,
  onConfirm,
  onCancel,
  isSubmitting,
}: ArchiveConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archiwizuj plan</AlertDialogTitle>
          <AlertDialogDescription>
            Czy na pewno chcesz zarchiwizować plan{" "}
            <span className="font-medium text-foreground">&ldquo;{planName}&rdquo;</span>?
            <br />
            <br />
            Zarchiwizowane plany nie będą widoczne na liście, ale zachowasz do nich dostęp w archiwum.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isSubmitting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Archiwizowanie...
              </>
            ) : (
              "Archiwizuj"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
