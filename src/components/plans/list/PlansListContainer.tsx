/**
 * PlansListContainer - Main container for the plans list view
 *
 * Manages the display of training plans with pagination,
 * status filtering, and archive functionality.
 */

import { useState } from "react";
import { toast } from "sonner";
import { usePlansList } from "@/hooks/usePlansList";
import { PageHeader } from "./PageHeader";
import { PlansGrid } from "./PlansGrid";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import { ArchiveConfirmationDialog } from "./ArchiveConfirmationDialog";
import { ContinuePlanDialog } from "@/components/plans/details/ContinuePlanDialog";
import { Button } from "@/components/ui/button";
import type { PlanSummary } from "@/types";

export function PlansListContainer() {
  const {
    plans,
    pagination,
    isLoading,
    isLoadingMore,
    error,
    planToArchive,
    isArchiving,
    loadMore,
    openArchiveDialog,
    closeArchiveDialog,
    confirmArchive,
    retry,
    refresh,
  } = usePlansList();

  // State for continue plan dialog
  const [planToContinue, setPlanToContinue] = useState<PlanSummary | null>(null);

  const handleOpenContinueDialog = (plan: PlanSummary) => {
    setPlanToContinue(plan);
  };

  const handleCloseContinueDialog = () => {
    setPlanToContinue(null);
  };

  const handleContinueSuccess = () => {
    toast.success("Plan został skopiowany i dodany do listy!");
    setPlanToContinue(null);
    refresh();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader />
        <LoadingState />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader />
        <ErrorState message={error.message} onRetry={retry} />
      </div>
    );
  }

  // Empty state
  if (plans.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageHeader />
        <EmptyState />
      </div>
    );
  }

  // Plans list
  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader />

      <PlansGrid plans={plans} onArchive={openArchiveDialog} onContinue={handleOpenContinueDialog} />

      {/* Load more button */}
      {pagination?.has_more && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" size="lg" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Ładowanie..." : "Załaduj więcej"}
          </Button>
        </div>
      )}

      {/* Continue plan dialog */}
      {planToContinue && (
        <ContinuePlanDialog
          planId={planToContinue.id}
          currentPlanName={planToContinue.name}
          currentPlanEndDate={planToContinue.effective_to}
          open={planToContinue !== null}
          onOpenChange={(open) => {
            if (!open) handleCloseContinueDialog();
          }}
          onSuccess={handleContinueSuccess}
        />
      )}

      {/* Archive confirmation dialog */}
      <ArchiveConfirmationDialog
        open={planToArchive !== null}
        planName={planToArchive?.name ?? ""}
        onConfirm={confirmArchive}
        onCancel={closeArchiveDialog}
        isSubmitting={isArchiving}
      />
    </div>
  );
}
