/**
 * Time Utilities for Attendance System
 * 
 * GLOBAL STANDARD:
 * - Internal storage: ISO 8601 format with 24-hour time (YYYY-MM-DDTHH:mm:ss)
 * - UI display: Localized AM/PM format
 * - All time operations use consistent business timezone
 */

// Business timezone - can be configured per organization in the future
export const BUSINESS_TIMEZONE = 'Asia/Dhaka';

// Business hours configuration
export const BUSINESS_HOURS = {
  startHour: 6,  // 6:00 AM - earliest valid check-in
  endHour: 23,   // 11:00 PM - latest valid check-out
};

/**
 * Validates if a time string is in valid 24-hour format (HH:mm)
 */
export function isValid24HourTime(time: string): boolean {
  if (!time || typeof time !== 'string') return false;
  
  const pattern = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return pattern.test(time);
}

/**
 * Validates if a time is within business hours
 */
export function isWithinBusinessHours(time: string): boolean {
  if (!isValid24HourTime(time)) return false;
  
  const [hours] = time.split(':').map(Number);
  return hours >= BUSINESS_HOURS.startHour && hours <= BUSINESS_HOURS.endHour;
}

/**
 * Normalizes any time string to 24-hour format (HH:mm)
 * Handles various input formats including AM/PM
 */
export function normalizeToTime24(input: string | null | undefined): string | null {
  if (!input || input.trim() === '') return null;
  
  const trimmed = input.trim();
  
  // Already in 24-hour format (HH:mm)
  if (/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/.test(trimmed)) {
    // Ensure two-digit hour
    const [h, m] = trimmed.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }
  
  // Handle AM/PM format (e.g., "9:30 AM", "11:44 AM", "5:30 PM")
  const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const period = ampmMatch[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  
  // Handle ISO datetime string (e.g., "2024-01-12T09:30:00")
  if (trimmed.includes('T')) {
    try {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Formats a 24-hour time (HH:mm) to 12-hour AM/PM format for display
 */
export function formatTimeForDisplay(time: string | null | undefined): string {
  if (!time) return '-';
  
  const normalized = normalizeToTime24(time);
  if (!normalized) return '-';
  
  const [hoursStr, minutesStr] = normalized.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = minutesStr;
  
  const period = hours >= 12 ? 'PM' : 'AM';
  
  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours -= 12;
  }
  
  return `${hours}:${minutes} ${period}`;
}

/**
 * Formats an ISO datetime string to 12-hour AM/PM format for display
 */
export function formatDateTimeForDisplay(dateTimeStr: string | null | undefined): string {
  if (!dateTimeStr) return '-';
  
  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return '-';
    
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    
    return `${displayHours}:${minutes} ${period}`;
  } catch {
    return '-';
  }
}

/**
 * Extracts time in 24-hour format from an ISO datetime string
 * For use in time input fields
 */
export function extractTimeFromDateTime(dateTimeStr: string | null | undefined): string {
  if (!dateTimeStr) return '';
  
  try {
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return '';
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
}

/**
 * Combines a date (YYYY-MM-DD) and time (HH:mm) into an ISO datetime string
 * This is used for storage
 */
export function combineDateTime(date: string, time: string): string | null {
  if (!date || !time) return null;
  
  const normalizedTime = normalizeToTime24(time);
  if (!normalizedTime) return null;
  
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  
  return `${date}T${normalizedTime}:00`;
}

/**
 * Validates check-in and check-out times
 * Returns an error message if invalid, or null if valid
 */
export function validateAttendanceTimes(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined
): { checkInError: string | null; checkOutError: string | null } {
  const errors = {
    checkInError: null as string | null,
    checkOutError: null as string | null,
  };
  
  // Validate check-in
  if (checkIn) {
    const normalizedCheckIn = normalizeToTime24(checkIn);
    if (!normalizedCheckIn) {
      errors.checkInError = 'Invalid time format';
    } else if (!isWithinBusinessHours(normalizedCheckIn)) {
      errors.checkInError = 'Time must be between 6:00 AM and 11:00 PM';
    }
  }
  
  // Validate check-out
  if (checkOut) {
    const normalizedCheckOut = normalizeToTime24(checkOut);
    if (!normalizedCheckOut) {
      errors.checkOutError = 'Invalid time format';
    } else if (!isWithinBusinessHours(normalizedCheckOut)) {
      errors.checkOutError = 'Time must be between 6:00 AM and 11:00 PM';
    }
  }
  
  // Validate check-out is after check-in
  if (checkIn && checkOut && !errors.checkInError && !errors.checkOutError) {
    const normalizedCheckIn = normalizeToTime24(checkIn)!;
    const normalizedCheckOut = normalizeToTime24(checkOut)!;
    
    const [inH, inM] = normalizedCheckIn.split(':').map(Number);
    const [outH, outM] = normalizedCheckOut.split(':').map(Number);
    
    const checkInMinutes = inH * 60 + inM;
    const checkOutMinutes = outH * 60 + outM;
    
    if (checkOutMinutes <= checkInMinutes) {
      errors.checkOutError = 'Check-out must be after check-in';
    }
  }
  
  return errors;
}

/**
 * Detects if a stored time value is in legacy format (AM/PM string or invalid)
 * and normalizes it
 */
export function normalizeLegacyTime(storedValue: string | null | undefined): string | null {
  if (!storedValue) return null;
  
  // Try to extract time from various formats
  const normalized = normalizeToTime24(storedValue);
  
  if (normalized) {
    return normalized;
  }
  
  // If it's an ISO string, extract time
  if (storedValue.includes('T')) {
    return extractTimeFromDateTime(storedValue);
  }
  
  return null;
}

/**
 * Creates a proper ISO timestamp for storage from date and time components
 */
export function createAttendanceTimestamp(date: string, time: string): string | null {
  const normalized = normalizeToTime24(time);
  if (!normalized || !date) return null;
  
  return `${date}T${normalized}:00`;
}
