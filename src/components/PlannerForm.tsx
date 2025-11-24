import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserPreferences } from "@/types";

// Validation schema
const userPreferencesSchema = z.object({
  goal: z.string().min(1, "Cel jest wymagany"),
  system: z.string().min(1, "System jest wymagany"),
  available_days: z.array(z.string()).min(1, "Wybierz przynajmniej jeden dzień"),
  session_duration_minutes: z.number().min(30, "Minimum 30 minut").max(180, "Maksimum 180 minut"),
  cycle_duration_weeks: z.number().min(1, "Minimum 1 tydzień").max(12, "Maksimum 12 tygodni"),
  notes: z.string().optional(),
});

interface PlannerFormProps {
  isSubmitting: boolean;
  onSubmit: (preferences: UserPreferences) => void;
}

const GOALS = [
  { value: "hypertrophy", label: "Hipertrofia (wzrost mięśni)" },
  { value: "strength", label: "Siła" },
  { value: "endurance", label: "Wytrzymałość" },
  { value: "weight_loss", label: "Redukcja" },
];

const SYSTEMS = [
  { value: "PPL", label: "PPL (Push/Pull/Legs)" },
  { value: "FBW", label: "FBW (Full Body Workout)" },
  { value: "Upper/Lower", label: "Upper/Lower" },
  { value: "Bro Split", label: "Bro Split" },
];

const DAYS = [
  { value: "monday", label: "Poniedziałek" },
  { value: "tuesday", label: "Wtorek" },
  { value: "wednesday", label: "Środa" },
  { value: "thursday", label: "Czwartek" },
  { value: "friday", label: "Piątek" },
  { value: "saturday", label: "Sobota" },
  { value: "sunday", label: "Niedziela" },
];

export function PlannerForm({ isSubmitting, onSubmit }: PlannerFormProps) {
  const form = useForm<UserPreferences>({
    resolver: zodResolver(userPreferencesSchema),
    defaultValues: {
      goal: "",
      system: "",
      available_days: [],
      session_duration_minutes: 60,
      cycle_duration_weeks: 4,
      notes: "",
    },
  });

  const handleSubmit = (data: UserPreferences) => {
    onSubmit(data);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-4 sm:p-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Generator Planu Treningowego AI</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Wypełnij formularz, aby wygenerować spersonalizowany plan treningowy
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Goal Selection */}
          <FormField
            control={form.control}
            name="goal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cel treningowy</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz cel" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GOALS.map((goal) => (
                      <SelectItem key={goal.value} value={goal.value}>
                        {goal.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Wybierz główny cel swojego treningu</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* System Selection */}
          <FormField
            control={form.control}
            name="system"
            render={({ field }) => (
              <FormItem>
                <FormLabel>System treningowy</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz system" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SYSTEMS.map((system) => (
                      <SelectItem key={system.value} value={system.value}>
                        {system.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Wybierz preferowany system treningowy</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Available Days */}
          <FormField
            control={form.control}
            name="available_days"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel>Dostępne dni</FormLabel>
                  <FormDescription>Zaznacz dni, w które możesz trenować</FormDescription>
                </div>
                <div className="space-y-2">
                  {DAYS.map((day) => (
                    <FormField
                      key={day.value}
                      control={form.control}
                      name="available_days"
                      render={({ field }) => {
                        return (
                          <FormItem key={day.value} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(day.value)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, day.value])
                                    : field.onChange(field.value?.filter((value) => value !== day.value));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{day.label}</FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Session Duration */}
          <FormField
            control={form.control}
            name="session_duration_minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Czas trwania sesji: {field.value} minut</FormLabel>
                <FormControl>
                  <Slider
                    min={30}
                    max={180}
                    step={15}
                    value={[field.value]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                  />
                </FormControl>
                <FormDescription>Ile czasu możesz poświęcić na jeden trening?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Cycle Duration */}
          <FormField
            control={form.control}
            name="cycle_duration_weeks"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Długość cyklu: {field.value}{" "}
                  {field.value === 1 ? "tydzień" : field.value < 5 ? "tygodnie" : "tygodni"}
                </FormLabel>
                <FormControl>
                  <Slider
                    min={1}
                    max={12}
                    step={1}
                    value={[field.value]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                  />
                </FormControl>
                <FormDescription>Na ile tygodni chcesz zaplanować trening?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dodatkowe uwagi (opcjonalne)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Np. kontuzje, preferowane ćwiczenia, dostępny sprzęt..."
                    className="min-h-[100px] resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Dodaj informacje, które pomogą AI dostosować plan do Twoich potrzeb</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Generowanie planu..." : "Generuj plan"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
