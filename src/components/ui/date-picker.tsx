import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DatePickerProps {
  /** Selected date value */
  value?: Date;
  /** Callback when date changes */
  onChange: (date: Date | undefined) => void;
  /** Placeholder text when no date selected */
  placeholder?: string;
  /** Disable the date picker */
  disabled?: boolean;
  /** Additional className for the trigger button */
  className?: string;
  /** Disable dates before this date */
  fromDate?: Date;
  /** Disable dates after this date */
  toDate?: Date;
  /** Date format for display (date-fns format) */
  dateFormat?: string;
  /** Error state */
  error?: boolean;
  /** Helper text shown below the input */
  helperText?: string;
}

/**
 * DatePicker - Global Shadcn-styled date picker
 * 
 * A beautiful, accessible date picker using Popover + Calendar pattern.
 * Use this component for all date selection needs across the app.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  className,
  fromDate,
  toDate,
  dateFormat = "PPP",
  error = false,
  helperText,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (date: Date | undefined) => {
    onChange(date);
    setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, dateFormat) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleSelect}
            fromDate={fromDate}
            toDate={toDate}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      {helperText && (
        <p className={cn(
          "text-xs",
          error ? "text-destructive" : "text-muted-foreground"
        )}>
          {helperText}
        </p>
      )}
    </div>
  );
}
