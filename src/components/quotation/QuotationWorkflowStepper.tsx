import { cn } from "@/lib/utils";
import { Check, FileEdit, Send, CheckCircle, XCircle, FileCheck, AlertTriangle, ChevronRight } from "lucide-react";
import { toast } from "sonner";

// Quotation workflow statuses in order
export const QUOTATION_WORKFLOW = ['draft', 'sent', 'accepted', 'converted'] as const;
export const TERMINAL_STATUSES = ['rejected', 'expired', 'converted'] as const;

export type QuotationStatus = 'draft' | 'pending' | 'sent' | 'accepted' | 'rejected' | 'converted' | 'expired';

export const STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  converted: 'Converted',
  expired: 'Expired',
};

export const STATUS_ICONS: Record<QuotationStatus, React.ComponentType<{ className?: string }>> = {
  draft: FileEdit,
  pending: FileEdit,
  sent: Send,
  accepted: CheckCircle,
  rejected: XCircle,
  converted: FileCheck,
  expired: AlertTriangle,
};

// Get the index of a status in the main workflow
// 'pending' is treated as equivalent to 'draft' for workflow purposes
export function getStatusIndex(status: QuotationStatus): number {
  // Treat 'pending' as 'draft' for UI purposes
  const normalizedStatus = status === 'pending' ? 'draft' : status;
  const idx = QUOTATION_WORKFLOW.indexOf(normalizedStatus as any);
  return idx >= 0 ? idx : -1;
}

// Check if a status is terminal (no further progression possible)
export function isTerminalStatus(status: QuotationStatus): boolean {
  return TERMINAL_STATUSES.includes(status as any);
}

// Validate if a transition is allowed
export function canTransitionTo(currentStatus: QuotationStatus, targetStatus: QuotationStatus): { allowed: boolean; reason?: string } {
  // Terminal statuses cannot transition
  if (isTerminalStatus(currentStatus)) {
    return { allowed: false, reason: `Cannot change status of a ${STATUS_LABELS[currentStatus].toLowerCase()} quotation` };
  }
  
  // Same status
  if (currentStatus === targetStatus) {
    return { allowed: false, reason: 'Already at this status' };
  }

  // Transition rules based on database function
  // Note: 'pending' is treated as equivalent to 'draft'
  switch (targetStatus) {
    case 'draft':
      if (currentStatus !== 'draft' && currentStatus !== 'pending') {
        return { allowed: false, reason: 'Cannot revert to draft status' };
      }
      return { allowed: false, reason: 'Already at this status' };
    
    case 'sent':
      // Allow sending from both 'draft' AND 'pending' status
      if (currentStatus !== 'draft' && currentStatus !== 'pending') {
        return { allowed: false, reason: 'Can only send quotations that are in draft or pending status' };
      }
      return { allowed: true };
    
    case 'accepted':
      if (currentStatus !== 'sent') {
        return { allowed: false, reason: 'Can only accept quotations that have been sent' };
      }
      return { allowed: true };
    
    case 'rejected':
      if (currentStatus !== 'sent') {
        return { allowed: false, reason: 'Can only reject quotations that have been sent' };
      }
      return { allowed: true };
    
    case 'converted':
      if (currentStatus !== 'accepted') {
        return { allowed: false, reason: 'Can only convert quotations that have been accepted' };
      }
      return { allowed: true };
    
    default:
      return { allowed: false, reason: 'Invalid status transition' };
  }
}

// Get next available status
export function getNextStatus(currentStatus: QuotationStatus): QuotationStatus | null {
  const currentIdx = getStatusIndex(currentStatus);
  if (currentIdx < 0 || currentIdx >= QUOTATION_WORKFLOW.length - 1) return null;
  return QUOTATION_WORKFLOW[currentIdx + 1];
}

interface QuotationWorkflowStepperProps {
  currentStatus: QuotationStatus;
  compact?: boolean;
  className?: string;
  interactive?: boolean;
  onStepClick?: (targetStatus: QuotationStatus) => void;
  disabled?: boolean;
}

export function QuotationWorkflowStepper({ 
  currentStatus, 
  compact = false, 
  className,
  interactive = false,
  onStepClick,
  disabled = false
}: QuotationWorkflowStepperProps) {
  const currentIndex = getStatusIndex(currentStatus);
  const isTerminal = isTerminalStatus(currentStatus);

  const handleStepClick = (targetStatus: QuotationStatus) => {
    if (disabled || !interactive || !onStepClick) return;

    const { allowed, reason } = canTransitionTo(currentStatus, targetStatus);
    
    if (!allowed) {
      toast.error(reason || "Cannot transition to this step");
      return;
    }

    onStepClick(targetStatus);
  };

  const handleKeyDown = (e: React.KeyboardEvent, targetStatus: QuotationStatus) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleStepClick(targetStatus);
    }
  };

  // For rejected/expired, show special badge
  if (currentStatus === 'rejected' || currentStatus === 'expired') {
    const Icon = STATUS_ICONS[currentStatus];
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
            currentStatus === 'rejected' && "bg-destructive/10 text-destructive",
            currentStatus === 'expired' && "bg-warning/10 text-warning"
          )}
        >
          <Icon className="h-4 w-4" />
          {STATUS_LABELS[currentStatus]}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        {QUOTATION_WORKFLOW.map((status, index) => {
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
              title={STATUS_LABELS[status]}
              aria-label={`${STATUS_LABELS[status]} step${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
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
      {QUOTATION_WORKFLOW.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isNext = index === currentIndex + 1;
        const Icon = STATUS_ICONS[status];
        const isClickable = interactive && !disabled;
        const canTransition = canTransitionTo(currentStatus, status).allowed;

        return (
          <div key={status} className="flex items-center flex-shrink-0">
            <button
              type="button"
              onClick={() => handleStepClick(status)}
              onKeyDown={(e) => handleKeyDown(e, status)}
              disabled={disabled || !interactive}
              className={cn(
                // Base styles
                "flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-full text-xs font-medium transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                // Completed state
                isCompleted && "bg-success/10 text-success",
                // Current state
                isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                // Future clickable steps
                !isCompleted && !isCurrent && canTransition && "bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary",
                // Future non-clickable steps
                !isCompleted && !isCurrent && !canTransition && "bg-muted/30 text-muted-foreground/50",
                // Interactive states
                isClickable && canTransition && !isCurrent && "cursor-pointer hover:scale-105 active:scale-95",
                isClickable && !canTransition && !isCurrent && "cursor-not-allowed",
                disabled && "cursor-default"
              )}
              title={!canTransition && !isCurrent && !isCompleted 
                ? canTransitionTo(currentStatus, status).reason 
                : STATUS_LABELS[status]}
              aria-label={`${STATUS_LABELS[status]}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : isNext ? ' (next available)' : ''}`}
              tabIndex={isClickable ? 0 : -1}
            >
              {isCompleted ? (
                <Check className="h-3.5 w-3.5 flex-shrink-0" />
              ) : (
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              <span className="whitespace-nowrap">{STATUS_LABELS[status]}</span>
            </button>
            {index < QUOTATION_WORKFLOW.length - 1 && (
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

// Status badge component for consistency
interface QuotationStatusBadgeProps {
  status: QuotationStatus;
  className?: string;
}

export function QuotationStatusBadge({ status, className }: QuotationStatusBadgeProps) {
  const Icon = STATUS_ICONS[status];

  const getVariantClasses = () => {
    switch (status) {
      case 'draft':
        return "bg-muted text-muted-foreground";
      case 'sent':
        return "bg-info/10 text-info";
      case 'accepted':
        return "bg-success/10 text-success";
      case 'rejected':
        return "bg-destructive/10 text-destructive";
      case 'converted':
        return "bg-primary/10 text-primary";
      case 'expired':
        return "bg-warning/10 text-warning";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-200",
        getVariantClasses(),
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {STATUS_LABELS[status]}
    </div>
  );
}
