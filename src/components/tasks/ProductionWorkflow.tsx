import { cn } from "@/lib/utils";
import { Check, Palette, Grid3X3, Printer, Layers, Scissors, BookOpen, Package, Truck, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Production workflow statuses in order
export const WORKFLOW_STATUSES = [
  'design',
  'plate', 
  'printing',
  'lamination',
  'die_cutting',
  'binding',
  'packaging',
  'delivered'
] as const;

export type WorkflowStatus = typeof WORKFLOW_STATUSES[number];

export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
  design: 'Design',
  plate: 'Plate',
  printing: 'Printing',
  lamination: 'Lamination',
  die_cutting: 'Die Cutting',
  binding: 'Binding',
  packaging: 'Packaging',
  delivered: 'Delivered'
};

export const WORKFLOW_ICONS: Record<WorkflowStatus, React.ComponentType<{ className?: string }>> = {
  design: Palette,
  plate: Grid3X3,
  printing: Printer,
  lamination: Layers,
  die_cutting: Scissors,
  binding: BookOpen,
  packaging: Package,
  delivered: Truck
};

export function getStatusIndex(status: WorkflowStatus): number {
  return WORKFLOW_STATUSES.indexOf(status);
}

export function getNextStatus(currentStatus: WorkflowStatus): WorkflowStatus | null {
  const currentIndex = getStatusIndex(currentStatus);
  if (currentIndex < WORKFLOW_STATUSES.length - 1) {
    return WORKFLOW_STATUSES[currentIndex + 1];
  }
  return null;
}

export function getPreviousStatus(currentStatus: WorkflowStatus): WorkflowStatus | null {
  const currentIndex = getStatusIndex(currentStatus);
  if (currentIndex > 0) {
    return WORKFLOW_STATUSES[currentIndex - 1];
  }
  return null;
}

export function canAdvanceStatus(currentStatus: WorkflowStatus): boolean {
  return currentStatus !== 'delivered';
}

export function isDelivered(status: WorkflowStatus): boolean {
  return status === 'delivered';
}

/**
 * Validates if a step transition is allowed
 * Rules:
 * - Can click completed steps (view only)
 * - Can click current step (no-op)
 * - Can only move to the NEXT immediate step
 * - Cannot skip steps or jump ahead multiple stages
 */
export function canTransitionTo(currentStatus: WorkflowStatus, targetStatus: WorkflowStatus): { allowed: boolean; reason?: string } {
  const currentIndex = getStatusIndex(currentStatus);
  const targetIndex = getStatusIndex(targetStatus);

  // Same step - always allowed (no-op)
  if (currentIndex === targetIndex) {
    return { allowed: true };
  }

  // Going backwards - allowed (view completed steps)
  if (targetIndex < currentIndex) {
    return { allowed: true };
  }

  // Going to immediate next step - allowed
  if (targetIndex === currentIndex + 1) {
    return { allowed: true };
  }

  // Trying to skip steps
  return { 
    allowed: false, 
    reason: "Please complete previous step first" 
  };
}

interface WorkflowStepperProps {
  currentStatus: WorkflowStatus;
  compact?: boolean;
  className?: string;
  interactive?: boolean;
  onStepClick?: (targetStatus: WorkflowStatus) => void;
  disabled?: boolean;
}

export function WorkflowStepper({ 
  currentStatus, 
  compact = false, 
  className,
  interactive = false,
  onStepClick,
  disabled = false
}: WorkflowStepperProps) {
  const currentIndex = getStatusIndex(currentStatus);

  const handleStepClick = (targetStatus: WorkflowStatus) => {
    if (disabled || !interactive || !onStepClick) return;

    const { allowed, reason } = canTransitionTo(currentStatus, targetStatus);
    
    if (!allowed) {
      toast.error(reason || "Cannot transition to this step");
      return;
    }

    // Don't trigger if clicking the same step
    if (targetStatus === currentStatus) return;

    onStepClick(targetStatus);
  };

  const handleKeyDown = (e: React.KeyboardEvent, targetStatus: WorkflowStatus) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleStepClick(targetStatus);
    }
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        {WORKFLOW_STATUSES.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isClickable = interactive && !disabled;
          const canTransition = canTransitionTo(currentStatus, status).allowed;
          
          return (
            <button
              key={status}
              type="button"
              onClick={() => handleStepClick(status)}
              onKeyDown={(e) => handleKeyDown(e, status)}
              disabled={disabled || !interactive}
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                isCompleted && "bg-success",
                isCurrent && "bg-primary w-4 h-4",
                !isCompleted && !isCurrent && "bg-muted",
                isClickable && canTransition && "cursor-pointer hover:scale-110",
                isClickable && !canTransition && !isCurrent && !isCompleted && "cursor-not-allowed opacity-50",
                disabled && "cursor-default"
              )}
              title={`${WORKFLOW_LABELS[status]}${!canTransition && index > currentIndex ? ' - Complete previous steps first' : ''}`}
              aria-label={`${WORKFLOW_LABELS[status]} step${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
              tabIndex={isClickable ? 0 : -1}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent pb-2 -mb-2",
      className
    )}>
      {WORKFLOW_STATUSES.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isNext = index === currentIndex + 1;
        const Icon = WORKFLOW_ICONS[status];
        const isClickable = interactive && !disabled;
        const canTransition = canTransitionTo(currentStatus, status).allowed;
        const isBlocked = !canTransition && index > currentIndex;

        return (
          <div key={status} className="flex items-center flex-shrink-0">
            <button
              type="button"
              onClick={() => handleStepClick(status)}
              onKeyDown={(e) => handleKeyDown(e, status)}
              disabled={disabled || !interactive}
              className={cn(
                // Base styles - minimum touch target 40px
                "flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-full text-xs font-medium transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                // Completed state
                isCompleted && "bg-success/10 text-success",
                // Current state
                isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                // Next step - highlighted as available
                isNext && isClickable && "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20",
                // Future steps (blocked)
                !isCompleted && !isCurrent && !isNext && "bg-muted/50 text-muted-foreground",
                // Interactive states
                isClickable && canTransition && !isCurrent && "cursor-pointer hover:scale-105 active:scale-95",
                isClickable && isBlocked && "cursor-not-allowed opacity-60",
                disabled && "cursor-default"
              )}
              title={isBlocked ? 'Complete previous step first' : WORKFLOW_LABELS[status]}
              aria-label={`${WORKFLOW_LABELS[status]}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : isNext ? ' (next available)' : ''}`}
              tabIndex={isClickable ? 0 : -1}
            >
              {isCompleted ? (
                <Check className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              <span className="whitespace-nowrap">{WORKFLOW_LABELS[status]}</span>
            </button>
            {index < WORKFLOW_STATUSES.length - 1 && (
              <ChevronRight 
                className={cn(
                  "w-4 h-4 mx-0.5 flex-shrink-0 transition-colors duration-200",
                  index < currentIndex ? "text-success" : "text-muted-foreground/50"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface StatusBadgeProps {
  status: WorkflowStatus;
  className?: string;
}

export function ProductionStatusBadge({ status, className }: StatusBadgeProps) {
  const Icon = WORKFLOW_ICONS[status];
  const isDeliveredStatus = isDelivered(status);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-200",
        isDeliveredStatus 
          ? "bg-success/10 text-success" 
          : "bg-primary/10 text-primary",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {WORKFLOW_LABELS[status]}
    </div>
  );
}
