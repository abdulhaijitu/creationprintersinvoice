import * as React from "react";
import { cn } from "@/lib/utils";
import { NumericInput, parseNumericValue, formatNumericDisplay } from "./numeric-input";

export interface CurrencyInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value" | "type"> {
  /** Numeric value (stored as number in parent) */
  value: number;
  /** Numeric onChange (parent receives number) */
  onChange: (value: number) => void;
  /** Number of decimal places (default: 2) */
  decimals?: number;
  /** Format display on blur (default: true) */
  formatOnBlur?: boolean;
}

/**
 * CurrencyInput - Wrapper around NumericInput for number-based APIs
 *
 * Internally uses string state for cursor stability.
 * Converts to/from number only on blur.
 *
 * Use this when parent state is a number.
 * Use NumericInput directly when parent state is a string.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    { className, value, onChange, decimals = 2, formatOnBlur = true, onBlur, onFocus, ...props },
    ref,
  ) => {
    // Internal string state for typing
    const [displayValue, setDisplayValue] = React.useState<string>("");
    const isFocusedRef = React.useRef(false);

    // Sync from numeric prop ONLY when not focused
    React.useEffect(() => {
      if (isFocusedRef.current) return;
      setDisplayValue(formatNumericDisplay(value, decimals, true));
    }, [value, decimals]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = true;
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = false;

      // Convert and commit on blur
      const committed = parseNumericValue(displayValue);
      onChange(committed);

      // Format for display
      if (formatOnBlur) {
        setDisplayValue(formatNumericDisplay(committed, decimals, true));
      }

      onBlur?.(e);
    };

    return (
      <NumericInput
        ref={ref}
        className={cn("text-right", className)}
        value={displayValue}
        onChange={setDisplayValue}
        maxDecimals={decimals}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  },
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
