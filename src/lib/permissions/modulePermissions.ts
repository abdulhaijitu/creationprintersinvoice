/**
 * MODULE-BASED PERMISSION SYSTEM - SINGLE SOURCE OF TRUTH
 * 
 * This file defines all permission modules controlled by Super Admin.
 * When a module is disabled, it MUST be completely hidden and inaccessible.
 * 
 * ARCHITECTURE:
 * - Super Admin can enable/disable any module for any role
 * - Super Admin always has all modules enabled (locked ON)
 * - Owner role within organization has all modules enabled
 * - Other roles (staff) have module access controlled by org-specific permissions
 */

// ============= MODULE PERMISSION KEYS =============
// Format: category.module (e.g., main.dashboard, business.customers)

export type PermissionCategory = 'main' | 'business' | 'hr_ops' | 'system';

export interface ModulePermission {
  key: string;                    // Unique key: "category.module"
  module: string;                 // Module identifier
  category: PermissionCategory;   // Category for grouping
  label: string;                  // Display label
  description: string;            // Description of what this controls
  route: string;                  // Primary route for this module
  isCritical?: boolean;           // If true, requires confirmation to disable
}

// ============= MAIN CATEGORY =============
export const MAIN_PERMISSIONS: ModulePermission[] = [
  {
    key: 'main.dashboard',
    module: 'dashboard',
    category: 'main',
    label: 'Dashboard',
    description: 'Access to the main dashboard with widgets based on other permissions',
    route: '/',
  },
  {
    key: 'main.invoices',
    module: 'invoices',
    category: 'main',
    label: 'Invoices',
    description: 'View and manage invoices',
    route: '/invoices',
  },
  {
    key: 'main.payments',
    module: 'payments',
    category: 'main',
    label: 'Payments',
    description: 'View and manage payments',
    route: '/payments',
  },
  {
    key: 'main.quotations',
    module: 'quotations',
    category: 'main',
    label: 'Quotations',
    description: 'View and manage quotations',
    route: '/quotations',
  },
  {
    key: 'main.price_calculation',
    module: 'price_calculations',
    category: 'main',
    label: 'Price Calculation',
    description: 'Access to price calculation tool',
    route: '/price-calculation',
  },
  {
    key: 'main.challan',
    module: 'delivery_challans',
    category: 'main',
    label: 'Delivery Challans',
    description: 'View and manage delivery challans',
    route: '/delivery-challans',
  },
];

// ============= BUSINESS CATEGORY =============
export const BUSINESS_PERMISSIONS: ModulePermission[] = [
  {
    key: 'business.customers',
    module: 'customers',
    category: 'business',
    label: 'Customers',
    description: 'View and manage customers',
    route: '/customers',
  },
  {
    key: 'business.vendors',
    module: 'vendors',
    category: 'business',
    label: 'Vendors',
    description: 'View and manage vendors',
    route: '/vendors',
  },
  {
    key: 'business.expenses',
    module: 'expenses',
    category: 'business',
    label: 'Expenses',
    description: 'View and manage expenses',
    route: '/expenses',
  },
];

// ============= HR & OPERATIONS CATEGORY =============
export const HR_OPS_PERMISSIONS: ModulePermission[] = [
  {
    key: 'hr.employees',
    module: 'employees',
    category: 'hr_ops',
    label: 'Employees',
    description: 'View and manage employees',
    route: '/employees',
  },
  {
    key: 'hr.attendance',
    module: 'attendance',
    category: 'hr_ops',
    label: 'Attendance',
    description: 'View and manage attendance records',
    route: '/attendance',
  },
  {
    key: 'hr.salary',
    module: 'salary',
    category: 'hr_ops',
    label: 'Salary',
    description: 'View and manage salary records',
    route: '/salary',
  },
  {
    key: 'hr.leave',
    module: 'leave',
    category: 'hr_ops',
    label: 'Leave Management',
    description: 'View and manage leave requests',
    route: '/leave',
  },
  {
    key: 'hr.performance',
    module: 'performance',
    category: 'hr_ops',
    label: 'Performance',
    description: 'View and manage performance data',
    route: '/performance',
  },
  {
    key: 'hr.tasks',
    module: 'tasks',
    category: 'hr_ops',
    label: 'Tasks',
    description: 'View and manage tasks',
    route: '/tasks',
  },
];

// ============= SYSTEM CATEGORY =============
export const SYSTEM_PERMISSIONS: ModulePermission[] = [
  {
    key: 'system.reports',
    module: 'reports',
    category: 'system',
    label: 'Reports',
    description: 'Access to reports and analytics',
    route: '/reports',
  },
  {
    key: 'system.team',
    module: 'team_members',
    category: 'system',
    label: 'Team Management',
    description: 'View and manage team members',
    route: '/team-members',
  },
  {
    key: 'system.settings',
    module: 'settings',
    category: 'system',
    label: 'Settings',
    description: 'View and manage system settings',
    route: '/settings',
    isCritical: true,
  },
];

// ============= ALL PERMISSIONS COMBINED =============
export const ALL_MODULE_PERMISSIONS: ModulePermission[] = [
  ...MAIN_PERMISSIONS,
  ...BUSINESS_PERMISSIONS,
  ...HR_OPS_PERMISSIONS,
  ...SYSTEM_PERMISSIONS,
];

// ============= PERMISSION LOOKUP MAPS =============

// Get permission by key
export const PERMISSION_BY_KEY = new Map<string, ModulePermission>(
  ALL_MODULE_PERMISSIONS.map(p => [p.key, p])
);

// Get permissions by category
export const PERMISSIONS_BY_CATEGORY: Record<PermissionCategory, ModulePermission[]> = {
  main: MAIN_PERMISSIONS,
  business: BUSINESS_PERMISSIONS,
  hr_ops: HR_OPS_PERMISSIONS,
  system: SYSTEM_PERMISSIONS,
};

// Get permission by route
export const PERMISSION_BY_ROUTE = new Map<string, ModulePermission>(
  ALL_MODULE_PERMISSIONS.map(p => [p.route, p])
);

// ============= CATEGORY DISPLAY INFO =============
export const CATEGORY_DISPLAY: Record<PermissionCategory, { label: string; order: number }> = {
  main: { label: 'Main', order: 1 },
  business: { label: 'Business', order: 2 },
  hr_ops: { label: 'HR & Operations', order: 3 },
  system: { label: 'System', order: 4 },
};

// ============= HELPER FUNCTIONS =============

/**
 * Get all permission keys
 */
export function getAllPermissionKeys(): string[] {
  return ALL_MODULE_PERMISSIONS.map(p => p.key);
}

/**
 * Get permission for a specific route
 */
export function getPermissionForRoute(route: string): ModulePermission | undefined {
  // Try exact match first
  const exactMatch = PERMISSION_BY_ROUTE.get(route);
  if (exactMatch) return exactMatch;
  
  // Try prefix match for nested routes
  for (const [routeKey, permission] of PERMISSION_BY_ROUTE.entries()) {
    if (routeKey !== '/' && route.startsWith(routeKey)) {
      return permission;
    }
  }
  
  return undefined;
}

/**
 * Check if a permission key is valid
 */
export function isValidPermissionKey(key: string): boolean {
  return PERMISSION_BY_KEY.has(key);
}

/**
 * Get permission label by key
 */
export function getPermissionLabel(key: string): string {
  return PERMISSION_BY_KEY.get(key)?.label ?? key;
}

/**
 * Get all critical permissions
 */
export function getCriticalPermissions(): ModulePermission[] {
  return ALL_MODULE_PERMISSIONS.filter(p => p.isCritical);
}
