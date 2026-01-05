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
 * - Allows natural typing of decimals (e.g., "6.40")
 * - Does not strip trailing zeros while typing
 * - Formats to specified decimal places on blur
 * - Stores values as numbers internally
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, decimals = 2, formatOnBlur = true, onBlur, ...props }, ref) => {
    // Internal string state to preserve user input while typing
    const [displayValue, setDisplayValue] = React.useState<string>("");
    const [isFocused, setIsFocused] = React.useState(false);

    // Sync display value from prop when not focused
    React.useEffect(() => {
      if (!isFocused) {
        // Format the display value when not focused
        if (value === 0) {
          setDisplayValue("");
        } else {
          setDisplayValue(formatOnBlur ? value.toFixed(decimals) : String(value));
        }
      }
    }, [value, isFocused, formatOnBlur, decimals]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow empty input
      if (inputValue === "") {
        setDisplayValue("");
        onChange(0);
        return;
      }

      // Validate input: allow digits, one decimal point, and leading minus
      // Pattern: optional minus, digits, optional decimal with up to N decimal places
      const validPattern = new RegExp(`^-?\\d*\\.?\\d{0,${decimals}}$`);
      
      if (validPattern.test(inputValue)) {
        setDisplayValue(inputValue);
        
        // Only update the numeric value if it's a complete number
        const numValue = parseFloat(inputValue);
        if (!isNaN(numValue)) {
          onChange(numValue);
        } else if (inputValue === "" || inputValue === "-" || inputValue === ".") {
          // Keep 0 for incomplete inputs
          onChange(0);
        }
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Show raw value without formatting when focused
      if (value === 0) {
        setDisplayValue("");
      } else {
        // Preserve the current display value or show the numeric value
        const currentDisplay = displayValue || String(value);
        setDisplayValue(currentDisplay);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      
      // Parse and format the final value
      const numValue = parseFloat(displayValue) || 0;
      onChange(numValue);
      
      // Format display on blur
      if (formatOnBlur) {
        if (numValue === 0) {
          setDisplayValue("");
        } else {
          setDisplayValue(numValue.toFixed(decimals));
        }
      }
      
      // Call external onBlur if provided
      onBlur?.(e);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
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
