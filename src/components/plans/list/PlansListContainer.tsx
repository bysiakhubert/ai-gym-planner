/**
 * PlansListContainer - Main container for the plans list view
 *
 * Manages the display of training plans with pagination,
 * status filtering, and archive functionality.
 */

import { usePlansList } from "@/hooks/usePlansList";
import { PageHeader } from "./PageHeader";
import { PlansGrid } from "./PlansGrid";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import { ArchiveConfirmationDialog } from "./ArchiveConfirmationDialog";
import { Button } from "@/components/ui/button";

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
  } = usePlansList();

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

      <PlansGrid plans={plans} onArchive={openArchiveDialog} />

      {/* Load more button */}
      {pagination?.has_more && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Ładowanie..." : "Załaduj więcej"}
          </Button>
        </div>
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

