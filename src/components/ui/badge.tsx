import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badge Component - Standardized Design System
 * 
 * Semantic variants: default, secondary, destructive, outline, success, warning, info, muted
 * Sizes: sm (10px text), default (12px text), lg (14px text)
 * 
 * All badges use:
 * - rounded-full radius
 * - 150ms transitions
 * - Semantic color tokens only
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Primary badge
        default: "border-transparent bg-primary text-primary-foreground",
        // Secondary/neutral badge
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        // Error state - using semantic destructive token
        destructive: "border-destructive/30 bg-destructive/10 text-destructive",
        // Outline - minimal
        outline: "text-foreground border-border",
        // Success state - using semantic success token
        success: "border-success/30 bg-success/10 text-success",
        // Warning state - using semantic warning token
        warning: "border-warning/30 bg-warning/10 text-warning",
        // Info state - using semantic info token
        info: "border-info/30 bg-info/10 text-info",
        // Muted/neutral state
        muted: "border-border bg-muted text-muted-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        default: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
