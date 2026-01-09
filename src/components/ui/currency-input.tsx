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
 * CURSOR-SAFE IMPLEMENTATION:
 * - Uses internal string state while focused to prevent cursor jumps
 * - Only syncs from parent value when NOT focused
 * - Commits numeric value to parent ONLY on blur
 * - Never reformats value during active typing
 *
 * Use this when parent state is a number.
 * Use NumericInput directly when parent state is a string.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    { className, value, onChange, decimals = 2, formatOnBlur = true, onBlur, onFocus, ...props },
    ref,
  ) => {
    // Internal string state for typing - this is the key to cursor stability
    const [displayValue, setDisplayValue] = React.useState<string>(() => 
      formatNumericDisplay(value, decimals, true)
    );
    const [isFocused, setIsFocused] = React.useState(false);
    
    // Track the last committed value to avoid unnecessary syncs
    const lastCommittedRef = React.useRef(value);

    // Sync from numeric prop ONLY when not focused AND value actually changed externally
    React.useEffect(() => {
      // Don't sync while user is typing
      if (isFocused) return;
      
      // Only sync if the external value is different from what we last committed
      // This prevents the parent's value update (from our own blur) from resetting display
      if (value !== lastCommittedRef.current) {
        lastCommittedRef.current = value;
        setDisplayValue(formatNumericDisplay(value, decimals, true));
      }
    }, [value, decimals, isFocused]);

    const handleFocus = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    }, [onFocus]);

    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);

      // Convert and commit on blur
      const committed = parseNumericValue(displayValue);
      lastCommittedRef.current = committed;
      onChange(committed);

      // Format for display after blur
      if (formatOnBlur) {
        setDisplayValue(formatNumericDisplay(committed, decimals, true));
      }

      onBlur?.(e);
    }, [displayValue, onChange, formatOnBlur, decimals, onBlur]);

    // Handle internal string changes - NO formatting, NO parsing during typing
    const handleChange = React.useCallback((newValue: string) => {
      setDisplayValue(newValue);
    }, []);

    return (
      <NumericInput
        ref={ref}
        className={cn("text-right", className)}
        value={displayValue}
        onChange={handleChange}
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
