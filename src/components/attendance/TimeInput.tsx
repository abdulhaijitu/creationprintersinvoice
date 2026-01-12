import React, { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { normalizeToTime24, formatTimeForDisplay, isValid24HourTime, isWithinBusinessHours } from "@/lib/timeUtils";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  label?: string;
  error?: string | null;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  validateOnChange?: boolean;
  showPreview?: boolean;
}

/**
 * A controlled time input component that:
 * - Uses native time picker (24-hour input)
 * - Normalizes all input to HH:mm format
 * - Validates time on blur
 * - Shows formatted preview (AM/PM)
 */
export const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ 
    value, 
    onChange, 
    onBlur,
    label, 
    error, 
    disabled = false,
    className,
    placeholder,
    validateOnChange = false,
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
      
      if (!isWithinBusinessHours(time)) {
        return 'Time must be between 6:00 AM and 11:00 PM';
      }
      
      return null;
    }, []);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      
      // Clear error when user is typing
      if (localError) {
        setLocalError(null);
      }
      
      // Validate on change if enabled
      if (validateOnChange && newValue) {
        const validationError = validateTime(newValue);
        setLocalError(validationError);
        
        if (!validationError) {
          onChange(newValue);
        }
      } else {
        // Always propagate normalized value
        onChange(newValue);
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
    const displayPreview = showPreview && localValue && !displayError;
    
    return (
      <div className={cn("space-y-1", className)}>
        {label && (
          <Label className={cn(displayError && "text-destructive")}>
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
              "w-full",
              displayError && "border-destructive focus-visible:ring-destructive"
            )}
          />
          {displayPreview && (
            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
              {formatTimeForDisplay(localValue)}
            </span>
          )}
        </div>
        {displayError && (
          <p className="text-xs text-destructive">{displayError}</p>
        )}
      </div>
    );
  }
);

TimeInput.displayName = "TimeInput";

export default TimeInput;
