/**
 * MODULE-BASED PERMISSION SYSTEM - SINGLE SOURCE OF TRUTH
 */

export type PermissionCategory = 'main' | 'invoices' | 'marketing' | 'vendors' | 'hr_ops' | 'system';

export interface ModulePermission {
  key: string;
  module: string;
  category: PermissionCategory;
  label: string;
  description: string;
  route: string;
  isCritical?: boolean;
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
];

// ============= INVOICES CATEGORY =============
export const INVOICES_PERMISSIONS: ModulePermission[] = [
  {
    key: 'business.customers',
    module: 'customers',
    category: 'invoices',
    label: 'Customers',
    description: 'View and manage customers',
    route: '/customers',
  },
  {
    key: 'main.invoices',
    module: 'invoices',
    category: 'invoices',
    label: 'Invoices',
    description: 'View and manage invoices',
    route: '/invoices',
  },
  {
    key: 'main.payments',
    module: 'payments',
    category: 'invoices',
    label: 'Payments',
    description: 'View and manage payments',
    route: '/payments',
  },
  {
    key: 'main.challan',
    module: 'delivery_challans',
    category: 'invoices',
    label: 'Delivery Challans',
    description: 'View and manage delivery challans',
    route: '/delivery-challans',
  },
];

// ============= MARKETING CATEGORY =============
export const MARKETING_PERMISSIONS: ModulePermission[] = [
  {
    key: 'marketing.leads',
    module: 'leads',
    category: 'marketing',
    label: 'Leads',
    description: 'View and manage leads',
    route: '/leads',
  },
  {
    key: 'main.price_calculation',
    module: 'price_calculations',
    category: 'marketing',
    label: 'Price Calculation',
    description: 'Access to price calculation tool',
    route: '/price-calculation',
  },
  {
    key: 'main.quotations',
    module: 'quotations',
    category: 'marketing',
    label: 'Quotations',
    description: 'View and manage quotations',
    route: '/quotations',
  },
];

// ============= VENDORS CATEGORY =============
export const VENDORS_PERMISSIONS: ModulePermission[] = [
  {
    key: 'business.vendors',
    module: 'vendors',
    category: 'vendors',
    label: 'Vendors',
    description: 'View and manage vendors',
    route: '/vendors',
  },
  {
    key: 'business.expenses',
    module: 'expenses',
    category: 'vendors',
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

// Keep old exports for backward compatibility
export const BUSINESS_PERMISSIONS = [...INVOICES_PERMISSIONS.filter(p => p.key.startsWith('business.')), ...VENDORS_PERMISSIONS];

// ============= ALL PERMISSIONS COMBINED =============
export const ALL_MODULE_PERMISSIONS: ModulePermission[] = [
  ...MAIN_PERMISSIONS,
  ...INVOICES_PERMISSIONS,
  ...MARKETING_PERMISSIONS,
  ...VENDORS_PERMISSIONS,
  ...HR_OPS_PERMISSIONS,
  ...SYSTEM_PERMISSIONS,
];

// ============= PERMISSION LOOKUP MAPS =============

export const PERMISSION_BY_KEY = new Map<string, ModulePermission>(
  ALL_MODULE_PERMISSIONS.map(p => [p.key, p])
);

export const PERMISSIONS_BY_CATEGORY: Record<PermissionCategory, ModulePermission[]> = {
  main: MAIN_PERMISSIONS,
  invoices: INVOICES_PERMISSIONS,
  marketing: MARKETING_PERMISSIONS,
  vendors: VENDORS_PERMISSIONS,
  hr_ops: HR_OPS_PERMISSIONS,
  system: SYSTEM_PERMISSIONS,
};

export const PERMISSION_BY_ROUTE = new Map<string, ModulePermission>(
  ALL_MODULE_PERMISSIONS.map(p => [p.route, p])
);

// ============= CATEGORY DISPLAY INFO =============

export const CATEGORY_DISPLAY: Record<PermissionCategory, { label: string; order: number }> = {
  main: { label: 'Main', order: 1 },
  invoices: { label: 'Invoices', order: 2 },
  marketing: { label: 'Marketing', order: 3 },
  vendors: { label: 'Vendors', order: 4 },
  hr_ops: { label: 'Human Resource', order: 5 },
  system: { label: 'System', order: 6 },
};

// ============= HELPER FUNCTIONS =============

export function getAllPermissionKeys(): string[] {
  return ALL_MODULE_PERMISSIONS.map(p => p.key);
}

export function getPermissionForRoute(route: string): ModulePermission | undefined {
  const exactMatch = PERMISSION_BY_ROUTE.get(route);
  if (exactMatch) return exactMatch;
  for (const [routeKey, permission] of PERMISSION_BY_ROUTE.entries()) {
    if (routeKey !== '/' && route.startsWith(routeKey)) {
      return permission;
    }
  }
  return undefined;
}

export function isValidPermissionKey(key: string): boolean {
  return PERMISSION_BY_KEY.has(key);
}

export function getPermissionLabel(key: string): string {
  return PERMISSION_BY_KEY.get(key)?.label ?? key;
}

export function getCriticalPermissions(): ModulePermission[] {
  return ALL_MODULE_PERMISSIONS.filter(p => p.isCritical);
}
