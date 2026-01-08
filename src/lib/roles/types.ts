/**
 * Role System Type Definitions
 * 
 * IMPORTANT: This file defines the two-tier role system:
 * 1. System Role (super_admin) - Platform-level access, exists outside organizations
 * 2. Organization Roles - Per-organization access for business operations
 */

// ============= SYSTEM LEVEL ROLES =============
export type SystemRole = 'super_admin';

export const SYSTEM_CAPABILITIES = {
  MANAGE_ORGANIZATIONS: 'manage_organizations',
  MANAGE_PLANS: 'manage_plans',
  GLOBAL_ANALYTICS: 'global_analytics',
  WHITE_LABEL_MANAGEMENT: 'white_label_management',
  DEMO_DATA_CONTROL: 'demo_data_control',
  VIEW_ALL_AUDIT_LOGS: 'view_all_audit_logs',
  IMPERSONATE_USERS: 'impersonate_users',
} as const;

export type SystemCapability = typeof SYSTEM_CAPABILITIES[keyof typeof SYSTEM_CAPABILITIES];

// ============= ORGANIZATION LEVEL ROLES =============
// Must match database enum 'org_role'
export type OrgRole = 'owner' | 'manager' | 'accounts' | 'staff';

export const ORG_ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 100,
  manager: 75,
  accounts: 50,
  staff: 25,
};

export const ORG_ROLE_DISPLAY: Record<OrgRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  accounts: 'Accounts',
  staff: 'Staff',
};

export const ORG_ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  owner: 'Full control over organization settings, billing, and all operations',
  manager: 'Manage team members and most operations, but cannot access billing',
  accounts: 'Create and manage invoices, expenses, and financial operations',
  staff: 'Basic operations access for daily tasks',
};

export type OrgAction = 'view' | 'create' | 'edit' | 'delete';

export type OrgModule = 
  | 'dashboard' | 'customers' | 'invoices' | 'quotations' | 'expenses'
  | 'vendors' | 'delivery_challans' | 'employees' | 'attendance'
  | 'salary' | 'leave' | 'tasks' | 'reports' | 'settings'
  | 'team_members' | 'billing';

export const ORG_MODULE_DISPLAY: Record<OrgModule, string> = {
  dashboard: 'Dashboard', customers: 'Customers', invoices: 'Invoices',
  quotations: 'Quotations', expenses: 'Expenses', vendors: 'Vendors',
  delivery_challans: 'Delivery Challans', employees: 'Employees',
  attendance: 'Attendance', salary: 'Salary', leave: 'Leave Management',
  tasks: 'Tasks', reports: 'Reports', settings: 'Settings',
  team_members: 'Team Members', billing: 'Billing',
};

// Permission matrix using database role values
export const ORG_PERMISSION_MATRIX: Record<OrgModule, Record<OrgAction, OrgRole[]>> = {
  dashboard: { view: ['owner', 'manager', 'accounts', 'staff'], create: [], edit: [], delete: [] },
  customers: { view: ['owner', 'manager', 'accounts', 'staff'], create: ['owner', 'manager', 'staff'], edit: ['owner', 'manager', 'staff'], delete: ['owner', 'manager'] },
  invoices: { view: ['owner', 'manager', 'accounts', 'staff'], create: ['owner', 'manager', 'accounts'], edit: ['owner', 'manager', 'accounts'], delete: ['owner'] },
  quotations: { view: ['owner', 'manager', 'accounts', 'staff'], create: ['owner', 'manager', 'staff'], edit: ['owner', 'manager', 'staff'], delete: ['owner', 'manager'] },
  expenses: { view: ['owner', 'manager', 'accounts'], create: ['owner', 'manager', 'accounts'], edit: ['owner', 'manager'], delete: ['owner'] },
  vendors: { view: ['owner', 'manager', 'accounts'], create: ['owner', 'manager', 'accounts'], edit: ['owner', 'manager'], delete: ['owner'] },
  delivery_challans: { view: ['owner', 'manager', 'accounts', 'staff'], create: ['owner', 'manager', 'staff'], edit: ['owner', 'manager', 'staff'], delete: ['owner', 'manager'] },
  employees: { view: ['owner', 'manager'], create: ['owner', 'manager'], edit: ['owner', 'manager'], delete: ['owner'] },
  attendance: { view: ['owner', 'manager', 'staff'], create: ['owner', 'manager'], edit: ['owner', 'manager'], delete: ['owner'] },
  salary: { view: ['owner', 'accounts'], create: ['owner'], edit: ['owner'], delete: ['owner'] },
  leave: { view: ['owner', 'manager', 'staff'], create: ['owner', 'manager', 'staff'], edit: ['owner', 'manager'], delete: ['owner'] },
  tasks: { view: ['owner', 'manager', 'staff'], create: ['owner', 'manager', 'staff'], edit: ['owner', 'manager', 'staff'], delete: ['owner', 'manager'] },
  reports: { view: ['owner', 'manager'], create: ['owner', 'manager'], edit: [], delete: [] },
  settings: { view: ['owner', 'manager'], create: ['owner'], edit: ['owner'], delete: ['owner'] },
  team_members: { view: ['owner', 'manager'], create: ['owner'], edit: ['owner'], delete: ['owner'] },
  billing: { view: ['owner'], create: ['owner'], edit: ['owner'], delete: ['owner'] },
};

export function canOrgRolePerform(role: OrgRole | null, module: OrgModule, action: OrgAction): boolean {
  if (!role) return false;
  return ORG_PERMISSION_MATRIX[module]?.[action]?.includes(role) ?? false;
}

export function isRoleAtLeast(role: OrgRole | null, minRole: OrgRole): boolean {
  if (!role) return false;
  return ORG_ROLE_HIERARCHY[role] >= ORG_ROLE_HIERARCHY[minRole];
}

export function getRolesForAction(module: OrgModule, action: OrgAction): OrgRole[] {
  return ORG_PERMISSION_MATRIX[module]?.[action] ?? [];
}

export function getAccessibleModules(role: OrgRole | null): OrgModule[] {
  if (!role) return [];
  const modules = Object.keys(ORG_PERMISSION_MATRIX) as OrgModule[];
  return modules.filter(module => canOrgRolePerform(role, module, 'view'));
}
