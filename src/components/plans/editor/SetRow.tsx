/**
 * SetRow component for editing a single set within an exercise
 *
 * Displays inputs for reps, weight, and rest time with validation
 * and a delete button for removing the set.
 */

import { useFormContext } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import type { PlanEditorFormValues } from "@/lib/schemas/plan-editor";

interface SetRowProps {
  dayIndex: number;
  exerciseIndex: number;
  setIndex: number;
  onRemove: () => void;
  canRemove: boolean;
}

export function SetRow({ dayIndex, exerciseIndex, setIndex, onRemove, canRemove }: SetRowProps) {
  const { control } = useFormContext<PlanEditorFormValues>();

  const fieldPrefix = `days.${dayIndex}.exercises.${exerciseIndex}.sets.${setIndex}` as const;

  return (
    <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2">
      <div className="flex flex-1 flex-wrap items-start gap-2">
        {/* Reps input */}
        <FormField
          control={control}
          name={`${fieldPrefix}.reps`}
          render={({ field }) => (
            <FormItem className="w-20">
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  placeholder="Powt."
                  aria-label="Liczba powtórzeń"
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber || "")}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Weight input */}
        <FormField
          control={control}
          name={`${fieldPrefix}.weight`}
          render={({ field }) => (
            <FormItem className="w-24">
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="Ciężar (kg)"
                  aria-label="Ciężar w kilogramach"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? null : parseFloat(value));
                  }}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Rest seconds input */}
        <FormField
          control={control}
          name={`${fieldPrefix}.rest_seconds`}
          render={({ field }) => (
            <FormItem className="w-24">
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  placeholder="Przerwa (s)"
                  aria-label="Czas przerwy w sekundach"
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>

      {/* Delete button */}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label="Usuń serię"
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

