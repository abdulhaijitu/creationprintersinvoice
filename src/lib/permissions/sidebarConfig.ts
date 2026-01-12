/**
 * Sidebar Navigation Configuration with Permission Requirements
 * 
 * This file defines all sidebar menu items with their required permissions.
 * The sidebar dynamically shows/hides items based on user permissions.
 */

import {
  LayoutDashboard,
  FileText,
  FileCheck,
  Calculator,
  Wallet,
  Users,
  CalendarCheck,
  Receipt,
  ClipboardList,
  Award,
  ListTodo,
  Building2,
  BarChart3,
  Settings,
  Truck,
  UserCog,
} from 'lucide-react';
import { PermissionModule, PermissionAction } from './constants';

export interface SidebarNavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Required permission - [module, action]. If not specified, item is always shown. */
  permission?: [PermissionModule, PermissionAction];
}

export interface SidebarNavGroup {
  label: string;
  items: SidebarNavItem[];
}

/**
 * Main navigation items with permission requirements
 */
export const mainNavItems: SidebarNavItem[] = [
  { 
    title: 'Dashboard', 
    url: '/', 
    icon: LayoutDashboard,
    permission: ['dashboard', 'view'],
  },
  { 
    title: 'Invoices', 
    url: '/invoices', 
    icon: FileText,
    permission: ['invoices', 'view'],
  },
  { 
    title: 'Quotations', 
    url: '/quotations', 
    icon: FileCheck,
    permission: ['quotations', 'view'],
  },
  { 
    title: 'Price Calc', 
    url: '/price-calculation', 
    icon: Calculator,
    permission: ['price_calculations', 'view'],
  },
  { 
    title: 'Challans', 
    url: '/delivery-challans', 
    icon: Truck,
    permission: ['delivery_challans', 'view'],
  },
];

/**
 * Business navigation items with permission requirements
 */
export const businessNavItems: SidebarNavItem[] = [
  { 
    title: 'Customers', 
    url: '/customers', 
    icon: Users,
    permission: ['customers', 'view'],
  },
  { 
    title: 'Vendors', 
    url: '/vendors', 
    icon: Building2,
    permission: ['vendors', 'view'],
  },
  { 
    title: 'Expenses', 
    url: '/expenses', 
    icon: Wallet,
    permission: ['expenses', 'view'],
  },
];

/**
 * HR & Operations navigation items with permission requirements
 */
export const hrNavItems: SidebarNavItem[] = [
  { 
    title: 'Employees', 
    url: '/employees', 
    icon: Users,
    permission: ['employees', 'view'],
  },
  { 
    title: 'Attendance', 
    url: '/attendance', 
    icon: CalendarCheck,
    permission: ['attendance', 'view'],
  },
  { 
    title: 'Salary', 
    url: '/salary', 
    icon: Receipt,
    permission: ['salary', 'view'],
  },
  { 
    title: 'Leave', 
    url: '/leave', 
    icon: ClipboardList,
    permission: ['leave', 'view'],
  },
  { 
    title: 'Performance', 
    url: '/performance', 
    icon: Award,
    // Performance doesn't have a specific module, show for managers+
  },
  { 
    title: 'Tasks', 
    url: '/tasks', 
    icon: ListTodo,
    permission: ['tasks', 'view'],
  },
];

/**
 * System/Settings navigation items with permission requirements
 */
export const settingsNavItems: SidebarNavItem[] = [
  { 
    title: 'Reports', 
    url: '/reports', 
    icon: BarChart3,
    permission: ['reports', 'view'],
  },
  { 
    title: 'Team', 
    url: '/team-members', 
    icon: UserCog,
    permission: ['team_members', 'view'],
  },
  { 
    title: 'Settings', 
    url: '/settings', 
    icon: Settings,
    permission: ['settings', 'view'],
  },
];

/**
 * All navigation groups for the sidebar
 */
export const sidebarNavGroups: SidebarNavGroup[] = [
  { label: 'Main', items: mainNavItems },
  { label: 'Business', items: businessNavItems },
  { label: 'HR & Ops', items: hrNavItems },
  { label: 'System', items: settingsNavItems },
];
