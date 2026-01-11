import { z } from 'zod';

/**
 * Safely parses a string to a float with validation
 * @param value - The string value to parse
 * @param fieldName - The field name for error messages
 * @param min - Minimum allowed value (default: 0)
 * @param max - Maximum allowed value (default: 100,000,000)
 * @returns The parsed number
 * @throws Error if validation fails
 */
export function parseValidatedFloat(
  value: string | undefined | null,
  fieldName: string,
  min = 0,
  max = 100000000
): number {
  if (!value || value.trim() === '') {
    return 0;
  }

  const parsed = parseFloat(value);

  if (isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (parsed < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }

  if (parsed > max) {
    throw new Error(`${fieldName} must be at most ${max.toLocaleString()}`);
  }

  return parsed;
}

/**
 * Safely parses a string to a float, returning a default value on failure
 * @param value - The string value to parse
 * @param defaultValue - The default value if parsing fails
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns The parsed number or default value
 */
export function safeParseFloat(
  value: string | undefined | null,
  defaultValue = 0,
  min = 0,
  max = 100000000
): number {
  if (!value || value.trim() === '') {
    return defaultValue;
  }

  const parsed = parseFloat(value);

  if (isNaN(parsed)) {
    return defaultValue;
  }

  if (parsed < min) {
    return min;
  }

  if (parsed > max) {
    return max;
  }

  return parsed;
}

/**
 * Validates that a numeric value is within acceptable range
 * @param value - The number to validate
 * @param fieldName - The field name for error messages
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns true if valid
 * @throws Error if validation fails
 */
export function validateNumericRange(
  value: number,
  fieldName: string,
  min = 0,
  max = 100000000
): boolean {
  if (isNaN(value)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  if (value < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }

  if (value > max) {
    throw new Error(`${fieldName} must be at most ${max.toLocaleString()}`);
  }

  return true;
}

// Common validation schemas using Zod
export const employeeFormSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  phone: z.string().max(20, 'Phone must be less than 20 characters').optional().or(z.literal('')),
  email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  designation: z.string().max(100).optional().or(z.literal('')),
  department: z.string().max(100).optional().or(z.literal('')),
  joining_date: z.string().optional().or(z.literal('')),
  basic_salary: z.number().min(0, 'Salary cannot be negative').max(100000000, 'Salary exceeds maximum'),
  address: z.string().max(500).optional().or(z.literal('')),
  nid: z.string().max(50).optional().or(z.literal('')),
});

export const expenseFormSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  amount: z.number().positive('Amount must be greater than 0').max(100000000, 'Amount exceeds maximum'),
  payment_method: z.string().optional(),
  category_id: z.string().optional().or(z.literal('')),
  vendor_id: z.string().optional().or(z.literal('')),
});

export const salaryFormSchema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  month: z.number().min(1).max(12),
  year: z.number().min(2000).max(2100),
  basic_salary: z.number().min(0).max(100000000),
  overtime_hours: z.number().min(0).max(1000),
  overtime_amount: z.number().min(0).max(100000000),
  bonus: z.number().min(0).max(100000000),
  deductions: z.number().min(0).max(100000000),
  advance: z.number().min(0).max(100000000),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

export const advanceFormSchema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  amount: z.number().positive('Amount must be greater than 0').max(100000000),
  reason: z.string().max(500).optional().or(z.literal('')),
  deduction_month: z.number().min(1).max(12),
  deduction_year: z.number().min(2000).max(2100),
});

export const billFormSchema = z.object({
  vendor_id: z.string().min(1, 'Vendor is required'),
  bill_date: z.string().min(1, 'Bill date is required'),
  amount: z.number().positive('Amount must be greater than 0').max(100000000),
  description: z.string().max(500).optional().or(z.literal('')),
  due_date: z.string().optional().or(z.literal('')),
});

export const paymentFormSchema = z.object({
  vendor_id: z.string().min(1, 'Vendor is required'),
  payment_date: z.string().min(1, 'Payment date is required'),
  amount: z.number().positive('Amount must be greater than 0').max(100000000),
  payment_method: z.string().optional(),
  notes: z.string().max(500).optional().or(z.literal('')),
});
