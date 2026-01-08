import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

export interface NumericInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value" | "type"> {
  /** String value - raw input during typing */
  value: string;
  /** String onChange - no parsing inside component */
  onChange: (value: string) => void;
  /** Optional prefix (visual only, e.g. "৳") */
  prefix?: string;
  /** Optional suffix (visual only, e.g. "pcs") */
  suffix?: string;
  /** Allow negative numbers (default: false) */
  allowNegative?: boolean;
  /** Allow decimals (default: true) */
  allowDecimals?: boolean;
  /** Max decimal places (default: 2) */
  maxDecimals?: number;
  /** Error state */
  error?: boolean;
}

/**
 * NumericInput - Global cursor-safe numeric input
 *
 * Rules enforced:
 * - Value is always STRING (no number conversion inside)
 * - Cursor never jumps (no formatting during typing)
 * - No browser autofill/suggestions
 * - No spinners
 * - Validation is silent (no value mutation)
 *
 * Usage:
 * <NumericInput value={amount} onChange={setAmount} />
 *
 * Conversion to number should happen ONLY on blur/submit outside this component.
 */
const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  (
    {
      className,
      value,
      onChange,
      prefix,
      suffix,
      allowNegative = false,
      allowDecimals = true,
      maxDecimals = 2,
      error,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let next = e.target.value;

      // Allow empty
      if (next === "") {
        onChange("");
        return;
      }

      // Build regex based on config
      let pattern: RegExp;
      if (allowNegative && allowDecimals) {
        pattern = /^-?\d*\.?\d*$/;
      } else if (allowNegative && !allowDecimals) {
        pattern = /^-?\d*$/;
      } else if (!allowNegative && allowDecimals) {
        pattern = /^\d*\.?\d*$/;
      } else {
        pattern = /^\d*$/;
      }

      if (!pattern.test(next)) return;

      // Enforce decimal places limit
      if (allowDecimals) {
        const dotIndex = next.indexOf(".");
        if (dotIndex !== -1) {
          const decimalPlaces = next.length - dotIndex - 1;
          if (decimalPlaces > maxDecimals) return;
        }
      }

      // Pass raw string to parent
      onChange(next);
    };

    const inputElement = (
      <Input
        ref={ref}
        type="text"
        inputMode={allowDecimals ? "decimal" : "numeric"}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        data-form-type="other"
        data-lpignore="true"
        className={cn(
          "text-right",
          error && "border-destructive focus-visible:ring-destructive",
          prefix && "pl-8",
          suffix && "pr-8",
          className,
        )}
        value={value}
        onChange={handleChange}
        onFocus={onFocus}
        onBlur={onBlur}
        {...props}
      />
    );

    // Wrap with prefix/suffix if provided
    if (prefix || suffix) {
      return (
        <div className="relative">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
              {prefix}
            </span>
          )}
          {inputElement}
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
      );
    }

    return inputElement;
  },
);

NumericInput.displayName = "NumericInput";

export { NumericInput };

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers for parsing NumericInput values
// ─────────────────────────────────────────────────────────────────────────────

/** Safely parse a string to number (returns 0 if invalid) */
export function parseNumericValue(value: string): number {
  if (!value || value === "" || value === "-" || value === ".") return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/** Format a number to string for display (e.g. on blur) */
export function formatNumericDisplay(
  value: number,
  decimals: number = 2,
  showZeroAsEmpty: boolean = true,
): string {
  if (showZeroAsEmpty && value === 0) return "";
  return value.toFixed(decimals);
}
