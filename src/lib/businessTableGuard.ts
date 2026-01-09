/**
 * Business Table Query Guard
 * 
 * CRITICAL: This module enforces hard blocking of business data queries
 * in Super Admin context. These tables should NEVER be queried from the admin panel.
 * 
 * If Super Admin needs to see org data, they MUST impersonate first.
 */

// List of all business tables that Super Admin should NEVER access directly
export const BUSINESS_TABLES = [
  'invoices',
  'invoice_items',
  'invoice_payments',
  'quotations',
  'quotation_items',
  'customers',
  'vendors',
  'vendor_bills',
  'vendor_bill_items',
  'expenses',
  'expense_categories',
  'delivery_challans',
  'delivery_challan_items',
  'employees',
  'employee_attendance',
  'employee_salary_records',
  'employee_advances',
  'attendance',
  'leave_requests',
  'leave_balances',
  'performance_notes',
  'tasks',
  'price_calculations',
  'price_calculation_items',
] as const;

export type BusinessTable = typeof BUSINESS_TABLES[number];

/**
 * Check if a table is a business table that should be blocked in admin context
 */
export function isBusinessTable(tableName: string): boolean {
  return BUSINESS_TABLES.includes(tableName as BusinessTable);
}

/**
 * Error thrown when attempting to access business data from Super Admin context
 */
export class BusinessDataAccessError extends Error {
  public readonly tableName: string;
  public readonly context: string;

  constructor(tableName: string, context: string = 'super_admin_app') {
    super(
      `[SECURITY VIOLATION] Attempted to query business table "${tableName}" from ${context} context. ` +
      `Super Admin must impersonate an organization to access business data.`
    );
    this.name = 'BusinessDataAccessError';
    this.tableName = tableName;
    this.context = context;
  }
}

/**
 * Validate that a query is allowed in the current context
 * THROWS if attempting to access business tables from super_admin context
 */
export function validateQueryAccess(
  tableName: string,
  appContext: 'user' | 'super_admin',
  isImpersonating: boolean
): void {
  // Super Admin (not impersonating) attempting to query business table = BLOCK
  if (appContext === 'super_admin' && !isImpersonating && isBusinessTable(tableName)) {
    throw new BusinessDataAccessError(tableName, 'super_admin_app');
  }
}

/**
 * Safe wrapper for checking query permission (returns boolean instead of throwing)
 */
export function canQueryTable(
  tableName: string,
  appContext: 'user' | 'super_admin',
  isImpersonating: boolean
): boolean {
  if (appContext === 'super_admin' && !isImpersonating && isBusinessTable(tableName)) {
    console.warn(`[BusinessTableGuard] BLOCKED query to "${tableName}" in Super Admin context`);
    return false;
  }
  return true;
}
