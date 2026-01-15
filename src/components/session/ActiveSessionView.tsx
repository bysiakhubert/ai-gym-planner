import { useState } from "react";
import type { SessionResponse, SessionExercise } from "@/types";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SessionHeader } from "./SessionHeader";
import { ExerciseCard } from "./ExerciseCard";
import { SessionFooter } from "./SessionFooter";
import { WorkoutTimer } from "./WorkoutTimer";
import { CompletionDialog } from "./CompletionDialog";
import { useActiveSession } from "@/hooks/useActiveSession";
import { useWorkoutTimer } from "@/hooks/useWorkoutTimer";

export interface ActiveSessionViewProps {
  initialSession: SessionResponse | null;
  error?: string;
}

/**
 * ErrorAlert displays when data fetching fails
 */
function ErrorAlert({ message }: { message: string }) {
  const handleGoBack = () => {
    window.location.href = "/";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Alert variant="destructive" className="max-w-lg mx-auto">
        <AlertTitle>Błąd ładowania sesji</AlertTitle>
        <AlertDescription className="mt-2">
          <p>{message}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={handleGoBack}>
            Wróć do pulpitu
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * ActiveSessionView is the main container for the active workout session
 * Uses useActiveSession and useWorkoutTimer hooks for state management
 */
export function ActiveSessionView({ initialSession, error }: ActiveSessionViewProps) {
  // Session state from custom hook
  const { sessionData, isSaving, lastSavedAt, isCompleting, stats, updateSet, handleComplete, handleCancel } =
    useActiveSession(initialSession);

  // Timer state from custom hook
  const { timerState, startTimer, pauseTimer, resumeTimer, addTime, skipTimer } = useWorkoutTimer();

  // Completion dialog state
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);

  // Handle error state
  if (error || !sessionData) {
    return <ErrorAlert message={error || "Nie udało się załadować sesji treningowej."} />;
  }

  const handleFinishClick = () => {
    setIsCompletionDialogOpen(true);
  };

  const handleConfirmComplete = async () => {
    await handleComplete();
    setIsCompletionDialogOpen(false);
  };

  // Dynamic bottom padding based on timer state
  const bottomPadding = timerState.isActive ? "pb-56 sm:pb-48" : "pb-36 sm:pb-32";

  return (
    <div className={`min-h-screen flex flex-col bg-background ${bottomPadding}`}>
      {/* Session Header */}
      <SessionHeader
        planName={sessionData.plan_name}
        dayName={sessionData.day_name}
        date={sessionData.date}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
      />

      {/* Exercise List */}
      <div data-testid="exercises-list" className="flex-1 container mx-auto px-3 sm:px-4 py-4 space-y-3 sm:space-y-4">
        {sessionData.exercises.map((exercise: SessionExercise, exerciseIdx: number) => (
          <ExerciseCard
            key={`${exercise.name}-${exerciseIdx}`}
            exercise={exercise}
            exerciseIndex={exerciseIdx}
            onUpdateSet={updateSet}
            onStartRest={startTimer}
          />
        ))}
      </div>

      {/* Workout Timer */}
      <WorkoutTimer
        isActive={timerState.isActive}
        timeLeft={timerState.timeLeft}
        initialTime={timerState.initialTime}
        isRunning={timerState.isRunning}
        onPause={pauseTimer}
        onResume={resumeTimer}
        onAddTime={addTime}
        onSkip={skipTimer}
      />

      {/* Session Footer */}
      <SessionFooter
        completedSets={stats.completed}
        totalSets={stats.total}
        onFinish={handleFinishClick}
        onCancel={handleCancel}
        hasTimerActive={timerState.isActive}
      />

      {/* Completion Dialog */}
      <CompletionDialog
        isOpen={isCompletionDialogOpen}
        onClose={() => setIsCompletionDialogOpen(false)}
        onConfirm={handleConfirmComplete}
        isLoading={isCompleting}
        completedSets={stats.completed}
        totalSets={stats.total}
      />
    </div>
  );
}
