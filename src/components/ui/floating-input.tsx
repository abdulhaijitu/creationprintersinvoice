import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle } from "lucide-react";

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  success?: boolean;
  helpText?: string;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, error, success, helpText, type = "text", ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue);
    const inputId = React.useId();

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(!!e.target.value);
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      props.onChange?.(e);
    };

    const isFloating = isFocused || hasValue;

    return (
      <div className="relative w-full">
        <div className="relative">
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              "peer w-full h-12 px-4 pt-5 pb-2 text-sm",
              "rounded-lg border bg-background",
              "ring-offset-background transition-all duration-200 ease-out",
              "placeholder:text-transparent",
              "focus-visible:outline-none focus-visible:ring-1",
              // States
              error
                ? "border-destructive focus-visible:ring-destructive focus-visible:border-destructive"
                : success
                ? "border-success focus-visible:ring-success focus-visible:border-success"
                : "border-input focus-visible:ring-primary focus-visible:border-primary",
              "disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            placeholder={label}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            {...props}
          />
          <label
            htmlFor={inputId}
            className={cn(
              "absolute left-4 transition-all duration-200 ease-out pointer-events-none",
              "origin-[0]",
              isFloating
                ? "top-2 text-xs font-medium"
                : "top-1/2 -translate-y-1/2 text-sm",
              // Colors
              error
                ? "text-destructive"
                : success
                ? "text-success"
                : isFocused
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            {label}
          </label>
          
          {/* Status Icons */}
          {(error || success) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {error ? (
                <AlertCircle className="h-4 w-4 text-destructive animate-scale-in" />
              ) : success ? (
                <CheckCircle className="h-4 w-4 text-success animate-scale-in" />
              ) : null}
            </div>
          )}
        </div>
        
        {/* Helper/Error text */}
        {(error || helpText) && (
          <p
            className={cn(
              "mt-1.5 text-xs transition-all duration-200",
              error ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {error || helpText}
          </p>
        )}
      </div>
    );
  }
);
FloatingInput.displayName = "FloatingInput";

interface FloatingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  success?: boolean;
  helpText?: string;
}

const FloatingTextarea = React.forwardRef<HTMLTextAreaElement, FloatingTextareaProps>(
  ({ className, label, error, success, helpText, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue);
    const textareaId = React.useId();

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      setHasValue(!!e.target.value);
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setHasValue(!!e.target.value);
      props.onChange?.(e);
    };

    const isFloating = isFocused || hasValue;

    return (
      <div className="relative w-full">
        <div className="relative">
          <textarea
            id={textareaId}
            ref={ref}
            className={cn(
              "peer w-full min-h-[120px] px-4 pt-6 pb-3 text-sm resize-y",
              "rounded-lg border bg-background",
              "ring-offset-background transition-all duration-200 ease-out",
              "placeholder:text-transparent",
              "focus-visible:outline-none focus-visible:ring-1",
              error
                ? "border-destructive focus-visible:ring-destructive focus-visible:border-destructive"
                : success
                ? "border-success focus-visible:ring-success focus-visible:border-success"
                : "border-input focus-visible:ring-primary focus-visible:border-primary",
              "disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            placeholder={label}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            {...props}
          />
          <label
            htmlFor={textareaId}
            className={cn(
              "absolute left-4 transition-all duration-200 ease-out pointer-events-none",
              "origin-[0] bg-background px-1 -ml-1",
              isFloating
                ? "top-2 text-xs font-medium"
                : "top-4 text-sm",
              error
                ? "text-destructive"
                : success
                ? "text-success"
                : isFocused
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            {label}
          </label>
        </div>
        
        {(error || helpText) && (
          <p
            className={cn(
              "mt-1.5 text-xs transition-all duration-200",
              error ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {error || helpText}
          </p>
        )}
      </div>
    );
  }
);
FloatingTextarea.displayName = "FloatingTextarea";

export { FloatingInput, FloatingTextarea };