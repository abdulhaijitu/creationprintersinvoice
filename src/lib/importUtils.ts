// CSV/XLSX Import Utility Functions - Production Ready
import * as XLSX from 'xlsx';

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  duplicates?: number;
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'phone' | 'date';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: string, row: Record<string, string>) => string | null;
}

export interface ImportConfig {
  requiredFields: string[];
  validationRules?: ValidationRule[];
  duplicateCheck?: {
    fields: string[];
    mode: 'skip' | 'error';
  };
}

// Sanitize and trim a value
export const sanitizeValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
};

// Parse date in various formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
export const parseDate = (dateStr: string): string | null => {
  if (!dateStr) return null;
  
  const sanitized = sanitizeValue(dateStr);
  
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(sanitized)) {
    const date = new Date(sanitized);
    if (!isNaN(date.getTime())) return sanitized;
  }
  
  // Try DD/MM/YYYY
  const ddmmyyyy = sanitized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  // Try MM/DD/YYYY
  const mmddyyyy = sanitized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  
  return null;
};

// Parse amount (handles comma separators, currency symbols)
export const parseAmount = (amountStr: string): number | null => {
  if (!amountStr) return null;
  
  const sanitized = sanitizeValue(amountStr)
    .replace(/[৳$€£¥,\s]/g, '') // Remove currency symbols and commas
    .replace(/[^\d.\-]/g, ''); // Keep only digits, dot, and minus
  
  const num = parseFloat(sanitized);
  return isNaN(num) ? null : num;
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  if (!email) return true; // Empty is valid (optional)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Validate phone format (flexible)
export const isValidPhone = (phone: string): boolean => {
  if (!phone) return true; // Empty is valid (optional)
  const phoneRegex = /^[\d\s\+\-\(\)]{7,20}$/;
  return phoneRegex.test(phone.trim());
};

// Validate a row against rules
export const validateRow = (
  row: Record<string, string>,
  rules: ValidationRule[],
  rowIndex: number
): string[] => {
  const errors: string[] = [];
  
  for (const rule of rules) {
    const value = row[rule.field.toLowerCase()] || row[rule.field] || '';
    const displayName = rule.field.charAt(0).toUpperCase() + rule.field.slice(1);
    
    // Required check
    if (rule.required && !value.trim()) {
      errors.push(`Row ${rowIndex}: ${displayName} is required`);
      continue;
    }
    
    if (!value.trim()) continue; // Skip other validations for empty optional fields
    
    // Type validation
    switch (rule.type) {
      case 'email':
        if (!isValidEmail(value)) {
          errors.push(`Row ${rowIndex}: Invalid email format for ${displayName}`);
        }
        break;
      case 'phone':
        if (!isValidPhone(value)) {
          errors.push(`Row ${rowIndex}: Invalid phone format for ${displayName}`);
        }
        break;
      case 'number':
        if (parseAmount(value) === null) {
          errors.push(`Row ${rowIndex}: ${displayName} must be a valid number`);
        }
        break;
      case 'date':
        if (!parseDate(value)) {
          errors.push(`Row ${rowIndex}: Invalid date format for ${displayName}`);
        }
        break;
    }
    
    // Length validation
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`Row ${rowIndex}: ${displayName} must be at least ${rule.minLength} characters`);
    }
    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push(`Row ${rowIndex}: ${displayName} must not exceed ${rule.maxLength} characters`);
    }
    
    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`Row ${rowIndex}: ${displayName} format is invalid`);
    }
    
    // Custom validation
    if (rule.customValidator) {
      const customError = rule.customValidator(value, row);
      if (customError) {
        errors.push(`Row ${rowIndex}: ${customError}`);
      }
    }
  }
  
  return errors;
};

// Parse a single CSV line handling quoted values
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result.map(v => sanitizeValue(v));
};

// Main CSV parser with enhanced validation
export const parseCSV = <T extends Record<string, string>>(
  csvText: string,
  requiredFields: string[],
  validationRules?: ValidationRule[]
): { data: T[]; errors: string[] } => {
  const errors: string[] = [];
  
  // Handle BOM and normalize line endings
  const cleanText = csvText
    .replace(/^\uFEFF/, '') // Remove BOM
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  
  const lines = cleanText.trim().split('\n');
  
  if (lines.length < 2) {
    return { data: [], errors: ['CSV file does not contain enough data (needs header + at least 1 row)'] };
  }

  // Parse header
  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  
  // Check for empty headers
  if (header.some(h => !h)) {
    errors.push('Warning: Some columns have empty headers');
  }
  
  // Validate required fields (case-insensitive)
  const headerLower = header.map(h => h.toLowerCase());
  const missingFields = requiredFields.filter(
    field => !headerLower.includes(field.toLowerCase())
  );
  
  if (missingFields.length > 0) {
    return { 
      data: [], 
      errors: [`Missing required columns: ${missingFields.join(', ')}`] 
    };
  }

  const data: T[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty rows
    
    const values = parseCSVLine(line);
    
    // Check for column count mismatch
    if (values.length !== header.length) {
      errors.push(`Row ${i + 1}: Column count mismatch (expected ${header.length}, got ${values.length})`);
      continue;
    }

    // Check if row is completely empty
    const hasData = values.some(v => v.trim() !== '');
    if (!hasData) {
      continue; // Skip completely empty rows silently
    }

    const row: Record<string, string> = {};
    header.forEach((h, index) => {
      row[h] = sanitizeValue(values[index] || '');
    });
    
    // Apply validation rules if provided
    if (validationRules) {
      const rowErrors = validateRow(row, validationRules, i + 1);
      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }
    }
    
    data.push(row as T);
  }

  return { data, errors };
};

// Parse XLSX file
export const parseXLSX = async (
  file: File,
  requiredFields: string[],
  validationRules?: ValidationRule[]
): Promise<{ data: Record<string, string>[]; errors: string[] }> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { 
      defval: '',
      raw: false 
    });
    
    if (jsonData.length === 0) {
      return { data: [], errors: ['Excel file is empty or has no data rows'] };
    }
    
    // Convert to string record and normalize headers
    const data: Record<string, string>[] = jsonData.map(row => {
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[key.toLowerCase().trim()] = sanitizeValue(value);
      }
      return normalized;
    });
    
    // Validate required fields
    const firstRow = data[0];
    const headers = Object.keys(firstRow);
    const missingFields = requiredFields.filter(
      field => !headers.includes(field.toLowerCase())
    );
    
    if (missingFields.length > 0) {
      return { 
        data: [], 
        errors: [`Missing required columns: ${missingFields.join(', ')}`] 
      };
    }
    
    // Apply validation rules
    const errors: string[] = [];
    const validData: Record<string, string>[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      // Check if row is completely empty
      const hasData = Object.values(row).some(v => v.trim() !== '');
      if (!hasData) continue;
      
      if (validationRules) {
        const rowErrors = validateRow(row, validationRules, i + 2);
        if (rowErrors.length > 0) {
          errors.push(...rowErrors);
          continue;
        }
      }
      
      validData.push(row);
    }
    
    return { data: validData, errors };
  } catch (error) {
    console.error('XLSX parse error:', error);
    return { data: [], errors: ['Failed to parse Excel file. Please ensure it is a valid .xlsx file.'] };
  }
};

// Generate CSV template with example data
export const generateCSVTemplate = (headers: Record<string, string>): string => {
  const keys = Object.keys(headers);
  const headerRow = keys.join(',');
  const exampleRow = keys.map(k => `"Example ${headers[k]}"`).join(',');
  return `${headerRow}\n${exampleRow}`;
};

// Download template file
export const downloadTemplate = (filename: string, headers: Record<string, string>) => {
  const content = generateCSVTemplate(headers);
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

// Check for duplicates in a dataset
export const findDuplicates = (
  data: Record<string, string>[],
  fields: string[]
): { index: number; value: string }[] => {
  const seen = new Map<string, number>();
  const duplicates: { index: number; value: string }[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const key = fields
      .map(f => (data[i][f.toLowerCase()] || '').toLowerCase().trim())
      .join('|');
    
    if (key && seen.has(key)) {
      duplicates.push({ index: i + 2, value: key.replace(/\|/g, ', ') });
    } else if (key) {
      seen.set(key, i + 2);
    }
  }
  
  return duplicates;
};

// Chunk array for batch processing
export const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};
