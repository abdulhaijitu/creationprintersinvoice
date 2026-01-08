import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectInputProps {
  /** String value */
  value: string;
  /** String onChange */
  onChange: (value: string) => void;
  /** Options array */
  options: SelectOption[];
  /** Placeholder text */
  placeholder?: string;
  /** Error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional class names for trigger */
  className?: string;
  /** Name for form association */
  name?: string;
}

/**
 * SelectInput - Global standardized select dropdown
 *
 * Rules enforced:
 * - Consistent styling
 * - Proper z-index and background
 * - No transparency issues
 * - Focus remains stable
 */
const SelectInput = React.forwardRef<HTMLButtonElement, SelectInputProps>(
  (
    {
      value,
      onChange,
      options,
      placeholder = "Select an option",
      error,
      errorMessage,
      disabled,
      className,
      name,
    },
    ref,
  ) => {
    const selectElement = (
      <Select value={value} onValueChange={onChange} disabled={disabled} name={name}>
        <SelectTrigger
          ref={ref}
          className={cn(
            "bg-background",
            error && "border-destructive focus:ring-destructive",
            className,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50 shadow-lg border">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );

    if (error && errorMessage) {
      return (
        <div className="space-y-1">
          {selectElement}
          <p className="text-xs text-destructive">{errorMessage}</p>
        </div>
      );
    }

    return selectElement;
  },
);

SelectInput.displayName = "SelectInput";

export { SelectInput };
