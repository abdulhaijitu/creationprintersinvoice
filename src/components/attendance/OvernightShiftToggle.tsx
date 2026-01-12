import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Moon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface OvernightShiftToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  showWarning?: boolean;
  className?: string;
}

export function OvernightShiftToggle({
  checked,
  onCheckedChange,
  disabled = false,
  showWarning = false,
  className
}: OvernightShiftToggleProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-2 p-2 rounded-md transition-colors",
              checked && "bg-primary/10",
              showWarning && !checked && "ring-2 ring-warning ring-offset-1"
            )}>
              <Switch
                id="overnight-shift"
                checked={checked}
                onCheckedChange={onCheckedChange}
                disabled={disabled}
              />
              <Label 
                htmlFor="overnight-shift" 
                className={cn(
                  "flex items-center gap-1.5 cursor-pointer text-sm",
                  disabled && "cursor-not-allowed opacity-50"
                )}
              >
                <Moon className={cn(
                  "h-4 w-4 transition-colors",
                  checked ? "text-primary" : "text-muted-foreground"
                )} />
                Overnight
              </Label>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">Overnight Shift</p>
              <p className="text-xs text-muted-foreground">
                Enable this when check-out time is on the next day.
                For example: Check-in at 19:30, Check-out at 03:30.
              </p>
              {showWarning && (
                <p className="text-xs text-warning mt-1">
                  ⚠️ Check-out appears to be before check-in. 
                  Enable this toggle for overnight shifts.
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export default OvernightShiftToggle;
