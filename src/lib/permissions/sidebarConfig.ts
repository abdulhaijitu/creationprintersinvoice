/**
 * Sidebar Navigation Configuration with Module-Based Permissions
 */

import {
  LayoutDashboard,
  FileText,
  Calculator,
  Wallet,
  UserRound,
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
  CreditCard,
  Target,
  FileCheck,
} from 'lucide-react';
import { PermissionCategory } from './modulePermissions';

export interface SidebarNavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  permissionKey?: string;
  requiresAnyPermission?: boolean;
}

export interface SidebarNavGroup {
  label: string;
  category: PermissionCategory;
  items: SidebarNavItem[];
}

// MAIN
export const mainNavItems: SidebarNavItem[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, permissionKey: 'main.dashboard', requiresAnyPermission: true },
];

// INVOICES
export const invoicesNavItems: SidebarNavItem[] = [
  { title: 'Customers', url: '/customers', icon: UserRound, permissionKey: 'business.customers' },
  { title: 'Invoices', url: '/invoices', icon: FileText, permissionKey: 'main.invoices' },
  { title: 'Payments', url: '/payments', icon: CreditCard, permissionKey: 'main.payments' },
  { title: 'Challans', url: '/delivery-challans', icon: Truck, permissionKey: 'main.challan' },
];

// MARKETING
export const marketingNavItems: SidebarNavItem[] = [
  { title: 'Leads', url: '/leads', icon: Target, permissionKey: 'marketing.leads' },
  { title: 'Price Calc', url: '/price-calculation', icon: Calculator, permissionKey: 'main.price_calculation' },
  { title: 'Quotations', url: '/quotations', icon: FileCheck, permissionKey: 'main.quotations' },
];

// VENDORS
export const vendorsNavItems: SidebarNavItem[] = [
  { title: 'Vendors', url: '/vendors', icon: Building2, permissionKey: 'business.vendors' },
  { title: 'Expense', url: '/expenses', icon: Wallet, permissionKey: 'business.expenses' },
];

// HUMAN RESOURCE
export const hrNavItems: SidebarNavItem[] = [
  { title: 'Employee', url: '/employees', icon: Users, permissionKey: 'hr.employees' },
  { title: 'Attendance', url: '/attendance', icon: CalendarCheck, permissionKey: 'hr.attendance' },
  { title: 'Salary', url: '/salary', icon: Receipt, permissionKey: 'hr.salary' },
  { title: 'Leave', url: '/leave', icon: ClipboardList, permissionKey: 'hr.leave' },
  { title: 'Performance', url: '/performance', icon: Award, permissionKey: 'hr.performance' },
  { title: 'Tasks', url: '/tasks', icon: ListTodo, permissionKey: 'hr.tasks' },
];

// SYSTEM
export const settingsNavItems: SidebarNavItem[] = [
  { title: 'Reports', url: '/reports', icon: BarChart3, permissionKey: 'system.reports' },
  { title: 'Team', url: '/team-members', icon: UserCog, permissionKey: 'system.team' },
  { title: 'Settings', url: '/settings', icon: Settings, permissionKey: 'system.settings' },
];

export const sidebarNavGroups: SidebarNavGroup[] = [
  { label: 'Main', category: 'main', items: mainNavItems },
  { label: 'Invoices', category: 'invoices', items: invoicesNavItems },
  { label: 'Marketing', category: 'marketing', items: marketingNavItems },
  { label: 'Vendors', category: 'vendors', items: vendorsNavItems },
  { label: 'Human Resource', category: 'hr_ops', items: hrNavItems },
  { label: 'System', category: 'system', items: settingsNavItems },
];

export function getSidebarPermissionKeys(): string[] {
  const keys = new Set<string>();
  for (const group of sidebarNavGroups) {
    for (const item of group.items) {
      if (item.permissionKey) keys.add(item.permissionKey);
    }
  }
  return Array.from(keys);
}

export function getRoutePermissionMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const group of sidebarNavGroups) {
    for (const item of group.items) {
      if (item.permissionKey) map.set(item.url, item.permissionKey);
    }
  }
  return map;
}
