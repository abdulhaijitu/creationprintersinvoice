import { OrgRole } from '@/contexts/OrganizationContext';

// Permission key types
export type MenuPermissionKey = 
  | 'dashboard.access'
  | 'sales_billing.access'
  | 'expenses.access'
  | 'hr_workforce.access'
  | 'reports.access'
  | 'settings.access';

export type SubMenuPermissionKey = 
  // Sales & Billing
  | 'sales.customers'
  | 'sales.invoices'
  | 'sales.quotations'
  | 'sales.delivery_challans'
  | 'sales.price_calculations'
  // Expenses
  | 'expenses.vendors'
  | 'expenses.expenses'
  // HR & Workforce
  | 'hr.employees'
  | 'hr.attendance'
  | 'hr.leave_management'
  | 'hr.payroll'
  | 'hr.performance'
  | 'hr.tasks'
  // Reports
  | 'reports.financial'
  | 'reports.hr'
  // Settings
  | 'settings.role_management'
  | 'settings.organization_settings'
  | 'settings.team_members'
  | 'settings.usage_limits'
  | 'settings.notifications'
  | 'settings.white_label'
  | 'settings.billing'
  | 'settings.platform_admin';

export type PermissionKey = MenuPermissionKey | SubMenuPermissionKey;

// Legacy module types for backward compatibility
export type OrgModule = 
  | 'dashboard'
  | 'customers'
  | 'quotations'
  | 'invoices'
  | 'price_calculations'
  | 'expenses'
  | 'vendors'
  | 'delivery_challans'
  | 'employees'
  | 'attendance'
  | 'salary'
  | 'leave'
  | 'tasks'
  | 'reports'
  | 'settings'
  | 'team_members'
  | 'billing'
  | 'notifications';

export type OrgAction = 'view' | 'create' | 'edit' | 'delete';

// Map legacy module names to new permission keys
const moduleToPermissionKey: Record<OrgModule, SubMenuPermissionKey | MenuPermissionKey> = {
  dashboard: 'dashboard.access',
  customers: 'sales.customers',
  quotations: 'sales.quotations',
  invoices: 'sales.invoices',
  price_calculations: 'sales.price_calculations',
  expenses: 'expenses.expenses',
  vendors: 'expenses.vendors',
  delivery_challans: 'sales.delivery_challans',
  employees: 'hr.employees',
  attendance: 'hr.attendance',
  salary: 'hr.payroll',
  leave: 'hr.leave_management',
  tasks: 'hr.tasks',
  reports: 'reports.financial',
  settings: 'settings.organization_settings',
  team_members: 'settings.team_members',
  billing: 'settings.billing',
  notifications: 'settings.notifications',
};

// Map permission keys to their parent menu access keys
export const permissionToMenu: Record<SubMenuPermissionKey, MenuPermissionKey> = {
  'sales.customers': 'sales_billing.access',
  'sales.invoices': 'sales_billing.access',
  'sales.quotations': 'sales_billing.access',
  'sales.delivery_challans': 'sales_billing.access',
  'sales.price_calculations': 'sales_billing.access',
  'expenses.vendors': 'expenses.access',
  'expenses.expenses': 'expenses.access',
  'hr.employees': 'hr_workforce.access',
  'hr.attendance': 'hr_workforce.access',
  'hr.leave_management': 'hr_workforce.access',
  'hr.payroll': 'hr_workforce.access',
  'hr.performance': 'hr_workforce.access',
  'hr.tasks': 'hr_workforce.access',
  'reports.financial': 'reports.access',
  'reports.hr': 'reports.access',
  'settings.role_management': 'settings.access',
  'settings.organization_settings': 'settings.access',
  'settings.team_members': 'settings.access',
  'settings.usage_limits': 'settings.access',
  'settings.notifications': 'settings.access',
  'settings.white_label': 'settings.access',
  'settings.billing': 'settings.access',
  'settings.platform_admin': 'settings.access',
};

// Get permission key from module
export const getPermissionKey = (module: OrgModule): PermissionKey => {
  return moduleToPermissionKey[module] || 'dashboard.access';
};

// Check if org role has permission for module action (legacy support)
// This is now deprecated - use useOrgPermissionResolver instead
export const hasOrgPermission = (
  role: OrgRole | null,
  module: OrgModule,
  action: OrgAction
): boolean => {
  if (!role) return false;
  
  // For view action, check if role typically has access
  // This is a fallback for when dynamic permissions aren't loaded
  const roleDefaults: Record<OrgRole, OrgModule[]> = {
    owner: ['dashboard', 'customers', 'quotations', 'invoices', 'price_calculations', 'expenses', 'vendors', 'delivery_challans', 'employees', 'attendance', 'salary', 'leave', 'tasks', 'reports', 'settings', 'team_members', 'billing', 'notifications'],
    manager: ['dashboard', 'customers', 'quotations', 'invoices', 'price_calculations', 'expenses', 'vendors', 'delivery_challans', 'employees', 'attendance', 'leave', 'tasks', 'reports', 'team_members'],
    accounts: ['dashboard', 'customers', 'quotations', 'invoices', 'price_calculations', 'expenses', 'vendors', 'delivery_challans', 'attendance', 'salary', 'leave', 'tasks', 'reports'],
    staff: ['dashboard', 'customers', 'quotations', 'invoices', 'delivery_challans', 'price_calculations', 'attendance', 'leave', 'tasks'],
  };

  if (action === 'view') {
    return roleDefaults[role]?.includes(module) ?? false;
  }

  // For other actions, only owner and manager typically have access
  if (action === 'delete') {
    return role === 'owner';
  }

  if (action === 'edit' || action === 'create') {
    return ['owner', 'manager', 'accounts'].includes(role);
  }

  return false;
};

// Get display name for org role
export const getOrgRoleDisplayName = (role: OrgRole | null): string => {
  const names: Record<OrgRole, string> = {
    owner: 'Owner',
    manager: 'Manager',
    accounts: 'Accounts',
    staff: 'Staff',
  };
  return role ? names[role] ?? role : 'Unknown';
};

// All org roles for UI
export const allOrgRoles: OrgRole[] = ['owner', 'manager', 'accounts', 'staff'];

// Get modules accessible by a role (legacy)
export const getAccessibleModules = (role: OrgRole | null): OrgModule[] => {
  if (!role) return [];
  
  const allModules: OrgModule[] = [
    'dashboard', 'customers', 'quotations', 'invoices', 'price_calculations',
    'expenses', 'vendors', 'delivery_challans', 'employees', 'attendance',
    'salary', 'leave', 'tasks', 'reports', 'settings', 'team_members', 'billing', 'notifications'
  ];

  return allModules.filter(module => hasOrgPermission(role, module, 'view'));
};

// Get role capabilities description
export const getRoleCapabilities = (role: OrgRole): string[] => {
  switch (role) {
    case 'owner':
      return [
        'Full dashboard access',
        'User management',
        'Billing & plan management',
        'All settings access',
        'Delete any record',
      ];
    case 'manager':
      return [
        'Dashboard access',
        'Limited user management',
        'No billing access',
        'Limited settings',
        'Cannot delete invoices',
      ];
    case 'accounts':
      return [
        'Invoice & payment access',
        'Expense management',
        'Salary processing',
        'No user management',
        'No settings access',
      ];
    case 'staff':
      return [
        'Operational features only',
        'Customer & quotation access',
        'Task management',
        'No admin features',
        'No billing access',
      ];
    default:
      return [];
  }
};

// Permission categories for UI grouping
export const PERMISSION_CATEGORIES = [
  'Core',
  'Sales & Billing',
  'Expenses',
  'HR & Workforce',
  'Reports',
  'Settings',
] as const;

export type PermissionCategory = typeof PERMISSION_CATEGORIES[number];
