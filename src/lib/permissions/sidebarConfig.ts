/**
 * Sidebar Navigation Configuration with Module-Based Permissions
 * 
 * This file defines all sidebar menu items and their required module permissions.
 * The sidebar dynamically shows/hides items based on user's module permissions.
 * 
 * CRITICAL RULES (ANY-ON AGGREGATION):
 * - For each sidebar module: if user has AT LEAST ONE permission (view/create/edit/delete)
 *   enabled inside that module → SHOW the module in sidebar
 * - If user has ZERO permissions enabled inside that module → HIDE completely
 * - No disabled or greyed-out menu items - completely hidden
 * - Sidebar MUST be generated from permission data, NOT hardcoded role checks
 * 
 * DASHBOARD SPECIAL RULE:
 * - Dashboard appears ONLY if user has at least ONE enabled permission across the entire system
 */

import {
  LayoutDashboard,
  FileText,
  FileCheck,
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
} from 'lucide-react';
import { PermissionCategory, ModulePermission, CATEGORY_DISPLAY } from './modulePermissions';

export interface SidebarNavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  /** 
   * Required module permission key. Format: "category.module" (e.g., "main.invoices", "business.customers")
   * The sidebar visibility is determined by ANY-ON rule:
   * - If user has ANY permission (view, create, edit, delete) for this module → show
   * - If user has ZERO permissions for this module → hide completely
   */
  permissionKey?: string;
  /** If true, this item requires at least one permission anywhere (for Dashboard) */
  requiresAnyPermission?: boolean;
}

export interface SidebarNavGroup {
  label: string;
  category: PermissionCategory;
  items: SidebarNavItem[];
}

/**
 * Main navigation items with module permission requirements
 * Category: main
 * 
 * NOTE: Dashboard uses requiresAnyPermission=true (special rule)
 * - Shows if user has at least ONE permission anywhere in the system
 */
export const mainNavItems: SidebarNavItem[] = [
  { 
    title: 'Dashboard', 
    url: '/', 
    icon: LayoutDashboard,
    permissionKey: 'main.dashboard',
    requiresAnyPermission: true, // Special: show if user has ANY permission in system
  },
  { 
    title: 'Invoices', 
    url: '/invoices', 
    icon: FileText,
    permissionKey: 'main.invoices',
  },
  { 
    title: 'Payments', 
    url: '/payments', 
    icon: CreditCard,
    permissionKey: 'main.payments',
  },
  { 
    title: 'Quotations', 
    url: '/quotations', 
    icon: FileCheck,
    permissionKey: 'main.quotations',
  },
  { 
    title: 'Price Calc', 
    url: '/price-calculation', 
    icon: Calculator,
    permissionKey: 'main.price_calculation',
  },
  { 
    title: 'Challans', 
    url: '/delivery-challans', 
    icon: Truck,
    permissionKey: 'main.challan',
  },
];

/**
 * Business navigation items with module permission requirements
 * Category: business
 */
export const businessNavItems: SidebarNavItem[] = [
  { 
    title: 'Customers', 
    url: '/customers', 
    icon: UserRound,
    permissionKey: 'business.customers',
  },
  { 
    title: 'Vendors', 
    url: '/vendors', 
    icon: Building2,
    permissionKey: 'business.vendors',
  },
  { 
    title: 'Expenses', 
    url: '/expenses', 
    icon: Wallet,
    permissionKey: 'business.expenses',
  },
];

/**
 * HR & Operations navigation items with module permission requirements
 * Category: hr_ops
 */
export const hrNavItems: SidebarNavItem[] = [
  { 
    title: 'Employees', 
    url: '/employees', 
    icon: Users,
    permissionKey: 'hr.employees',
  },
  { 
    title: 'Attendance', 
    url: '/attendance', 
    icon: CalendarCheck,
    permissionKey: 'hr.attendance',
  },
  { 
    title: 'Salary', 
    url: '/salary', 
    icon: Receipt,
    permissionKey: 'hr.salary',
  },
  { 
    title: 'Leave', 
    url: '/leave', 
    icon: ClipboardList,
    permissionKey: 'hr.leave',
  },
  { 
    title: 'Performance', 
    url: '/performance', 
    icon: Award,
    permissionKey: 'hr.performance',
  },
  { 
    title: 'Tasks', 
    url: '/tasks', 
    icon: ListTodo,
    permissionKey: 'hr.tasks',
  },
];

/**
 * System/Settings navigation items with module permission requirements
 * Category: system
 */
export const settingsNavItems: SidebarNavItem[] = [
  { 
    title: 'Reports', 
    url: '/reports', 
    icon: BarChart3,
    permissionKey: 'system.reports',
  },
  { 
    title: 'Team', 
    url: '/team-members', 
    icon: UserCog,
    permissionKey: 'system.team',
  },
  { 
    title: 'Settings', 
    url: '/settings', 
    icon: Settings,
    permissionKey: 'system.settings',
  },
];

/**
 * All navigation groups for the sidebar
 */
export const sidebarNavGroups: SidebarNavGroup[] = [
  { label: 'Main', category: 'main', items: mainNavItems },
  { label: 'Business', category: 'business', items: businessNavItems },
  { label: 'HR & Ops', category: 'hr_ops', items: hrNavItems },
  { label: 'System', category: 'system', items: settingsNavItems },
];

/**
 * Get all unique permission keys from sidebar config
 */
export function getSidebarPermissionKeys(): string[] {
  const keys = new Set<string>();
  
  for (const group of sidebarNavGroups) {
    for (const item of group.items) {
      if (item.permissionKey) {
        keys.add(item.permissionKey);
      }
    }
  }
  
  return Array.from(keys);
}

/**
 * Get route to permission key mapping
 */
export function getRoutePermissionMap(): Map<string, string> {
  const map = new Map<string, string>();
  
  for (const group of sidebarNavGroups) {
    for (const item of group.items) {
      if (item.permissionKey) {
        map.set(item.url, item.permissionKey);
      }
    }
  }
  
  return map;
}
