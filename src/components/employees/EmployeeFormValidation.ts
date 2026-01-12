import { z } from "zod";

export const employeeValidationSchema = z.object({
  full_name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[0-9+\-\s()]*$/.test(val),
      "Phone must contain only numbers and valid characters (+, -, spaces, parentheses)"
    )
    .refine(
      (val) => !val || val.length <= 20,
      "Phone must be 20 characters or less"
    ),
  email: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Please enter a valid email address"
    ),
  designation: z.string().max(100, "Designation must be less than 100 characters").optional(),
  department: z.string().max(100, "Department must be less than 100 characters").optional(),
  joining_date: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(Date.parse(val)),
      "Please enter a valid date"
    ),
  basic_salary: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
      "Salary must be a non-negative number"
    )
    .refine(
      (val) => !val || parseFloat(val) <= 100000000,
      "Salary cannot exceed 100,000,000"
    ),
  address: z.string().max(500, "Address must be less than 500 characters").optional(),
  nid: z.string().max(50, "NID must be less than 50 characters").optional(),
});

export type EmployeeFormData = z.infer<typeof employeeValidationSchema>;

export interface FieldErrors {
  full_name?: string;
  phone?: string;
  email?: string;
  designation?: string;
  department?: string;
  joining_date?: string;
  basic_salary?: string;
  address?: string;
  nid?: string;
}

export const validateField = (
  fieldName: keyof EmployeeFormData,
  value: string
): string | undefined => {
  const partialSchema = employeeValidationSchema.shape[fieldName];
  const result = partialSchema.safeParse(value || undefined);
  
  if (!result.success) {
    return result.error.errors[0]?.message;
  }
  return undefined;
};

export const validateForm = (
  data: Record<string, string>
): { isValid: boolean; errors: FieldErrors } => {
  const result = employeeValidationSchema.safeParse(data);
  
  if (!result.success) {
    const errors: FieldErrors = {};
    result.error.errors.forEach((err) => {
      const field = err.path[0] as keyof FieldErrors;
      if (!errors[field]) {
        errors[field] = err.message;
      }
    });
    return { isValid: false, errors };
  }
  
  return { isValid: true, errors: {} };
};

// Check if form has any changes from original
export const hasFormChanges = (
  current: Record<string, string>,
  original: Record<string, string>
): boolean => {
  const keys = Object.keys(current);
  return keys.some((key) => {
    const currentVal = (current[key] || "").trim();
    const originalVal = (original[key] || "").trim();
    return currentVal !== originalVal;
  });
};
