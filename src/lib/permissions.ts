import { AppRole } from '@/contexts/AuthContext';

// Permission matrix for different modules
export const permissions = {
  // Module: customers
  customers: {
    view: ['super_admin', 'admin', 'manager', 'accounts', 'sales_staff'],
    create: ['super_admin', 'admin', 'manager', 'sales_staff'],
    edit: ['super_admin', 'admin', 'manager', 'sales_staff'],
    delete: ['super_admin', 'admin'],
  },
  // Module: quotations
  quotations: {
    view: ['super_admin', 'admin', 'manager', 'accounts', 'sales_staff', 'graphic_designer'],
    create: ['super_admin', 'admin', 'manager', 'sales_staff'],
    edit: ['super_admin', 'admin', 'manager', 'sales_staff'],
    delete: ['super_admin', 'admin'],
  },
  // Module: invoices
  invoices: {
    view: ['super_admin', 'admin', 'manager', 'accounts', 'sales_staff'],
    create: ['super_admin', 'admin', 'manager', 'accounts'],
    edit: ['super_admin', 'admin', 'manager', 'accounts'],
    delete: ['super_admin', 'admin'],
  },
  // Module: price_calculations
  price_calculations: {
    view: ['super_admin', 'admin', 'manager', 'accounts', 'sales_staff', 'graphic_designer'],
    create: ['super_admin', 'admin', 'manager', 'sales_staff', 'graphic_designer'],
    edit: ['super_admin', 'admin', 'manager', 'sales_staff'],
    delete: ['super_admin', 'admin'],
  },
  // Module: expenses
  expenses: {
    view: ['super_admin', 'admin', 'manager', 'accounts'],
    create: ['super_admin', 'admin', 'manager', 'accounts'],
    edit: ['super_admin', 'admin', 'accounts'],
    delete: ['super_admin', 'admin'],
  },
  // Module: vendors
  vendors: {
    view: ['super_admin', 'admin', 'manager', 'accounts'],
    create: ['super_admin', 'admin', 'manager', 'accounts'],
    edit: ['super_admin', 'admin', 'accounts'],
    delete: ['super_admin', 'admin'],
  },
  // Module: employees (HR)
  employees: {
    view: ['super_admin', 'admin', 'manager'],
    create: ['super_admin', 'admin'],
    edit: ['super_admin', 'admin'],
    delete: ['super_admin', 'admin'],
  },
  // Module: attendance
  attendance: {
    view: ['super_admin', 'admin', 'manager', 'employee', 'graphic_designer', 'accounts', 'sales_staff'],
    create: ['super_admin', 'admin', 'manager'],
    edit: ['super_admin', 'admin'],
    delete: ['super_admin', 'admin'],
  },
  // Module: salary
  salary: {
    view: ['super_admin', 'admin', 'accounts'],
    create: ['super_admin', 'admin', 'accounts'],
    edit: ['super_admin', 'admin', 'accounts'],
    delete: ['super_admin', 'admin'],
  },
  // Module: leave
  leave: {
    view: ['super_admin', 'admin', 'manager', 'employee', 'graphic_designer', 'accounts', 'sales_staff'],
    create: ['super_admin', 'admin', 'manager', 'employee', 'graphic_designer', 'accounts', 'sales_staff'],
    edit: ['super_admin', 'admin', 'manager'],
    delete: ['super_admin', 'admin'],
  },
  // Module: performance
  performance: {
    view: ['super_admin', 'admin', 'manager'],
    create: ['super_admin', 'admin', 'manager'],
    edit: ['super_admin', 'admin', 'manager'],
    delete: ['super_admin', 'admin'],
  },
  // Module: tasks
  tasks: {
    view: ['super_admin', 'admin', 'manager', 'employee', 'graphic_designer', 'accounts', 'sales_staff'],
    create: ['super_admin', 'admin', 'manager'],
    edit: ['super_admin', 'admin', 'manager', 'employee', 'graphic_designer', 'accounts', 'sales_staff'],
    delete: ['super_admin', 'admin'],
  },
  // Module: reports
  reports: {
    view: ['super_admin', 'admin', 'manager', 'accounts'],
    create: ['super_admin', 'admin'],
    edit: ['super_admin', 'admin'],
    delete: ['super_admin', 'admin'],
  },
  // Module: settings
  settings: {
    view: ['super_admin', 'admin'],
    create: ['super_admin', 'admin'],
    edit: ['super_admin', 'admin'],
    delete: ['super_admin', 'admin'],
  },
  // Module: user_roles
  user_roles: {
    view: ['super_admin', 'admin'],
    create: ['super_admin', 'admin'],
    edit: ['super_admin', 'admin'],
    delete: ['super_admin', 'admin'],
  },
};

export type Module = keyof typeof permissions;
export type Action = 'view' | 'create' | 'edit' | 'delete';

export const hasPermission = (role: AppRole | null, module: Module, action: Action): boolean => {
  if (!role) return false;
  const modulePermissions = permissions[module];
  if (!modulePermissions) return false;
  return modulePermissions[action]?.includes(role) ?? false;
};

export const getRoleDisplayName = (role: AppRole): string => {
  const roleNames: Record<AppRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    manager: 'Manager',
    accounts: 'Accounts',
    sales_staff: 'Sales Staff',
    graphic_designer: 'Graphic Designer',
    employee: 'Employee',
  };
  return roleNames[role] || role;
};

export const allRoles: AppRole[] = ['super_admin', 'admin', 'manager', 'accounts', 'sales_staff', 'graphic_designer', 'employee'];

// Get all modules with their permissions for role management UI
export const getModulesWithPermissions = () => {
  return Object.entries(permissions).map(([module, actions]) => ({
    module: module as Module,
    moduleName: getModuleDisplayName(module as Module),
    actions: {
      view: actions.view,
      create: actions.create,
      edit: actions.edit,
      delete: actions.delete,
    },
  }));
};

export const getModuleDisplayName = (module: Module): string => {
  const moduleNames: Record<Module, string> = {
    customers: 'Customers',
    quotations: 'Quotations',
    invoices: 'Invoices',
    price_calculations: 'Price Calculations',
    expenses: 'Expenses',
    vendors: 'Vendors',
    employees: 'Employees',
    attendance: 'Attendance',
    salary: 'Salary',
    leave: 'Leave',
    performance: 'Performance',
    tasks: 'Tasks',
    reports: 'Reports',
    settings: 'Settings',
    user_roles: 'User Roles',
  };
  return moduleNames[module] || module;
};
