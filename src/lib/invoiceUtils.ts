import { supabase } from '@/integrations/supabase/client';

export type InvoiceDisplayStatus = 'paid' | 'partial' | 'overdue' | 'unpaid' | 'due';

export interface InvoiceStatusInfo {
  total: number;
  paidAmount: number;
  dueAmount: number;
  displayStatus: InvoiceDisplayStatus;
  isOverdue: boolean;
  isFullyPaid: boolean;
}

/**
 * Round currency to 2 decimal places for accurate comparison
 */
function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Calculate invoice amounts and determine display status
 * Uses strict numeric comparison with proper rounding to avoid floating point issues
 */
export function calculateInvoiceStatus(
  total: number | string | null,
  paidAmount: number | string | null,
  dueDate: string | null
): InvoiceStatusInfo {
  const totalNum = roundCurrency(Number(total) || 0);
  const paidNum = roundCurrency(Number(paidAmount) || 0);
  const dueAmount = roundCurrency(Math.max(0, totalNum - paidNum));
  
  // Check if overdue - only if due date is in the past AND there's still amount due
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dueDateObj = dueDate ? new Date(dueDate) : null;
  if (dueDateObj) dueDateObj.setHours(0, 0, 0, 0);
  const isOverdue = dueDateObj ? dueDateObj < now : false;
  
  // Determine if fully paid using proper comparison (>= handles edge cases)
  const isFullyPaid = paidNum >= totalNum && totalNum > 0;
  
  // Determine display status based on amounts ONLY (single source of truth)
  let displayStatus: InvoiceDisplayStatus;
  
  if (isFullyPaid || dueAmount <= 0) {
    // Fully paid when paid >= total
    displayStatus = 'paid';
  } else if (paidNum > 0) {
    // Partial when some payment made but not full
    displayStatus = 'partial';
  } else if (isOverdue) {
    // Overdue when past due date and no payment
    displayStatus = 'overdue';
  } else {
    // Unpaid/Due when no payment made
    displayStatus = 'unpaid';
  }
  
  return {
    total: totalNum,
    paidAmount: paidNum,
    dueAmount,
    displayStatus,
    isOverdue: isOverdue && !isFullyPaid,
    isFullyPaid,
  };
}

/**
 * Generate invoice number atomically using database function
 * Falls back to timestamp-based generation if DB function fails
 */
export async function generateInvoiceNumber(organizationId?: string): Promise<string> {
  if (!organizationId) {
    // Fallback for cases without org
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${year}${timestamp}`;
  }

  try {
    // Use atomic database function for org-based generation
    const { data, error } = await supabase.rpc('generate_org_invoice_number', {
      p_org_id: organizationId,
    });

    if (error) {
      console.error('Error generating invoice number via RPC:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Invoice number generation failed, using fallback:', error);
    
    // Fallback: Generate a unique number based on timestamp
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const timestamp = Date.now().toString().slice(-4);
    return `${year}${timestamp}${random}`;
  }
}

/**
 * Validate invoice data before save
 */
export function validateInvoiceData(data: {
  customerId?: string | null;
  items?: Array<{ description: string; quantity: number; unit_price: number }>;
  invoiceNumber?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.customerId) {
    errors.push('Customer is required');
  }

  if (!data.items || data.items.length === 0) {
    errors.push('At least one item is required');
  }

  if (data.items) {
    const emptyDescriptions = data.items.filter((item) => !item.description.trim());
    if (emptyDescriptions.length > 0) {
      errors.push('All items must have a description');
    }

    const invalidQuantities = data.items.filter((item) => item.quantity <= 0);
    if (invalidQuantities.length > 0) {
      errors.push('All items must have a positive quantity');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Map database status to display status for filtering
 */
export function mapStatusToFilter(
  dbStatus: string | null,
  total: number,
  paidAmount: number,
  dueDate: string | null
): InvoiceDisplayStatus {
  const { displayStatus } = calculateInvoiceStatus(total, paidAmount, dueDate);
  return displayStatus;
}

/**
 * Get status badge variant
 */
export function getStatusBadgeVariant(status: InvoiceDisplayStatus): 'success' | 'warning' | 'destructive' | 'default' {
  switch (status) {
    case 'paid':
      return 'success';
    case 'partial':
      return 'warning';
    case 'overdue':
      return 'destructive';
    case 'due':
      return 'default';
    default:
      return 'default';
  }
}

/**
 * Format currency for display (BDT)
 */
export function formatCurrency(amount: number): string {
  return `৳${amount.toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
