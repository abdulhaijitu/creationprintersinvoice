import * as React from "react";
import { format, parse, isValid, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Input } from "./input";

export interface DateInputProps {
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
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional className */
  className?: string;
  /** ID */
  id?: string;
}

/**
 * DateInput - Custom date input with consistent dd/MM/yyyy format
 *
 * - Display always shows dd/MM/yyyy
 * - Internal value is YYYY-MM-DD (DB compatible)
 * - Calendar popover for easy selection
 * - Manual typing support
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
      placeholder = "dd/mm/yyyy",
      disabled,
      id,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Merge refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // Sync display value from prop
    React.useEffect(() => {
      if (value) {
        const date = parseISO(value);
        if (isValid(date)) {
          setInputValue(format(date, "dd/MM/yyyy"));
        } else {
          setInputValue(value);
        }
      } else {
        setInputValue("");
      }
    }, [value]);

    // Handle manual text input
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setInputValue(raw);

      // Auto-add slashes
      const digits = raw.replace(/\D/g, "");
      if (digits.length === 8) {
        const formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
        setInputValue(formatted);
        const parsed = parse(formatted, "dd/MM/yyyy", new Date());
        if (isValid(parsed)) {
          onChange(format(parsed, "yyyy-MM-dd"));
        }
        return;
      }

      // Try parsing the input as dd/MM/yyyy
      if (raw.length === 10) {
        const parsed = parse(raw, "dd/MM/yyyy", new Date());
        if (isValid(parsed)) {
          onChange(format(parsed, "yyyy-MM-dd"));
        }
      }
    };

    const handleBlur = () => {
      // On blur, try to parse whatever was typed
      if (inputValue) {
        const parsed = parse(inputValue, "dd/MM/yyyy", new Date());
        if (isValid(parsed)) {
          onChange(format(parsed, "yyyy-MM-dd"));
          setInputValue(format(parsed, "dd/MM/yyyy"));
        } else {
          // Reset to current value
          if (value) {
            const date = parseISO(value);
            if (isValid(date)) {
              setInputValue(format(date, "dd/MM/yyyy"));
            }
          } else {
            setInputValue("");
          }
        }
      } else {
        onChange("");
      }
    };

    // Calendar selection
    const handleCalendarSelect = (date: Date | undefined) => {
      if (date) {
        onChange(format(date, "yyyy-MM-dd"));
        setInputValue(format(date, "dd/MM/yyyy"));
      }
      setOpen(false);
    };

    // Convert value to Date for calendar
    const selectedDate = value ? parseISO(value) : undefined;
    const calendarSelected = selectedDate && isValid(selectedDate) ? selectedDate : undefined;

    // Convert min/max to Date
    const minDateObj = minDate ? parseISO(minDate) : undefined;
    const maxDateObj = maxDate ? parseISO(maxDate) : undefined;
    const disabledDays = (date: Date) => {
      if (minDateObj && date < minDateObj) return true;
      if (maxDateObj && date > maxDateObj) return true;
      return false;
    };

    const inputElement = (
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          data-form-type="other"
          data-lpignore="true"
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pr-10",
            error && "border-destructive focus-visible:ring-destructive",
            className,
          )}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          maxLength={10}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
              className="absolute right-0 top-0 h-full w-10 rounded-l-none hover:bg-transparent"
              onClick={() => setOpen(true)}
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={calendarSelected}
              defaultMonth={calendarSelected}
              onSelect={handleCalendarSelect}
              disabled={disabledDays}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
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
  return format(date, "yyyy-MM-dd");
}

export function parseDateFromInput(value: string): Date | null {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}
