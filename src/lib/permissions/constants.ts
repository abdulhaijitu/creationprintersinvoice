/**
 * PERMISSION CONSTANTS - SINGLE SOURCE OF TRUTH
 * 
 * This file defines all permission constants used across the application.
 * These MUST match the Edge Function enforcement.
 * 
 * ARCHITECTURE:
 * 1. System Role: super_admin (platform-level)
 * 2. Organization Roles: owner, manager, accounts, sales_staff, designer, employee (per-org)
 * 
 * IMPORTANT: Frontend checks are UX-only. Edge Functions enforce actual security.
 */

// ============= ROLE DEFINITIONS =============

export type SystemRole = 'super_admin';

// Official organization roles - matches org_role enum in database
export type OrgRole = 'owner' | 'manager' | 'accounts' | 'sales_staff' | 'designer' | 'employee';

// Role hierarchy (higher number = more permissions)
export const ORG_ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 100,       // Full control
  manager: 75,      // Operational control (no ownership/billing)
  accounts: 50,     // Finance-related modules
  sales_staff: 40,  // Sales modules only
  designer: 35,     // Design/job-related modules only
  employee: 25,     // Limited operational access
};

export const ORG_ROLE_DISPLAY: Record<OrgRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  accounts: 'Accounts',
  sales_staff: 'Sales Staff',
  designer: 'Designer',
  employee: 'Employee',
};

export const ORG_ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  owner: 'Full control over organization settings, billing, team management, and all operations',
  manager: 'Manage team members (no role changes), invoices, customers, and daily operations',
  accounts: 'Financial operations: create/edit invoices, manage expenses and financial records',
  sales_staff: 'Sales operations: manage customers, quotations, invoices, and price calculations',
  designer: 'Design operations: view quotations, manage tasks, and price calculations',
  employee: 'Basic operations: view data, limited create/edit access',
};

// All organization roles for UI selection
export const ALL_ORG_ROLES: OrgRole[] = ['owner', 'manager', 'accounts', 'sales_staff', 'designer', 'employee'];

// ============= PERMISSION CATEGORIES =============

export type PermissionCategory = 'MAIN' | 'BUSINESS' | 'HR_OPS' | 'SYSTEM';

export const PERMISSION_CATEGORY_DISPLAY: Record<PermissionCategory, string> = {
  MAIN: 'Main',
  BUSINESS: 'Business',
  HR_OPS: 'HR & Operations',
  SYSTEM: 'System',
};

export const PERMISSION_CATEGORY_ORDER: PermissionCategory[] = ['MAIN', 'BUSINESS', 'HR_OPS', 'SYSTEM'];

// ============= PERMISSION ACTIONS =============

export type PermissionAction = 'view' | 'manage' | 'create' | 'edit' | 'delete' | 'bulk' | 'import' | 'export';

// ============= MODULE DEFINITIONS =============

export type PermissionModule = 
  | 'dashboard' 
  | 'invoices'
  | 'payments'
  | 'quotations'
  | 'price_calculations'
  | 'delivery_challans'
  | 'customers' 
  | 'vendors' 
  | 'expenses'
  | 'expense_categories'
  | 'employees' 
  | 'attendance'
  | 'salary' 
  | 'leave' 
  | 'performance'
  | 'tasks' 
  | 'reports' 
  | 'team_members' 
  | 'settings'
  | 'billing'
  | 'analytics';

export const MODULE_DISPLAY: Record<PermissionModule, string> = {
  dashboard: 'Dashboard',
  invoices: 'Invoices',
  payments: 'Payments',
  quotations: 'Quotations',
  price_calculations: 'Price Calculations',
  delivery_challans: 'Delivery Challans',
  customers: 'Customers',
  vendors: 'Vendors',
  expenses: 'Expenses',
  expense_categories: 'Expense Categories',
  employees: 'Employees',
  attendance: 'Attendance',
  salary: 'Salary',
  leave: 'Leave Management',
  performance: 'Performance',
  tasks: 'Tasks',
  reports: 'Reports',
  team_members: 'Team Members',
  settings: 'Settings',
  billing: 'Billing',
  analytics: 'Analytics',
};

// ============= SERIAL PERMISSION STRUCTURE =============
// Organized by category for clear display and configuration

export interface PermissionDefinition {
  key: string;
  module: PermissionModule;
  action: PermissionAction;
  label: string;
  description: string;
  category: PermissionCategory;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // ===== MAIN =====
  { key: 'dashboard.view', module: 'dashboard', action: 'view', label: 'View Dashboard', description: 'Access dashboard with widgets based on sub-permissions', category: 'MAIN' },
  { key: 'invoices.view', module: 'invoices', action: 'view', label: 'View Invoices', description: 'View invoice list and details', category: 'MAIN' },
  { key: 'invoices.manage', module: 'invoices', action: 'manage', label: 'Manage Invoices', description: 'Create, edit, and delete invoices', category: 'MAIN' },
  { key: 'payments.view', module: 'payments', action: 'view', label: 'View Payments', description: 'View payment records', category: 'MAIN' },
  { key: 'payments.manage', module: 'payments', action: 'manage', label: 'Manage Payments', description: 'Create, edit, and refund payments', category: 'MAIN' },
  { key: 'quotations.view', module: 'quotations', action: 'view', label: 'View Quotations', description: 'View quotation list and details', category: 'MAIN' },
  { key: 'quotations.manage', module: 'quotations', action: 'manage', label: 'Manage Quotations', description: 'Create, edit, and delete quotations', category: 'MAIN' },
  { key: 'price_calculations.view', module: 'price_calculations', action: 'view', label: 'View Price Calculations', description: 'Access price calculation tool', category: 'MAIN' },
  { key: 'delivery_challans.view', module: 'delivery_challans', action: 'view', label: 'View Challans', description: 'View delivery challans', category: 'MAIN' },
  { key: 'delivery_challans.manage', module: 'delivery_challans', action: 'manage', label: 'Manage Challans', description: 'Create, edit, and delete challans', category: 'MAIN' },

  // ===== BUSINESS =====
  { key: 'customers.view', module: 'customers', action: 'view', label: 'View Customers', description: 'View customer list and details', category: 'BUSINESS' },
  { key: 'customers.manage', module: 'customers', action: 'manage', label: 'Manage Customers', description: 'Add, edit, and delete customers', category: 'BUSINESS' },
  { key: 'vendors.view', module: 'vendors', action: 'view', label: 'View Vendors', description: 'View vendor list and details', category: 'BUSINESS' },
  { key: 'vendors.manage', module: 'vendors', action: 'manage', label: 'Manage Vendors', description: 'Add, edit, and delete vendors', category: 'BUSINESS' },
  { key: 'expenses.view', module: 'expenses', action: 'view', label: 'View Expenses', description: 'View expense records', category: 'BUSINESS' },
  { key: 'expenses.manage', module: 'expenses', action: 'manage', label: 'Manage Expenses', description: 'Add, edit, and delete expenses', category: 'BUSINESS' },

  // ===== HR & OPS =====
  { key: 'employees.view', module: 'employees', action: 'view', label: 'View Employees', description: 'View employee list and details', category: 'HR_OPS' },
  { key: 'employees.manage', module: 'employees', action: 'manage', label: 'Manage Employees', description: 'Add, edit, and delete employees', category: 'HR_OPS' },
  { key: 'attendance.view', module: 'attendance', action: 'view', label: 'View Attendance', description: 'View attendance records', category: 'HR_OPS' },
  { key: 'attendance.manage', module: 'attendance', action: 'manage', label: 'Manage Attendance', description: 'Mark and edit attendance', category: 'HR_OPS' },
  { key: 'salary.view', module: 'salary', action: 'view', label: 'View Salary', description: 'View salary records', category: 'HR_OPS' },
  { key: 'salary.manage', module: 'salary', action: 'manage', label: 'Manage Salary', description: 'Update salary records', category: 'HR_OPS' },
  { key: 'leave.view', module: 'leave', action: 'view', label: 'View Leave', description: 'View leave records', category: 'HR_OPS' },
  { key: 'leave.manage', module: 'leave', action: 'manage', label: 'Manage Leave', description: 'Approve and reject leave requests', category: 'HR_OPS' },
  { key: 'performance.view', module: 'performance', action: 'view', label: 'View Performance', description: 'View performance data', category: 'HR_OPS' },
  { key: 'performance.manage', module: 'performance', action: 'manage', label: 'Manage Performance', description: 'Update performance records', category: 'HR_OPS' },
  { key: 'tasks.view', module: 'tasks', action: 'view', label: 'View Tasks', description: 'View task list', category: 'HR_OPS' },
  { key: 'tasks.manage', module: 'tasks', action: 'manage', label: 'Manage Tasks', description: 'Create, assign, and update tasks', category: 'HR_OPS' },

  // ===== SYSTEM =====
  { key: 'reports.view', module: 'reports', action: 'view', label: 'View Reports', description: 'Access reports and analytics', category: 'SYSTEM' },
  { key: 'team_members.view', module: 'team_members', action: 'view', label: 'View Team', description: 'View team members', category: 'SYSTEM' },
  { key: 'team_members.manage', module: 'team_members', action: 'manage', label: 'Manage Team', description: 'Add, edit, and delete team members', category: 'SYSTEM' },
  { key: 'settings.view', module: 'settings', action: 'view', label: 'View Settings', description: 'View system settings', category: 'SYSTEM' },
  { key: 'settings.manage', module: 'settings', action: 'manage', label: 'Manage Settings', description: 'Update system settings', category: 'SYSTEM' },
];

// Get permissions grouped by category
export function getPermissionsByCategory(): Record<PermissionCategory, PermissionDefinition[]> {
  const result: Record<PermissionCategory, PermissionDefinition[]> = {
    MAIN: [],
    BUSINESS: [],
    HR_OPS: [],
    SYSTEM: [],
  };
  
  for (const perm of PERMISSION_DEFINITIONS) {
    result[perm.category].push(perm);
  }
  
  return result;
}

// Get permission definition by key
export function getPermissionByKey(key: string): PermissionDefinition | undefined {
  return PERMISSION_DEFINITIONS.find(p => p.key === key);
}

// ============= EDGE-ENFORCED PERMISSION MATRIX =============
// This matrix MUST be mirrored in Edge Functions
// Maps module + action to allowed roles

export const PERMISSION_MATRIX: Record<PermissionModule, Partial<Record<PermissionAction, OrgRole[]>>> = {
  dashboard: {
    view: ['owner', 'manager', 'accounts', 'sales_staff', 'designer', 'employee'],
  },
  customers: {
    view: ['owner', 'manager', 'accounts', 'sales_staff', 'employee'],
    manage: ['owner', 'manager', 'sales_staff'],
    create: ['owner', 'manager', 'sales_staff'],
    edit: ['owner', 'manager', 'sales_staff'],
    delete: ['owner', 'manager'],
    bulk: ['owner', 'manager'],
    import: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  invoices: {
    view: ['owner', 'manager', 'accounts', 'sales_staff', 'employee'],
    manage: ['owner', 'manager', 'accounts', 'sales_staff'],
    create: ['owner', 'manager', 'accounts', 'sales_staff'],
    edit: ['owner', 'manager', 'accounts', 'sales_staff'],
    delete: ['owner', 'manager'],
    bulk: ['owner', 'manager'],
    import: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  payments: {
    view: ['owner', 'manager', 'accounts', 'sales_staff'],
    manage: ['owner', 'manager', 'accounts'],
    create: ['owner', 'manager', 'accounts'],
    edit: ['owner', 'manager', 'accounts'],
    delete: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  quotations: {
    view: ['owner', 'manager', 'sales_staff', 'designer'],
    manage: ['owner', 'manager', 'sales_staff'],
    create: ['owner', 'manager', 'sales_staff'],
    edit: ['owner', 'manager', 'sales_staff'],
    delete: ['owner', 'manager'],
    bulk: ['owner', 'manager'],
    import: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  price_calculations: {
    view: ['owner', 'manager', 'accounts', 'sales_staff', 'designer'],
    manage: ['owner', 'manager'],
    create: ['owner', 'manager'],
    edit: ['owner', 'manager'],
    delete: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  delivery_challans: {
    view: ['owner', 'manager', 'accounts', 'sales_staff', 'employee'],
    manage: ['owner', 'manager', 'sales_staff'],
    create: ['owner', 'manager', 'sales_staff'],
    edit: ['owner', 'manager', 'sales_staff'],
    delete: ['owner', 'manager'],
    bulk: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  expenses: {
    view: ['owner', 'manager', 'accounts'],
    manage: ['owner', 'manager', 'accounts'],
    create: ['owner', 'manager', 'accounts'],
    edit: ['owner', 'manager'],
    delete: ['owner'],
    bulk: ['owner', 'manager'],
    import: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  expense_categories: {
    view: ['owner', 'manager', 'accounts'],
    manage: ['owner', 'manager'],
    create: ['owner', 'manager'],
    edit: ['owner', 'manager'],
    delete: ['owner', 'manager'],
  },
  vendors: {
    view: ['owner', 'manager', 'accounts'],
    manage: ['owner', 'manager', 'accounts'],
    create: ['owner', 'manager', 'accounts'],
    edit: ['owner', 'manager'],
    delete: ['owner'],
    bulk: ['owner', 'manager'],
    import: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  employees: {
    view: ['owner', 'manager', 'accounts'],
    manage: ['owner', 'manager'],
    create: ['owner', 'manager'],
    edit: ['owner', 'manager'],
    delete: ['owner'],
    bulk: ['owner'],
    import: ['owner'],
    export: ['owner', 'manager'],
  },
  attendance: {
    view: ['owner', 'manager', 'employee', 'designer', 'accounts', 'sales_staff'],
    manage: ['owner', 'manager'],
    create: ['owner', 'manager'],
    edit: ['owner', 'manager'],
    delete: ['owner'],
    bulk: ['owner'],
    export: ['owner', 'manager'],
  },
  salary: {
    view: ['owner', 'accounts'],
    manage: ['owner'],
    create: ['owner'],
    edit: ['owner'],
    delete: ['owner'],
    export: ['owner'],
  },
  leave: {
    view: ['owner', 'manager', 'employee', 'designer', 'accounts', 'sales_staff'],
    manage: ['owner', 'manager'],
    create: ['owner', 'manager', 'employee', 'designer', 'accounts', 'sales_staff'],
    edit: ['owner', 'manager'],
    delete: ['owner'],
  },
  performance: {
    view: ['owner', 'manager'],
    manage: ['owner', 'manager'],
    create: ['owner', 'manager'],
    edit: ['owner', 'manager'],
    delete: ['owner'],
  },
  tasks: {
    view: ['owner', 'manager', 'employee', 'designer', 'accounts', 'sales_staff'],
    manage: ['owner', 'manager', 'employee', 'designer', 'accounts', 'sales_staff'],
    create: ['owner', 'manager', 'employee', 'designer', 'accounts', 'sales_staff'],
    edit: ['owner', 'manager', 'employee', 'designer', 'accounts', 'sales_staff'],
    delete: ['owner', 'manager'],
    bulk: ['owner', 'manager'], // archive permission
    export: ['owner'], // restore permission (super admin only via isSuperAdmin check)
  },
  reports: {
    view: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  settings: {
    view: ['owner', 'manager'],
    manage: ['owner'],
    edit: ['owner'],
  },
  team_members: {
    view: ['owner', 'manager'],
    manage: ['owner'],
    create: ['owner'],
    edit: ['owner'],
    delete: ['owner'],
  },
  billing: {
    view: ['owner'],
    manage: ['owner'],
    edit: ['owner'],
  },
  analytics: {
    view: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
};

// ============= SUPER ADMIN CAPABILITIES =============
// Super admins can ONLY access system-level operations, NOT org-level

export const SUPER_ADMIN_CAPABILITIES = {
  MANAGE_ORGANIZATIONS: 'manage_organizations',
  MANAGE_PLANS: 'manage_plans',
  GLOBAL_ANALYTICS: 'global_analytics',
  DEMO_DATA_CONTROL: 'demo_data_control',
  VIEW_ALL_AUDIT_LOGS: 'view_all_audit_logs',
  IMPERSONATE_USERS: 'impersonate_users',
  CHANGE_OWNER: 'change_owner',
} as const;

export type SuperAdminCapability = typeof SUPER_ADMIN_CAPABILITIES[keyof typeof SUPER_ADMIN_CAPABILITIES];

// ============= HELPER FUNCTIONS =============

/**
 * Check if a role can perform an action on a module
 * NOTE: This is for UI display only - Edge Functions enforce actual permissions
 */
export function canRolePerform(
  role: OrgRole | null,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (!role) return false;
  
  // Owner always has all permissions
  if (role === 'owner') return true;
  
  const modulePerms = PERMISSION_MATRIX[module];
  if (!modulePerms) return false;
  
  // Check direct action
  const allowedRoles = modulePerms[action];
  if (allowedRoles?.includes(role)) return true;
  
  // If checking create/edit/delete, also check 'manage' permission
  if (['create', 'edit', 'delete'].includes(action)) {
    const manageRoles = modulePerms['manage'];
    if (manageRoles?.includes(role)) return true;
  }
  
  return false;
}

/**
 * Check if role is at least a minimum level
 */
export function isRoleAtLeast(role: OrgRole | null, minRole: OrgRole): boolean {
  if (!role) return false;
  return ORG_ROLE_HIERARCHY[role] >= ORG_ROLE_HIERARCHY[minRole];
}

/**
 * Get all roles that can perform an action on a module
 */
export function getRolesForAction(module: PermissionModule, action: PermissionAction): OrgRole[] {
  return PERMISSION_MATRIX[module]?.[action] || [];
}

/**
 * Get all modules a role can view
 */
export function getAccessibleModules(role: OrgRole | null): PermissionModule[] {
  if (!role) return [];
  if (role === 'owner') return Object.keys(PERMISSION_MATRIX) as PermissionModule[];
  
  return (Object.keys(PERMISSION_MATRIX) as PermissionModule[]).filter(
    module => canRolePerform(role, module, 'view')
  );
}

/**
 * Check if a user has at least one permission (for dashboard access)
 */
export function hasAnyPermission(role: OrgRole | null): boolean {
  if (!role) return false;
  if (role === 'owner') return true;
  
  for (const module of Object.keys(PERMISSION_MATRIX) as PermissionModule[]) {
    if (canRolePerform(role, module, 'view')) return true;
  }
  
  return false;
}

/**
 * UI visibility rules - determines what UI elements to show based on role
 * This is UX-only, not security enforcement
 */
export const UI_VISIBILITY_RULES = {
  // Super Admin Panel - Only for super_admin (system level)
  showSuperAdminPanel: (isSuperAdmin: boolean) => isSuperAdmin,
  
  // Billing - Owner only
  showBillingSection: (role: OrgRole | null) => role === 'owner',
  
  // Team Management - Owner can edit roles, Manager can view
  showTeamManagement: (role: OrgRole | null) => canRolePerform(role, 'team_members', 'view'),
  canEditTeamRoles: (role: OrgRole | null) => canRolePerform(role, 'team_members', 'manage'),
  
  
  // Ownership Transfer - Owner only
  showOwnershipTransfer: (role: OrgRole | null) => role === 'owner',
  
  // Bulk Actions - Manager and above
  showBulkActions: (role: OrgRole | null) => isRoleAtLeast(role, 'manager'),
  
  // Import/Export - Manager and above
  showImportExport: (role: OrgRole | null) => isRoleAtLeast(role, 'manager'),
  
  // Delete buttons - Depends on module
  showDeleteButton: (role: OrgRole | null, module: PermissionModule) => 
    canRolePerform(role, module, 'delete'),
  
  // Create buttons - Depends on module
  showCreateButton: (role: OrgRole | null, module: PermissionModule) => 
    canRolePerform(role, module, 'create'),
  
  // Edit buttons - Depends on module
  showEditButton: (role: OrgRole | null, module: PermissionModule) => 
    canRolePerform(role, module, 'edit'),
};
