import { supabase } from '@/integrations/supabase/client';

export type InvoiceDisplayStatus = 'paid' | 'partial' | 'overdue' | 'due';

export interface InvoiceStatusInfo {
  total: number;
  paidAmount: number;
  dueAmount: number;
  displayStatus: InvoiceDisplayStatus;
  isOverdue: boolean;
}

/**
 * Calculate invoice amounts and determine display status
 */
export function calculateInvoiceStatus(
  total: number | string | null,
  paidAmount: number | string | null,
  dueDate: string | null
): InvoiceStatusInfo {
  const totalNum = Number(total) || 0;
  const paidNum = Number(paidAmount) || 0;
  const dueAmount = Math.max(0, totalNum - paidNum);
  
  // Check if overdue
  const isOverdue = dueDate ? new Date(dueDate) < new Date() : false;
  
  // Determine display status based on payment and due date
  let displayStatus: InvoiceDisplayStatus;
  
  if (dueAmount <= 0) {
    displayStatus = 'paid';
  } else if (paidNum > 0) {
    displayStatus = 'partial';
  } else if (isOverdue) {
    displayStatus = 'overdue';
  } else {
    displayStatus = 'due';
  }
  
  return {
    total: totalNum,
    paidAmount: paidNum,
    dueAmount,
    displayStatus,
    isOverdue: isOverdue && dueAmount > 0,
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
