/**
 * Attendance Validation & Time Utilities
 * 
 * GLOBAL STANDARDS:
 * - Internal storage: 24-hour ISO format (YYYY-MM-DDTHH:mm:ss)
 * - UI display: AM/PM format for user preference
 * - Overnight shifts explicitly flagged
 * - Auto-calculated status based on office hours
 */

import { BUSINESS_HOURS, normalizeToTime24, isValid24HourTime } from './timeUtils';

export interface AttendanceSettings {
  office_start_time: string; // HH:mm format
  office_end_time: string;
  late_threshold_minutes: number;
  half_day_threshold_hours: number;
}

export interface TimeValidationResult {
  isValid: boolean;
  checkInError: string | null;
  checkOutError: string | null;
  requiresOvernightFlag: boolean;
}

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  office_start_time: '09:00',
  office_end_time: '18:00',
  late_threshold_minutes: 15,
  half_day_threshold_hours: 4,
};

/**
 * Parse time string to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const normalized = normalizeToTime24(time);
  if (!normalized) return -1;
  
  const [hours, minutes] = normalized.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Calculate the duration between check-in and check-out in minutes
 * Handles overnight shifts correctly when flagged
 */
export function calculateDuration(
  checkIn: string,
  checkOut: string,
  isOvernightShift: boolean = false
): number {
  const checkInMinutes = timeToMinutes(checkIn);
  const checkOutMinutes = timeToMinutes(checkOut);
  
  if (checkInMinutes < 0 || checkOutMinutes < 0) return 0;
  
  if (isOvernightShift) {
    // For overnight shifts, check-out is next day
    return (24 * 60 - checkInMinutes) + checkOutMinutes;
  }
  
  return checkOutMinutes - checkInMinutes;
}

/**
 * Validate attendance times with overnight shift detection
 */
export function validateAttendanceTimesEnhanced(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined,
  isOvernightShift: boolean = false
): TimeValidationResult {
  const result: TimeValidationResult = {
    isValid: true,
    checkInError: null,
    checkOutError: null,
    requiresOvernightFlag: false,
  };
  
  // Validate check-in format
  if (checkIn) {
    const normalizedCheckIn = normalizeToTime24(checkIn);
    if (!normalizedCheckIn) {
      result.isValid = false;
      result.checkInError = 'Invalid time format';
      return result;
    }
    
    if (!isValid24HourTime(normalizedCheckIn)) {
      result.isValid = false;
      result.checkInError = 'Invalid time format';
      return result;
    }
    
    const checkInHour = parseInt(normalizedCheckIn.split(':')[0], 10);
    if (checkInHour < BUSINESS_HOURS.startHour) {
      result.isValid = false;
      result.checkInError = `Check-in cannot be before ${BUSINESS_HOURS.startHour}:00 AM`;
      return result;
    }
  }
  
  // Validate check-out format
  if (checkOut) {
    const normalizedCheckOut = normalizeToTime24(checkOut);
    if (!normalizedCheckOut) {
      result.isValid = false;
      result.checkOutError = 'Invalid time format';
      return result;
    }
    
    if (!isValid24HourTime(normalizedCheckOut)) {
      result.isValid = false;
      result.checkOutError = 'Invalid time format';
      return result;
    }
  }
  
  // Validate check-out is after check-in
  if (checkIn && checkOut) {
    const checkInMinutes = timeToMinutes(checkIn);
    const checkOutMinutes = timeToMinutes(checkOut);
    
    if (checkInMinutes >= 0 && checkOutMinutes >= 0) {
      if (checkOutMinutes <= checkInMinutes) {
        // Check-out is earlier than check-in - might be overnight
        if (!isOvernightShift) {
          result.requiresOvernightFlag = true;
          result.isValid = false;
          result.checkOutError = 'Check-out is before check-in. Enable overnight shift for next-day check-out.';
        }
      }
    }
  }
  
  return result;
}

/**
 * Auto-calculate attendance status based on check-in time and settings
 */
export function calculateAttendanceStatus(
  checkIn: string | null | undefined,
  settings: AttendanceSettings = DEFAULT_ATTENDANCE_SETTINGS
): 'present' | 'late' | 'absent' | 'half_day' {
  if (!checkIn) return 'absent';
  
  const normalizedCheckIn = normalizeToTime24(checkIn);
  if (!normalizedCheckIn) return 'absent';
  
  const checkInMinutes = timeToMinutes(normalizedCheckIn);
  const officeStartMinutes = timeToMinutes(settings.office_start_time);
  const lateThreshold = officeStartMinutes + settings.late_threshold_minutes;
  
  if (checkInMinutes <= officeStartMinutes) {
    return 'present';
  } else if (checkInMinutes <= lateThreshold) {
    return 'present'; // Within grace period
  } else {
    return 'late';
  }
}

/**
 * Check if a time change should trigger overnight shift warning
 */
export function detectOvernightScenario(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined
): boolean {
  if (!checkIn || !checkOut) return false;
  
  const checkInMinutes = timeToMinutes(checkIn);
  const checkOutMinutes = timeToMinutes(checkOut);
  
  if (checkInMinutes < 0 || checkOutMinutes < 0) return false;
  
  // If check-out is before check-in, it's an overnight scenario
  return checkOutMinutes < checkInMinutes;
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '-';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Combine date and time for storage, handling overnight shifts
 */
export function combineAttendanceDateTime(
  date: string,
  time: string,
  isCheckOut: boolean = false,
  isOvernightShift: boolean = false
): string | null {
  if (!date || !time) return null;
  
  const normalizedTime = normalizeToTime24(time);
  if (!normalizedTime) return null;
  
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  
  let useDate = date;
  
  // For overnight shifts, check-out is on the next day
  if (isCheckOut && isOvernightShift) {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    useDate = nextDate.toISOString().split('T')[0];
  }
  
  return `${useDate}T${normalizedTime}:00`;
}

/**
 * Validate that times are not in the future (beyond end of current day)
 */
export function validateNotFuture(time: string, date: string): string | null {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Only validate if the date is today
  if (date !== today) return null;
  
  const normalizedTime = normalizeToTime24(time);
  if (!normalizedTime) return null;
  
  const [hours, minutes] = normalizedTime.split(':').map(Number);
  const timeMinutes = hours * 60 + minutes;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  if (timeMinutes > currentMinutes + 5) { // 5 minute buffer
    return 'Time cannot be in the future';
  }
  
  return null;
}
