import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Clock, AlertCircle } from "lucide-react";
import { normalizeToTime24, formatTimeForDisplay, isValid24HourTime } from "@/lib/timeUtils";
import { validateNotFuture } from "@/lib/attendanceValidation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EnhancedTimeInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  label?: string;
  error?: string | null;
  warning?: string | null;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  date?: string; // For future time validation
  validateFuture?: boolean;
  showPreview?: boolean;
}

/**
 * Enhanced time input component with:
 * - Native 24-hour time picker
 * - AM/PM display preview
 * - Future time validation
 * - Error and warning states
 */
export const EnhancedTimeInput = React.forwardRef<HTMLInputElement, EnhancedTimeInputProps>(
  ({
    value,
    onChange,
    onBlur,
    label,
    error,
    warning,
    disabled = false,
    className,
    placeholder,
    date,
    validateFuture = false,
    showPreview = true,
  }, ref) => {
    const [localValue, setLocalValue] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    
    // Sync local value with prop value
    useEffect(() => {
      const normalized = normalizeToTime24(value);
      setLocalValue(normalized || '');
    }, [value]);
    
    const validateTime = useCallback((time: string): string | null => {
      if (!time) return null;
      
      if (!isValid24HourTime(time)) {
        return 'Invalid time format';
      }
      
      // Validate not future if enabled
      if (validateFuture && date) {
        const futureError = validateNotFuture(time, date);
        if (futureError) return futureError;
      }
      
      return null;
    }, [validateFuture, date]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      
      // Clear error when user is typing
      if (localError) {
        setLocalError(null);
      }
      
      // Validate and propagate
      if (newValue) {
        const validationError = validateTime(newValue);
        if (!validationError) {
          onChange(newValue);
        } else {
          setLocalError(validationError);
        }
      } else {
        onChange('');
      }
    };
    
    const handleBlur = () => {
      if (localValue) {
        const normalized = normalizeToTime24(localValue);
        
        if (normalized) {
          const validationError = validateTime(normalized);
          setLocalError(validationError);
          
          if (!validationError) {
            onChange(normalized);
          }
        } else {
          setLocalError('Invalid time format');
        }
      } else {
        setLocalError(null);
        onChange('');
      }
      
      onBlur?.();
    };
    
    const displayError = error || localError;
    const hasIssue = !!displayError || !!warning;
    const displayPreview = showPreview && localValue && !displayError;
    
    return (
      <div className={cn("space-y-1", className)}>
        {label && (
          <Label className={cn(
            displayError && "text-destructive",
            warning && !displayError && "text-warning"
          )}>
            {label}
          </Label>
        )}
        <div className="relative">
          <Input
            ref={ref}
            type="time"
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
              "w-full pr-16",
              displayError && "border-destructive focus-visible:ring-destructive",
              warning && !displayError && "border-warning focus-visible:ring-warning"
            )}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {displayPreview && (
              <span className="text-xs text-muted-foreground">
                {formatTimeForDisplay(localValue)}
              </span>
            )}
            {hasIssue && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle className={cn(
                      "h-4 w-4",
                      displayError ? "text-destructive" : "text-warning"
                    )} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{displayError || warning}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        {displayError && (
          <p className="text-xs text-destructive">{displayError}</p>
        )}
        {warning && !displayError && (
          <p className="text-xs text-warning">{warning}</p>
        )}
      </div>
    );
  }
);

EnhancedTimeInput.displayName = "EnhancedTimeInput";

export default EnhancedTimeInput;
