import React, { useCallback, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TimeInput } from "@/components/attendance/TimeInput";
import { isValid24HourTime, normalizeToTime24 } from "@/lib/timeUtils";
import { validateNotFuture } from "@/lib/attendanceValidation";

interface EnhancedTimeInputProps {
  /** Canonical time in HH:mm (24h). Empty string allowed. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;

  label?: string;
  error?: string | null;
  warning?: string | null;
  disabled?: boolean;
  className?: string;
  placeholder?: string;

  /** For future time validation */
  date?: string;
  validateFuture?: boolean;

  /** Forwarded into TimeInput */
  showPicker?: boolean;
}

/**
 * Enhanced time input (text-based, no native <input type="time">):
 * - Uses the custom TimeInput to avoid browser arrow-key reset bugs
 * - Optional future time validation (only on blur)
 */
export const EnhancedTimeInput = React.forwardRef<HTMLInputElement, EnhancedTimeInputProps>(
  (
    {
      value,
      onChange,
      onBlur,
      label,
      error,
      warning,
      disabled = false,
      className,
      placeholder,
      date,
      validateFuture = false,
      showPicker = true,
    },
    ref
  ) => {
    const [localValue, setLocalValue] = useState<string>("");
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
      setLocalValue(normalizeToTime24(value) ?? "");
    }, [value]);

    const validateTime = useCallback(
      (time: string): string | null => {
        if (!time) return null;

        if (!isValid24HourTime(time)) {
          return "Invalid time format";
        }

        if (validateFuture && date) {
          const futureError = validateNotFuture(time, date);
          if (futureError) return futureError;
        }

        return null;
      },
      [date, validateFuture]
    );

    const handleChange = useCallback(
      (next24: string) => {
        // The TimeInput guarantees this is either '' or valid HH:mm.
        setLocalValue(next24);
        if (localError) setLocalError(null);
        onChange(next24);
      },
      [localError, onChange]
    );

    const handleBlur = useCallback(() => {
      const normalized = normalizeToTime24(localValue) ?? "";
      const validationError = validateTime(normalized);
      setLocalError(validationError);

      if (!validationError) {
        onChange(normalized);
      }

      onBlur?.();
    }, [localValue, onBlur, onChange, validateTime]);

    const displayError = error || localError;

    return (
      <div className={cn("space-y-1", className)}>
        {label && (
          <Label
            className={cn(
              displayError && "text-destructive",
              warning && !displayError && "text-warning"
            )}
          >
            {label}
          </Label>
        )}

        <TimeInput
          ref={ref}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          error={displayError}
          warning={warning}
          showPicker={showPicker}
          showErrorText={false}
        />

        {displayError && <p className="text-xs text-destructive">{displayError}</p>}
        {warning && !displayError && <p className="text-xs text-warning">{warning}</p>}
      </div>
    );
  }
);

EnhancedTimeInput.displayName = "EnhancedTimeInput";

export default EnhancedTimeInput;

