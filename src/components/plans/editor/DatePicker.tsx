/**
 * DatePicker component for selecting dates in forms
 *
 * Wrapper around Calendar and Popover components with proper
 * form integration and formatting.
 *
 * Uses controlled Popover state to fix Chrome browser issue where
 * the popover would close before date selection was processed.
 */

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // ISO date string (YYYY-MM-DD)
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = "Wybierz datę", disabled, className }: DatePickerProps) {
  // Control popover state to ensure proper date selection in Chrome
  const [open, setOpen] = useState(false);

  // Parse the ISO string to Date object for the calendar
  const selectedDate = value ? parseISO(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Format back to ISO date string
      const isoDate = format(date, "yyyy-MM-dd");
      onChange(isoDate);
      // Close popover after selection
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground", className)}
        >
          <CalendarIcon className="mr-2 size-4" />
          {selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: pl }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={selectedDate} onSelect={handleSelect} locale={pl} initialFocus />
      </PopoverContent>
    </Popover>
  );
}
