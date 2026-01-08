/**
 * ExerciseCard component for editing an exercise within a training day
 *
 * Contains the exercise name input, list of sets managed via useFieldArray,
 * and controls for adding/removing sets.
 */

import { useFormContext, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormControl, FormMessage, FormLabel } from "@/components/ui/form";
import { SetRow } from "./SetRow";
import { defaultSetValues, type PlanEditorFormValues } from "@/lib/schemas/plan-editor";

interface ExerciseCardProps {
  dayIndex: number;
  exerciseIndex: number;
  onRemove: () => void;
  canRemove: boolean;
}

export function ExerciseCard({ dayIndex, exerciseIndex, onRemove, canRemove }: ExerciseCardProps) {
  const { control } = useFormContext<PlanEditorFormValues>();

  const fieldPrefix = `days.${dayIndex}.exercises.${exerciseIndex}` as const;

  const {
    fields: setFields,
    append: appendSet,
    remove: removeSet,
  } = useFieldArray({
    control,
    name: `${fieldPrefix}.sets`,
  });

  const handleAddSet = () => {
    appendSet({ ...defaultSetValues });
  };

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm" data-testid="exercise-row">
      {/* Exercise header */}
      <div className="mb-3 flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Dumbbell className="size-5" />
        </div>

        <div className="flex flex-1 flex-col gap-1">
          <FormField
            control={control}
            name={`${fieldPrefix}.name`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">Nazwa ćwiczenia</FormLabel>
                <FormControl>
                  <Input placeholder="Nazwa ćwiczenia (np. Wyciskanie sztangi)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Delete exercise button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="Usuń ćwiczenie"
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {/* Sets section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Serie</span>
          <Button type="button" variant="ghost" size="sm" onClick={handleAddSet} className="h-7 gap-1 text-xs">
            <Plus className="size-3" />
            Dodaj serię
          </Button>
        </div>

        {/* Sets list */}
        <div className="space-y-2">
          {setFields.map((setField, setIndex) => (
            <SetRow
              key={setField.id}
              dayIndex={dayIndex}
              exerciseIndex={exerciseIndex}
              setIndex={setIndex}
              onRemove={() => removeSet(setIndex)}
              canRemove={setFields.length > 1}
            />
          ))}
        </div>

        {/* Sets header labels */}
        {setFields.length > 0 && (
          <div className="flex gap-2 px-2 text-xs text-muted-foreground">
            <span className="w-20">Powtórzenia</span>
            <span className="w-24">Ciężar (kg)</span>
            <span className="w-24">Przerwa (s)</span>
          </div>
        )}
      </div>
    </div>
  );
}
