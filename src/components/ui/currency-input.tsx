import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

interface CurrencyInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value" | "type"> {
  value: number;
  onChange: (value: number) => void;
  /** Number of decimal places (default: 2) */
  decimals?: number;
  /** Format display on blur (default: true) */
  formatOnBlur?: boolean;
}

/**
 * CurrencyInput
 *
 * Cursor-safe numeric input:
 * - Uses isolated string state while typing (no number conversion, no formatting)
 * - Calls parent onChange ONLY on blur
 * - Never syncs from parent value while focused (prevents focus/caret jumps)
 * - Disables browser autocomplete/suggestions for amount fields
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    { className, value, onChange, decimals = 2, formatOnBlur = true, onBlur, onFocus, ...props },
    ref,
  ) => {
    const [displayValue, setDisplayValue] = React.useState<string>("");

    // Use a ref (not state) so "focused" is updated synchronously and cannot lag
    const isFocusedRef = React.useRef(false);

    // Sync from numeric prop ONLY when not focused (never while typing)
    React.useEffect(() => {
      if (isFocusedRef.current) return;

      if (value === 0 || value === null || value === undefined) {
        setDisplayValue("");
        return;
      }

      setDisplayValue(formatOnBlur ? value.toFixed(decimals) : String(value));
    }, [value, decimals, formatOnBlur]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;

      // Allow empty
      if (next === "") {
        setDisplayValue("");
        return;
      }

      // Allow only valid numeric characters: digits, one decimal point, optional leading minus
      if (!/^-?\d*\.?\d*$/.test(next)) return;

      // Enforce decimal places limit
      const dotIndex = next.indexOf(".");
      if (dotIndex !== -1) {
        const decimalPlaces = next.length - dotIndex - 1;
        if (decimalPlaces > decimals) return;
      }

      // Store raw string only (NO conversion, NO formatting)
      setDisplayValue(next);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = true;
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      isFocusedRef.current = false;

      // Convert only on blur (commit)
      const committed = parseFloat(displayValue) || 0;
      onChange(committed);

      // Optional display formatting on blur only
      if (formatOnBlur) {
        setDisplayValue(committed === 0 ? "" : committed.toFixed(decimals));
      }

      onBlur?.(e);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        className={cn("text-right", className)}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  },
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
