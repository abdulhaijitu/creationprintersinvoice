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
 * CRITICAL FIX: This component uses completely isolated string state during typing
 * to prevent cursor jumps. The parent onChange is ONLY called on blur.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, decimals = 2, formatOnBlur = true, onBlur, onFocus, ...props }, ref) => {
    // Completely isolated string state - parent value is IGNORED during focus
    const [displayValue, setDisplayValue] = React.useState<string>("");
    const [isFocused, setIsFocused] = React.useState(false);
    const hasInitialized = React.useRef(false);

    // Initialize display value from prop ONLY on mount or when not focused
    React.useEffect(() => {
      if (!isFocused) {
        if (value === 0 || value === null || value === undefined) {
          setDisplayValue("");
        } else {
          setDisplayValue(formatOnBlur ? value.toFixed(decimals) : String(value));
        }
        hasInitialized.current = true;
      }
    }, [value, isFocused, formatOnBlur, decimals]);

    // Handle typing - NO parent updates, NO formatting, just raw string storage
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow empty
      if (inputValue === "") {
        setDisplayValue("");
        return;
      }

      // Allow only valid numeric characters (digits, single decimal, optional minus)
      if (!/^-?\d*\.?\d*$/.test(inputValue)) {
        return;
      }

      // Check decimal places limit
      const decimalIndex = inputValue.indexOf('.');
      if (decimalIndex !== -1) {
        const decimalPlaces = inputValue.length - decimalIndex - 1;
        if (decimalPlaces > decimals) {
          return;
        }
      }

      // Store raw string - NO CONVERSION, NO PARENT UPDATE
      setDisplayValue(inputValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Keep current display value as-is, no reformatting
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      
      // NOW parse and send to parent
      const numValue = parseFloat(displayValue) || 0;
      onChange(numValue);
      
      // Format for display
      if (formatOnBlur) {
        if (numValue === 0) {
          setDisplayValue("");
        } else {
          setDisplayValue(numValue.toFixed(decimals));
        }
      }
      
      onBlur?.(e);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={cn("text-right", className)}
        value={displayValue}
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
