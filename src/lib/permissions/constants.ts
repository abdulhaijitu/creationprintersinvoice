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

// ============= PERMISSION ACTIONS =============

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'bulk' | 'import' | 'export';

// ============= MODULE DEFINITIONS =============

export type PermissionModule = 
  | 'dashboard' 
  | 'customers' 
  | 'invoices' 
  | 'quotations' 
  | 'expenses'
  | 'expense_categories'
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
  | 'white_label'
  | 'analytics'
  | 'price_calculations';

export const MODULE_DISPLAY: Record<PermissionModule, string> = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  invoices: 'Invoices',
  quotations: 'Quotations',
  expenses: 'Expenses',
  expense_categories: 'Expense Categories',
  vendors: 'Vendors',
  delivery_challans: 'Delivery Challans',
  employees: 'Employees',
  attendance: 'Attendance',
  salary: 'Salary',
  leave: 'Leave Management',
  tasks: 'Tasks',
  reports: 'Reports',
  settings: 'Settings',
  team_members: 'Team Members',
  billing: 'Billing',
  white_label: 'White-Label',
  analytics: 'Analytics',
  price_calculations: 'Price Calculations',
};

// ============= EDGE-ENFORCED PERMISSION MATRIX =============
// This matrix MUST be mirrored in Edge Functions

export const PERMISSION_MATRIX: Record<PermissionModule, Partial<Record<PermissionAction, OrgRole[]>>> = {
  dashboard: {
    view: ['owner', 'manager', 'accounts', 'sales_staff', 'designer', 'employee'],
  },
  customers: {
    view: ['owner', 'manager', 'accounts', 'sales_staff', 'employee'],
    create: ['owner', 'manager', 'sales_staff'],
    edit: ['owner', 'manager', 'sales_staff'],
    delete: ['owner', 'manager'],
    bulk: ['owner', 'manager'],
    import: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  invoices: {
    view: ['owner', 'manager', 'accounts', 'sales_staff', 'employee'],
    create: ['owner', 'manager', 'accounts', 'sales_staff'],
    edit: ['owner', 'manager', 'accounts', 'sales_staff'],
    delete: ['owner', 'manager'],
    bulk: ['owner', 'manager'],
    import: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  quotations: {
    view: ['owner', 'manager', 'sales_staff', 'designer'],
    create: ['owner', 'manager', 'sales_staff'],
    edit: ['owner', 'manager', 'sales_staff'],
    delete: ['owner', 'manager'],
    bulk: ['owner', 'manager'],
    import: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  expenses: {
    view: ['owner', 'manager', 'accounts'],
    create: ['owner', 'manager', 'accounts'],
    edit: ['owner', 'manager'],
    delete: ['owner'],
    bulk: ['owner', 'manager'],
    import: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  expense_categories: {
    view: ['owner', 'manager', 'accounts'],
    create: ['owner', 'manager'],
    edit: ['owner', 'manager'],
    delete: ['owner', 'manager'],
  },
  vendors: {
    view: ['owner', 'manager', 'accounts'],
    create: ['owner', 'manager', 'accounts'],
    edit: ['owner', 'manager'],
    delete: ['owner'],
    bulk: ['owner', 'manager'],
    import: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  delivery_challans: {
    view: ['owner', 'manager', 'accounts', 'sales_staff', 'employee'],
    create: ['owner', 'manager', 'sales_staff'],
    edit: ['owner', 'manager', 'sales_staff'],
    delete: ['owner', 'manager'],
    bulk: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  employees: {
    view: ['owner', 'manager'],
    create: ['owner', 'manager'],
    edit: ['owner', 'manager'],
    delete: ['owner'],
    bulk: ['owner'],
    import: ['owner'],
    export: ['owner', 'manager'],
  },
  attendance: {
    view: ['owner', 'manager', 'employee', 'designer', 'accounts', 'sales_staff'],
    create: ['owner', 'manager'],
    edit: ['owner', 'manager'],
    delete: ['owner'],
    bulk: ['owner'],
    export: ['owner', 'manager'],
  },
  salary: {
    view: ['owner', 'accounts'],
    create: ['owner'],
    edit: ['owner'],
    delete: ['owner'],
    export: ['owner'],
  },
  leave: {
    view: ['owner', 'manager', 'employee', 'designer', 'accounts', 'sales_staff'],
    create: ['owner', 'manager', 'employee', 'designer', 'accounts', 'sales_staff'],
    edit: ['owner', 'manager'],
    delete: ['owner'],
  },
  tasks: {
    view: ['owner', 'manager', 'employee', 'designer', 'accounts', 'sales_staff'],
    create: ['owner', 'manager', 'employee', 'designer', 'accounts', 'sales_staff'],
    edit: ['owner', 'manager', 'employee', 'designer', 'accounts', 'sales_staff'],
    delete: ['owner', 'manager'],
  },
  reports: {
    view: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  settings: {
    view: ['owner', 'manager'],
    edit: ['owner'],
  },
  team_members: {
    view: ['owner', 'manager'],
    create: ['owner'],
    edit: ['owner'],
    delete: ['owner'],
  },
  billing: {
    view: ['owner'],
    edit: ['owner'],
  },
  white_label: {
    view: ['owner'],
    edit: ['owner'],
  },
  analytics: {
    view: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
  price_calculations: {
    view: ['owner', 'manager', 'accounts'],
    create: ['owner', 'manager'],
    edit: ['owner', 'manager'],
    delete: ['owner', 'manager'],
    export: ['owner', 'manager'],
  },
};

// ============= SUPER ADMIN CAPABILITIES =============
// Super admins can ONLY access system-level operations, NOT org-level

export const SUPER_ADMIN_CAPABILITIES = {
  MANAGE_ORGANIZATIONS: 'manage_organizations',
  MANAGE_PLANS: 'manage_plans',
  GLOBAL_ANALYTICS: 'global_analytics',
  WHITE_LABEL_MANAGEMENT: 'white_label_management',
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
  const modulePerms = PERMISSION_MATRIX[module];
  if (!modulePerms) return false;
  const allowedRoles = modulePerms[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
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
  return (Object.keys(PERMISSION_MATRIX) as PermissionModule[]).filter(
    module => canRolePerform(role, module, 'view')
  );
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
  showTeamManagement: (role: OrgRole | null) => isRoleAtLeast(role, 'manager'),
  canEditTeamRoles: (role: OrgRole | null) => role === 'owner',
  
  // White-Label - Owner only
  showWhiteLabelSettings: (role: OrgRole | null) => role === 'owner',
  
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
