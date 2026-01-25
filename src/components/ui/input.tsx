import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Input Component - Standardized Design System
 * 
 * All inputs use:
 * - h-10 height (consistent with buttons)
 * - rounded-md radius
 * - 200ms ease-out transitions
 * - Semantic border/input tokens
 * - Consistent focus ring using primary color
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          // Transitions
          "ring-offset-background transition-all duration-200 ease-out",
          // File input styles
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Placeholder
          "placeholder:text-muted-foreground/60",
          // Focus state - using semantic primary token
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
