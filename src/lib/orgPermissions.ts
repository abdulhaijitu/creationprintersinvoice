import { OrgRole } from '@/contexts/OrganizationContext';

// Organization-level permission modules (Main App)
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

// Organization role permission matrix
// This is for Main App panel ONLY (not Super Admin)
const orgPermissions: Record<OrgModule, Record<OrgAction, OrgRole[]>> = {
  dashboard: {
    view: ['owner', 'manager', 'accounts', 'staff'],
    create: [],
    edit: [],
    delete: [],
  },
  customers: {
    view: ['owner', 'manager', 'accounts', 'staff'],
    create: ['owner', 'manager', 'staff'],
    edit: ['owner', 'manager', 'staff'],
    delete: ['owner', 'manager'],
  },
  quotations: {
    view: ['owner', 'manager', 'accounts', 'staff'],
    create: ['owner', 'manager', 'staff'],
    edit: ['owner', 'manager', 'staff'],
    delete: ['owner', 'manager'],
  },
  invoices: {
    view: ['owner', 'manager', 'accounts', 'staff'],
    create: ['owner', 'manager', 'accounts'],
    edit: ['owner', 'manager', 'accounts'],
    delete: ['owner'],
  },
  price_calculations: {
    view: ['owner', 'manager', 'accounts', 'staff'],
    create: ['owner', 'manager', 'staff'],
    edit: ['owner', 'manager', 'staff'],
    delete: ['owner', 'manager'],
  },
  expenses: {
    view: ['owner', 'manager', 'accounts'],
    create: ['owner', 'manager', 'accounts'],
    edit: ['owner', 'manager', 'accounts'],
    delete: ['owner'],
  },
  vendors: {
    view: ['owner', 'manager', 'accounts'],
    create: ['owner', 'manager', 'accounts'],
    edit: ['owner', 'manager', 'accounts'],
    delete: ['owner'],
  },
  delivery_challans: {
    view: ['owner', 'manager', 'accounts', 'staff'],
    create: ['owner', 'manager', 'staff'],
    edit: ['owner', 'manager', 'staff'],
    delete: ['owner', 'manager'],
  },
  employees: {
    view: ['owner', 'manager'],
    create: ['owner'],
    edit: ['owner', 'manager'],
    delete: ['owner'],
  },
  attendance: {
    view: ['owner', 'manager', 'accounts', 'staff'],
    create: ['owner', 'manager'],
    edit: ['owner', 'manager'],
    delete: ['owner'],
  },
  salary: {
    view: ['owner', 'accounts'],
    create: ['owner', 'accounts'],
    edit: ['owner', 'accounts'],
    delete: ['owner'],
  },
  leave: {
    view: ['owner', 'manager', 'accounts', 'staff'],
    create: ['owner', 'manager', 'accounts', 'staff'],
    edit: ['owner', 'manager'],
    delete: ['owner'],
  },
  tasks: {
    view: ['owner', 'manager', 'accounts', 'staff'],
    create: ['owner', 'manager'],
    edit: ['owner', 'manager', 'accounts', 'staff'],
    delete: ['owner', 'manager'],
  },
  reports: {
    view: ['owner', 'manager', 'accounts'],
    create: ['owner', 'manager'],
    edit: ['owner'],
    delete: ['owner'],
  },
  settings: {
    view: ['owner'],
    create: ['owner'],
    edit: ['owner'],
    delete: ['owner'],
  },
  team_members: {
    view: ['owner', 'manager'],
    create: ['owner'],
    edit: ['owner'],
    delete: ['owner'],
  },
  billing: {
    view: ['owner'],
    create: ['owner'],
    edit: ['owner'],
    delete: ['owner'],
  },
  notifications: {
    view: ['owner', 'manager', 'accounts', 'staff'],
    create: ['owner', 'manager'],
    edit: ['owner', 'manager'],
    delete: ['owner', 'manager'],
  },
};

// Check if org role has permission for module action
export const hasOrgPermission = (
  role: OrgRole | null,
  module: OrgModule,
  action: OrgAction
): boolean => {
  if (!role) return false;
  const modulePerms = orgPermissions[module];
  if (!modulePerms) return false;
  return modulePerms[action]?.includes(role) ?? false;
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

// Get modules accessible by a role
export const getAccessibleModules = (role: OrgRole | null): OrgModule[] => {
  if (!role) return [];
  
  return (Object.keys(orgPermissions) as OrgModule[]).filter(
    (module) => orgPermissions[module].view.includes(role)
  );
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
