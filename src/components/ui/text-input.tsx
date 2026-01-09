import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

export interface TextInputProps
  extends Omit<React.ComponentProps<"input">, "onChange" | "value" | "type"> {
  /** String value */
  value: string;
  /** String onChange */
  onChange: (value: string) => void;
  /** Optional icon left */
  iconLeft?: React.ReactNode;
  /** Optional icon right */
  iconRight?: React.ReactNode;
  /** Error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Max length */
  maxLength?: number;
}

/**
 * TextInput - Global cursor-safe text input
 *
 * Rules enforced:
 * - Cursor never jumps
 * - No browser autofill/suggestions
 * - No mutation during typing
 * - Focus remains stable
 */
const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      className,
      value,
      onChange,
      iconLeft,
      iconRight,
      error,
      errorMessage,
      maxLength,
      ...props
    },
    ref,
  ) => {
    // Memoized change handler - prevents cursor jumps from handler recreation
    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      
      // Enforce max length if specified - reject silently to preserve cursor
      if (maxLength && next.length > maxLength) {
        return;
      }
      
      // Pass value directly - NO TRANSFORMATION during typing
      onChange(next);
    }, [onChange, maxLength]);

    const inputElement = (
      <Input
        ref={ref}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-form-type="other"
        data-lpignore="true"
        className={cn(
          error && "border-destructive focus-visible:ring-destructive",
          iconLeft && "pl-10",
          iconRight && "pr-10",
          className,
        )}
        value={value}
        onChange={handleChange}
        {...props}
      />
    );

    const wrappedInput = (iconLeft || iconRight) ? (
      <div className="relative">
        {iconLeft && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {iconLeft}
          </span>
        )}
        {inputElement}
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {iconRight}
          </span>
        )}
      </div>
    ) : inputElement;

    if (error && errorMessage) {
      return (
        <div className="space-y-1">
          {wrappedInput}
          <p className="text-xs text-destructive">{errorMessage}</p>
        </div>
      );
    }

    return wrappedInput;
  },
);

TextInput.displayName = "TextInput";

export { TextInput };
