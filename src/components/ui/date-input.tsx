import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Calendar } from "lucide-react";

export interface DateInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value" | "type"> {
  /** Date string value (YYYY-MM-DD format) */
  value: string;
  /** String onChange - returns YYYY-MM-DD format */
  onChange: (value: string) => void;
  /** Error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Min date (YYYY-MM-DD) */
  minDate?: string;
  /** Max date (YYYY-MM-DD) */
  maxDate?: string;
}

/**
 * DateInput - Global cursor-safe date input
 *
 * Rules enforced:
 * - Uses native date picker for consistency
 * - Value stored as string (YYYY-MM-DD)
 * - No formatting during interaction
 * - Focus remains stable
 */
const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      className,
      value,
      onChange,
      error,
      errorMessage,
      minDate,
      maxDate,
      ...props
    },
    ref,
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    const inputElement = (
      <div className="relative">
        <Input
          ref={ref}
          type="date"
          autoComplete="off"
          data-form-type="other"
          data-lpignore="true"
          className={cn(
            "pr-10",
            error && "border-destructive focus-visible:ring-destructive",
            className,
          )}
          value={value}
          onChange={handleChange}
          min={minDate}
          max={maxDate}
          {...props}
        />
        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>
    );

    if (error && errorMessage) {
      return (
        <div className="space-y-1">
          {inputElement}
          <p className="text-xs text-destructive">{errorMessage}</p>
        </div>
      );
    }

    return inputElement;
  },
);

DateInput.displayName = "DateInput";

export { DateInput };

// Utility helpers
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseDateFromInput(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}
