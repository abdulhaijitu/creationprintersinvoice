import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { normalizeToTime24 } from "@/lib/timeUtils";
import { Clock } from "lucide-react";

type Meridiem = "AM" | "PM";

interface TimeInputProps {
  /**
   * Canonical time value in 24h format (HH:mm). Empty string allowed.
   */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;

  label?: string;
  error?: string | null;
  warning?: string | null;
  disabled?: boolean;

  /** Wrapper className */
  className?: string;
  /** Input element className */
  inputClassName?: string;

  placeholder?: string;

  /** Show AM/PM toggle next to input */
  showMeridiemToggle?: boolean;
  /** Show hour/minute picker popover */
  showPicker?: boolean;

  /** Show inline error/warning text under input */
  showErrorText?: boolean;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => i);

function parse24(value24: string): { hours: number; minutes: number } | null {
  const match = value24.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

function from24To12(value24: string): { hours12: number; minutes: number; meridiem: Meridiem } | null {
  const parsed = parse24(value24);
  if (!parsed) return null;

  const meridiem: Meridiem = parsed.hours >= 12 ? "PM" : "AM";
  const rawHours12 = parsed.hours % 12;
  const hours12 = rawHours12 === 0 ? 12 : rawHours12;

  return { hours12, minutes: parsed.minutes, meridiem };
}

function to24From12(hours12: number, minutes: number, meridiem: Meridiem): string {
  let hours = hours12 % 12;
  if (meridiem === "PM") hours += 12;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Partial input allowance:
 * - ""
 * - "1", "11"
 * - "11:"
 * - "11:3"
 * - "11:30"
 */
function isValidPartialClockText(value: string): boolean {
  if (!value) return true;

  // hours only
  if (/^\d{1,2}$/.test(value)) return true;

  // hours + colon
  if (/^\d{1,2}:$/.test(value)) return true;

  // hours + 1 minute digit
  if (/^\d{1,2}:\d{1}$/.test(value)) return true;

  // full
  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const [hStr, mStr] = value.split(":");
    const h = Number(hStr);
    const m = Number(mStr);
    return h >= 1 && h <= 12 && m >= 0 && m <= 59;
  }

  return false;
}

function parseClockText(value: string): { hours12: number; minutes: number } | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours12 = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours12 < 1 || hours12 > 12) return null;
  if (minutes < 0 || minutes > 59) return null;

  return { hours12, minutes };
}

function getFocusedSegment(value: string, cursorPos: number): "hours" | "minutes" {
  const colonIndex = value.indexOf(":");
  if (colonIndex === -1) return "hours";
  return cursorPos <= colonIndex ? "hours" : "minutes";
}

export const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  (
    {
      value,
      onChange,
      onBlur,
      label,
      error,
      warning,
      disabled = false,
      className,
      inputClassName,
      placeholder = "HH:MM",
      showMeridiemToggle = true,
      showPicker = true,
      showErrorText = true,
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => inputRef.current!);

    const [localText, setLocalText] = useState<string>("");
    const [meridiem, setMeridiem] = useState<Meridiem>("AM");
    const [lastValid24, setLastValid24] = useState<string>("");
    const [localError, setLocalError] = useState<string | null>(null);

    const toggleDebounceRef = useRef<number | null>(null);

    const normalizedProp24 = useMemo(() => normalizeToTime24(value) ?? "", [value]);

    // Sync from prop -> local display state
    useEffect(() => {
      const next24 = normalizedProp24;
      if (!next24) {
        setLocalText("");
        setLocalError(null);
        setLastValid24("");
        return;
      }

      const as12 = from24To12(next24);
      if (!as12) return;

      setLastValid24(next24);
      setMeridiem(as12.meridiem);
      setLocalText(`${as12.hours12.toString().padStart(2, "0")}:${as12.minutes.toString().padStart(2, "0")}`);
      setLocalError(null);
    }, [normalizedProp24]);

    const commit24 = useCallback(
      (next24: string, options?: { debounce?: boolean }) => {
        setLastValid24(next24);

        if (options?.debounce) {
          if (toggleDebounceRef.current) {
            window.clearTimeout(toggleDebounceRef.current);
          }
          toggleDebounceRef.current = window.setTimeout(() => {
            onChange(next24);
          }, 120);
          return;
        }

        onChange(next24);
      },
      [onChange]
    );

    const handleSetMeridiem = useCallback(
      (next: Meridiem) => {
        if (next === meridiem) return;

        setMeridiem(next);

        const parsed = parseClockText(localText);
        if (parsed) {
          const next24 = to24From12(parsed.hours12, parsed.minutes, next);
          commit24(next24, { debounce: true });
        } else if (lastValid24) {
          // Keep the visible text unchanged for partial input; just flip the underlying value when we can
          const as12 = from24To12(lastValid24);
          if (as12) {
            const next24 = to24From12(as12.hours12, as12.minutes, next);
            commit24(next24, { debounce: true });
          }
        }
      },
      [commit24, lastValid24, localText, meridiem]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Safe keyboard toggle for AM/PM
        if (e.key === "a" || e.key === "A") {
          e.preventDefault();
          handleSetMeridiem("AM");
          return;
        }
        if (e.key === "p" || e.key === "P") {
          e.preventDefault();
          handleSetMeridiem("PM");
          return;
        }

        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;

        const cursorPos = e.currentTarget.selectionStart ?? 0;
        const current = localText;

        // Prevent native arrow behavior ALWAYS (never allow reset)
        e.preventDefault();

        const parsed = parseClockText(current);
        if (!parsed) {
          // Partial input: do nothing, but never clear
          return;
        }

        const segment = getFocusedSegment(current, cursorPos);
        const delta = e.key === "ArrowUp" ? 1 : -1;

        const oldColon = current.indexOf(":");

        let nextHours12 = parsed.hours12;
        let nextMinutes = parsed.minutes;

        if (segment === "hours") {
          nextHours12 = ((nextHours12 - 1 + delta + 12) % 12) + 1;
        } else {
          nextMinutes = (nextMinutes + delta + 60) % 60;
        }

        const nextText = `${nextHours12}:${nextMinutes.toString().padStart(2, "0")}`;
        const next24 = to24From12(nextHours12, nextMinutes, meridiem);

        setLocalText(nextText);
        setLocalError(null);
        commit24(next24);

        // Keep cursor stable even if colon index shifts (e.g., 9:30 -> 10:30)
        requestAnimationFrame(() => {
          if (!inputRef.current) return;
          const newColon = nextText.indexOf(":");
          const shift = newColon - oldColon;
          const nextCursor = cursorPos > oldColon ? cursorPos + shift : cursorPos;
          inputRef.current.setSelectionRange(nextCursor, nextCursor);
        });
      },
      [commit24, handleSetMeridiem, localText, meridiem]
    );

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value;

        if (localError) setLocalError(null);

        if (!next) {
          setLocalText("");
          commit24("");
          return;
        }

        if (!isValidPartialClockText(next)) {
          return; // ignore invalid keystroke
        }

        setLocalText(next);

        // Commit ONLY when full hh:mm exists
        const parsed = parseClockText(next);
        if (parsed) {
          const next24 = to24From12(parsed.hours12, parsed.minutes, meridiem);
          commit24(next24);
        }
      },
      [commit24, localError, meridiem]
    );

    const handleBlur = useCallback(() => {
      if (!localText) {
        setLocalError(null);
        commit24("");
        onBlur?.();
        return;
      }

      const parsed = parseClockText(localText);
      if (parsed) {
        // Normalize (pad zeros) on blur
        const normalizedText = `${parsed.hours12.toString().padStart(2, "0")}:${parsed.minutes.toString().padStart(2, "0")}`;
        setLocalText(normalizedText);
        setLocalError(null);

        const next24 = to24From12(parsed.hours12, parsed.minutes, meridiem);
        commit24(next24);
        onBlur?.();
        return;
      }

      // Incomplete/invalid: revert to last valid (never leave blank unintentionally)
      if (lastValid24) {
        const as12 = from24To12(lastValid24);
        if (as12) {
          setMeridiem(as12.meridiem);
          setLocalText(`${as12.hours12.toString().padStart(2, "0")}:${as12.minutes.toString().padStart(2, "0")}`);
          setLocalError(null);
          commit24(lastValid24);
          onBlur?.();
          return;
        }
      }

      setLocalError("Invalid time format");
      onBlur?.();
    }, [commit24, lastValid24, localText, meridiem, onBlur]);

    const displayError = error || localError;
    const hasWarning = !!warning && !displayError;

    const selectedClock = useMemo(() => {
      const parsed = parseClockText(localText);
      if (parsed) return parsed;
      if (lastValid24) {
        const as12 = from24To12(lastValid24);
        if (as12) return { hours12: as12.hours12, minutes: as12.minutes };
      }
      return { hours12: 12, minutes: 0 };
    }, [lastValid24, localText]);

    const pickHours = useCallback(
      (hours12: number) => {
        const nextText = `${hours12}:${selectedClock.minutes.toString().padStart(2, "0")}`;
        setLocalText(nextText);
        setLocalError(null);
        const next24 = to24From12(hours12, selectedClock.minutes, meridiem);
        commit24(next24);
      },
      [commit24, meridiem, selectedClock.minutes]
    );

    const pickMinutes = useCallback(
      (minutes: number) => {
        const nextText = `${selectedClock.hours12}:${minutes.toString().padStart(2, "0")}`;
        setLocalText(nextText);
        setLocalError(null);
        const next24 = to24From12(selectedClock.hours12, minutes, meridiem);
        commit24(next24);
      },
      [commit24, meridiem, selectedClock.hours12]
    );

    return (
      <div className={cn("space-y-1", className)}>
        {label && (
          <Label
            className={cn(
              displayError && "text-destructive",
              hasWarning && "text-warning"
            )}
          >
            {label}
          </Label>
        )}

        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={localText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            maxLength={5}
            className={cn(
              "w-full font-mono pr-24",
              displayError && "border-destructive focus-visible:ring-destructive",
              hasWarning && "border-warning focus-visible:ring-warning",
              inputClassName
            )}
            aria-invalid={!!displayError}
          />

          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {showPicker && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={disabled}
                    aria-label="Pick time"
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[280px] p-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground px-2">Hour</div>
                      <ScrollArea className="h-40">
                        <div className="space-y-1 pr-2">
                          {HOURS_12.map((h) => {
                            const selected = h === selectedClock.hours12;
                            return (
                              <Button
                                key={h}
                                type="button"
                                variant={selected ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => pickHours(h)}
                                disabled={disabled}
                              >
                                {h.toString().padStart(2, "0")}
                              </Button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground px-2">Minute</div>
                      <ScrollArea className="h-40">
                        <div className="space-y-1 pr-2">
                          {MINUTES_60.map((m) => {
                            const selected = m === selectedClock.minutes;
                            return (
                              <Button
                                key={m}
                                type="button"
                                variant={selected ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                onClick={() => pickMinutes(m)}
                                disabled={disabled}
                              >
                                {m.toString().padStart(2, "0")}
                              </Button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground px-2">AM/PM</div>
                      <div className="space-y-1">
                        <Button
                          type="button"
                          variant={meridiem === "AM" ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => handleSetMeridiem("AM")}
                          disabled={disabled}
                        >
                          AM
                        </Button>
                        <Button
                          type="button"
                          variant={meridiem === "PM" ? "secondary" : "ghost"}
                          className="w-full justify-start"
                          onClick={() => handleSetMeridiem("PM")}
                          disabled={disabled}
                        >
                          PM
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {showMeridiemToggle && (
              <div className="flex items-center rounded-md border bg-background">
                <Button
                  type="button"
                  variant={meridiem === "AM" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => handleSetMeridiem("AM")}
                  disabled={disabled}
                >
                  AM
                </Button>
                <Button
                  type="button"
                  variant={meridiem === "PM" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => handleSetMeridiem("PM")}
                  disabled={disabled}
                >
                  PM
                </Button>
              </div>
            )}
          </div>
        </div>

        {showErrorText && displayError && (
          <p className="text-xs text-destructive">{displayError}</p>
        )}
        {showErrorText && hasWarning && (
          <p className="text-xs text-warning">{warning}</p>
        )}
      </div>
    );
  }
);

TimeInput.displayName = "TimeInput";

export default TimeInput;

