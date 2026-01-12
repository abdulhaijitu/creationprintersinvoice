import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Moon,
  Calendar,
  Palmtree
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'holiday' | 'leave';

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus;
  isOvernightShift?: boolean;
  missingCheckOut?: boolean;
  className?: string;
  showTooltip?: boolean;
}

const statusConfig: Record<AttendanceStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = {
  present: {
    label: 'Present',
    variant: 'success' as const,
    icon: CheckCircle,
    description: 'Employee checked in on time'
  },
  absent: {
    label: 'Absent',
    variant: 'destructive',
    icon: XCircle,
    description: 'No check-in recorded'
  },
  late: {
    label: 'Late',
    variant: 'warning' as const,
    icon: Clock,
    description: 'Checked in after office start time'
  },
  half_day: {
    label: 'Half Day',
    variant: 'outline',
    icon: AlertTriangle,
    description: 'Worked less than half day'
  },
  holiday: {
    label: 'Holiday',
    variant: 'secondary',
    icon: Calendar,
    description: 'Public holiday'
  },
  leave: {
    label: 'On Leave',
    variant: 'secondary',
    icon: Palmtree,
    description: 'Approved leave'
  }
};

export function AttendanceStatusBadge({
  status,
  isOvernightShift = false,
  missingCheckOut = false,
  className,
  showTooltip = true
}: AttendanceStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.present;
  const Icon = config.icon;
  
  const getBadgeVariant = () => {
    if (config.variant === 'success') return 'default';
    if (config.variant === 'warning') return 'secondary';
    return config.variant;
  };
  
  const badgeContent = (
    <Badge 
      variant={getBadgeVariant()}
      className={cn(
        "gap-1 px-2 py-0.5",
        config.variant === 'success' && "bg-success text-success-foreground hover:bg-success/80",
        config.variant === 'warning' && "bg-warning text-warning-foreground hover:bg-warning/80",
        missingCheckOut && "ring-2 ring-warning ring-offset-1",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
      {isOvernightShift && (
        <Moon className="h-3 w-3 ml-0.5" />
      )}
    </Badge>
  );
  
  if (!showTooltip) return badgeContent;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            {isOvernightShift && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Moon className="h-3 w-3" />
                Overnight shift (check-out is next day)
              </p>
            )}
            {missingCheckOut && (
              <p className="text-xs text-warning flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Missing check-out time
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default AttendanceStatusBadge;
