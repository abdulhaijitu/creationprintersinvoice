import * as React from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "./textarea";

export interface TextAreaInputProps
  extends Omit<React.ComponentProps<"textarea">, "onChange" | "value"> {
  /** String value */
  value: string;
  /** String onChange */
  onChange: (value: string) => void;
  /** Error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Max length */
  maxLength?: number;
  /** Show character count */
  showCharCount?: boolean;
}

/**
 * TextAreaInput - Global cursor-safe textarea
 *
 * Rules enforced:
 * - Cursor never jumps
 * - No browser autofill/suggestions
 * - No mutation during typing
 * - Focus remains stable
 */
const TextAreaInput = React.forwardRef<HTMLTextAreaElement, TextAreaInputProps>(
  (
    {
      className,
      value,
      onChange,
      error,
      errorMessage,
      maxLength,
      showCharCount = false,
      ...props
    },
    ref,
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      let next = e.target.value;
      
      // Enforce max length if specified
      if (maxLength && next.length > maxLength) {
        return;
      }
      
      onChange(next);
    };

    const textareaElement = (
      <Textarea
        ref={ref}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-form-type="other"
        data-lpignore="true"
        className={cn(
          error && "border-destructive focus-visible:ring-destructive",
          className,
        )}
        value={value}
        onChange={handleChange}
        {...props}
      />
    );

    if (error || showCharCount) {
      return (
        <div className="space-y-1">
          {textareaElement}
          <div className="flex justify-between text-xs">
            {error && errorMessage ? (
              <p className="text-destructive">{errorMessage}</p>
            ) : (
              <span />
            )}
            {showCharCount && maxLength && (
              <span className="text-muted-foreground">
                {value.length}/{maxLength}
              </span>
            )}
          </div>
        </div>
      );
    }

    return textareaElement;
  },
);

TextAreaInput.displayName = "TextAreaInput";

export { TextAreaInput };
