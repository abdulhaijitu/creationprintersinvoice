import React, { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
 * Parses a time string and returns { hours, minutes } or null if invalid/incomplete
 */
function parseTimeValue(value: string): { hours: number; minutes: number } | null {
  if (!value) return null;
  
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  
  return { hours, minutes };
}

/**
 * Formats hours and minutes to HH:mm format
 */
function formatTime(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Formats time for AM/PM display
 */
function formatTimeForDisplay(time: string): string {
  const parsed = parseTimeValue(time);
  if (!parsed) return '';
  
  const { hours, minutes } = parsed;
  const period = hours >= 12 ? 'PM' : 'AM';
  let displayHours = hours;
  
  if (hours === 0) {
    displayHours = 12;
  } else if (hours > 12) {
    displayHours = hours - 12;
  }
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Checks if a partial time string is a valid in-progress input
 * Allows: "", "1", "11", "11:", "11:3", "11:30"
 */
function isValidPartialTime(value: string): boolean {
  if (!value) return true;
  
  // Allow partial hour entry (1-2 digits)
  if (/^\d{1,2}$/.test(value)) return true;
  
  // Allow hour with colon
  if (/^\d{1,2}:$/.test(value)) return true;
  
  // Allow hour with partial minutes
  if (/^\d{1,2}:\d{1}$/.test(value)) return true;
  
  // Allow complete time
  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(':').map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }
  
  return false;
}

/**
 * Determines which segment is focused based on cursor position
 * Returns 'hours' or 'minutes'
 */
function getFocusedSegment(value: string, cursorPos: number): 'hours' | 'minutes' {
  const colonIndex = value.indexOf(':');
  if (colonIndex === -1) return 'hours';
  return cursorPos <= colonIndex ? 'hours' : 'minutes';
}

/**
 * A controlled time input component that:
 * - Preserves partial input values during typing
 * - Handles arrow keys to increment/decrement focused segment
 * - Only validates on blur, not during typing
 * - Never resets input unexpectedly
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
    placeholder = "HH:MM",
    showPreview = true,
  }, ref) => {
    const [localValue, setLocalValue] = useState('');
    const [lastValidValue, setLastValidValue] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Merge forwarded ref with internal ref
    React.useImperativeHandle(ref, () => inputRef.current!);
    
    // Sync local value with prop value on mount and prop changes
    useEffect(() => {
      if (value !== localValue) {
        setLocalValue(value || '');
        if (parseTimeValue(value)) {
          setLastValidValue(value);
        }
      }
    }, [value]);
    
    /**
     * Handle keyboard events for arrow key increment/decrement
     */
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      
      const input = e.currentTarget;
      const cursorPos = input.selectionStart ?? 0;
      const currentValue = localValue;
      
      // Only handle arrow keys on complete time values
      const parsed = parseTimeValue(currentValue);
      if (!parsed) {
        // For partial values, prevent default arrow behavior to avoid reset
        e.preventDefault();
        return;
      }
      
      e.preventDefault();
      
      const segment = getFocusedSegment(currentValue, cursorPos);
      let { hours, minutes } = parsed;
      const delta = e.key === 'ArrowUp' ? 1 : -1;
      
      if (segment === 'hours') {
        hours = (hours + delta + 24) % 24;
      } else {
        minutes = (minutes + delta + 60) % 60;
      }
      
      const newValue = formatTime(hours, minutes);
      setLocalValue(newValue);
      setLastValidValue(newValue);
      onChange(newValue);
      
      // Restore cursor position after state update
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(cursorPos, cursorPos);
        }
      });
    }, [localValue, onChange]);
    
    /**
     * Handle input change - preserve partial values
     */
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      
      // Clear error while typing
      if (localError) {
        setLocalError(null);
      }
      
      // Allow empty value
      if (!newValue) {
        setLocalValue('');
        onChange('');
        return;
      }
      
      // Check if the value is a valid partial or complete time
      if (isValidPartialTime(newValue)) {
        setLocalValue(newValue);
        
        // Only propagate complete, valid times
        if (parseTimeValue(newValue)) {
          // Normalize to HH:mm format
          const [h, m] = newValue.split(':');
          const normalized = `${h.padStart(2, '0')}:${m}`;
          setLastValidValue(normalized);
          onChange(normalized);
        }
      }
      // If invalid partial, don't update (ignore the keystroke)
    }, [localError, onChange]);
    
    /**
     * Handle blur - normalize or revert to last valid value
     */
    const handleBlur = useCallback(() => {
      if (!localValue) {
        // Empty is acceptable
        setLocalError(null);
        onChange('');
        onBlur?.();
        return;
      }
      
      const parsed = parseTimeValue(localValue);
      
      if (parsed) {
        // Valid complete time - normalize it
        const normalized = formatTime(parsed.hours, parsed.minutes);
        setLocalValue(normalized);
        setLastValidValue(normalized);
        setLocalError(null);
        onChange(normalized);
      } else if (lastValidValue) {
        // Invalid/incomplete - revert to last valid value
        setLocalValue(lastValidValue);
        setLocalError(null);
        onChange(lastValidValue);
      } else {
        // No valid value to revert to - show error
        setLocalError('Invalid time format (use HH:MM)');
      }
      
      onBlur?.();
    }, [localValue, lastValidValue, onChange, onBlur]);
    
    const displayError = error || localError;
    const parsedForPreview = parseTimeValue(localValue);
    const displayPreview = showPreview && parsedForPreview && !displayError;
    
    return (
      <div className={cn("space-y-1", className)}>
        {label && (
          <Label className={cn(displayError && "text-destructive")}>
            {label}
          </Label>
        )}
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={localValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            maxLength={5}
            className={cn(
              "w-full font-mono",
              displayError && "border-destructive focus-visible:ring-destructive"
            )}
          />
          {displayPreview && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
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
