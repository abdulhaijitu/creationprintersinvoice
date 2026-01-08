import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value" | "type"> {
  value: number;
  onChange: (value: number) => void;
  /** Number of decimal places (default: 2) */
  decimals?: number;
  /** Format display on blur (default: true) */
  formatOnBlur?: boolean;
}

/**
 * CurrencyInput - A specialized input for handling decimal currency values
 * 
 * Features:
 * - Allows natural typing without cursor jumps
 * - Uses raw string state during typing
 * - Only formats on blur
 * - Stores values as numbers internally
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, decimals = 2, formatOnBlur = true, onBlur, onFocus, ...props }, ref) => {
    // Use raw string state to prevent cursor jumps
    const [rawValue, setRawValue] = React.useState<string>("");
    const [isFocused, setIsFocused] = React.useState(false);
    const isInitialMount = React.useRef(true);

    // Only sync from prop when not focused and on initial mount or external value change
    React.useEffect(() => {
      if (!isFocused) {
        if (value === 0 || value === null || value === undefined) {
          setRawValue("");
        } else {
          setRawValue(formatOnBlur ? value.toFixed(decimals) : String(value));
        }
      }
    }, [value, isFocused, formatOnBlur, decimals]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow empty input
      if (inputValue === "") {
        setRawValue("");
        onChange(0);
        return;
      }

      // Allow only valid numeric characters: digits, one decimal point, optional leading minus
      // This regex allows partial input like "5", "5.", "5.0", etc.
      const isValidInput = /^-?\d*\.?\d*$/.test(inputValue);
      
      if (!isValidInput) {
        return; // Reject invalid characters without modifying state
      }

      // Check decimal places limit (only if there's a decimal point)
      const decimalIndex = inputValue.indexOf('.');
      if (decimalIndex !== -1) {
        const decimalPlaces = inputValue.length - decimalIndex - 1;
        if (decimalPlaces > decimals) {
          return; // Reject if too many decimal places
        }
      }

      // Store raw string value - NO FORMATTING during typing
      setRawValue(inputValue);
      
      // Parse and update numeric value for parent
      const numValue = parseFloat(inputValue);
      if (!isNaN(numValue)) {
        onChange(numValue);
      } else if (inputValue === "" || inputValue === "-" || inputValue === ".") {
        onChange(0);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Keep current raw value, don't reformat
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      
      // Parse final value
      const numValue = parseFloat(rawValue) || 0;
      onChange(numValue);
      
      // Format display on blur only
      if (formatOnBlur) {
        if (numValue === 0) {
          setRawValue("");
        } else {
          setRawValue(numValue.toFixed(decimals));
        }
      }
      
      onBlur?.(e);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        className={cn("text-right", className)}
        value={rawValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
