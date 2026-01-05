import { cn } from "@/lib/utils";
import { Check, Palette, Grid3X3, Printer, Layers, Scissors, BookOpen, Package, Truck } from "lucide-react";

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

export function canAdvanceStatus(currentStatus: WorkflowStatus): boolean {
  return currentStatus !== 'delivered';
}

export function isDelivered(status: WorkflowStatus): boolean {
  return status === 'delivered';
}

interface WorkflowStepperProps {
  currentStatus: WorkflowStatus;
  compact?: boolean;
  className?: string;
}

export function WorkflowStepper({ currentStatus, compact = false, className }: WorkflowStepperProps) {
  const currentIndex = getStatusIndex(currentStatus);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {WORKFLOW_STATUSES.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div
              key={status}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-200",
                isCompleted && "bg-success",
                isCurrent && "bg-primary w-3 h-3",
                !isCompleted && !isCurrent && "bg-muted"
              )}
              title={WORKFLOW_LABELS[status]}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1 overflow-x-auto", className)}>
      {WORKFLOW_STATUSES.map((status, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const Icon = WORKFLOW_ICONS[status];

        return (
          <div key={status} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap",
                isCompleted && "bg-success/10 text-success",
                isCurrent && "bg-primary text-primary-foreground",
                !isCompleted && !isCurrent && "bg-muted/50 text-muted-foreground"
              )}
            >
              {isCompleted ? (
                <Check className="h-3 w-3" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">{WORKFLOW_LABELS[status]}</span>
            </div>
            {index < WORKFLOW_STATUSES.length - 1 && (
              <div 
                className={cn(
                  "w-2 h-0.5 mx-0.5 transition-colors duration-200",
                  index < currentIndex ? "bg-success" : "bg-muted"
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
