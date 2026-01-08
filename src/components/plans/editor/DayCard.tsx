/**
 * DayCard component for editing a single training day
 *
 * Contains the day name input, date picker, list of exercises
 * managed via useFieldArray, and controls for adding/removing.
 */

import { useFormContext, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { ExerciseCard } from "./ExerciseCard";
import { DatePicker } from "./DatePicker";
import { defaultExerciseValues, defaultSetValues, type PlanEditorFormValues } from "@/lib/schemas/plan-editor";

interface DayCardProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}

export function DayCard({ index, onRemove, canRemove }: DayCardProps) {
  const { control, watch } = useFormContext<PlanEditorFormValues>();

  const fieldPrefix = `days.${index}` as const;

  const {
    fields: exerciseFields,
    append: appendExercise,
    remove: removeExercise,
  } = useFieldArray({
    control,
    name: `${fieldPrefix}.exercises`,
  });

  // Watch day name for the card title
  const dayName = watch(`${fieldPrefix}.name`);
  const dayDate = watch(`${fieldPrefix}.date`);

  const handleAddExercise = () => {
    appendExercise({
      ...defaultExerciseValues,
      sets: [{ ...defaultSetValues }],
    });
  };

  return (
    <Card className="relative" data-testid="day-card">
      <CardHeader className="border-b pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Day info */}
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Calendar className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{dayName || `Dzień ${index + 1}`}</CardTitle>
              <p className="text-sm text-muted-foreground">{dayDate || "Brak daty"}</p>
            </div>
          </div>

          {/* Day form fields */}
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            {/* Day name input */}
            <FormField
              control={control}
              name={`${fieldPrefix}.name`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-xs">Nazwa dnia</FormLabel>
                  <FormControl>
                    <Input placeholder="np. Push A, Nogi, Upper Body" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date picker */}
            <FormField
              control={control}
              name={`${fieldPrefix}.date`}
              render={({ field }) => (
                <FormItem className="w-full sm:w-48">
                  <FormLabel className="text-xs">Data treningu</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value} onChange={field.onChange} placeholder="Wybierz datę" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Delete day button */}
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            disabled={!canRemove}
            aria-label="Usuń dzień treningowy"
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Exercises section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Ćwiczenia ({exerciseFields.length})</h4>
            <Button type="button" variant="outline" size="sm" onClick={handleAddExercise} className="gap-1">
              <Plus className="size-4" />
              Dodaj ćwiczenie
            </Button>
          </div>

          {/* Exercises list */}
          <div className="space-y-4">
            {exerciseFields.map((exerciseField, exerciseIndex) => (
              <ExerciseCard
                key={exerciseField.id}
                dayIndex={index}
                exerciseIndex={exerciseIndex}
                onRemove={() => removeExercise(exerciseIndex)}
                canRemove={exerciseFields.length > 1}
              />
            ))}
          </div>

          {exerciseFields.length === 0 && (
            <div className="rounded-lg border-2 border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">Brak ćwiczeń. Dodaj pierwsze ćwiczenie do tego dnia.</p>
              <Button type="button" variant="outline" size="sm" onClick={handleAddExercise} className="mt-4 gap-1">
                <Plus className="size-4" />
                Dodaj ćwiczenie
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
