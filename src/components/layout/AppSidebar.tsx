import { useEffect, useState, useCallback } from 'react';
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
  LogOut,
  ChevronDown,
  User,
  BarChart3,
  Settings,
  UserCog,
  Truck,
  TrendingUp,
  CreditCard,
  Briefcase,
  FileBarChart,
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { hasPermission, getRoleDisplayName } from '@/lib/permissions';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FavoritePages } from './FavoritePages';

interface NavItemProps {
  item: { title: string; url: string; icon: React.ElementType; badge?: number };
  isActive: boolean;
}

const NavItem = ({ item, isActive }: NavItemProps) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  
  const content = (
    <SidebarMenuItem>
      <SidebarMenuButton 
        asChild 
        isActive={isActive}
        className={cn(
          "relative h-10 transition-all duration-200 rounded-lg mx-1",
          "text-slate-400 hover:text-white hover:bg-white/5",
          isActive && "bg-gradient-to-r from-primary/20 to-primary/5 text-white font-medium border-l-2 border-primary"
        )}
      >
        <NavLink to={item.url} className="flex items-center gap-3 px-3">
          <div className="relative flex-shrink-0">
            <item.icon className={cn("h-[18px] w-[18px]", isActive && "text-primary")} />
            {item.badge !== undefined && item.badge > 0 && collapsed && (
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center font-medium">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </div>
          {!collapsed && (
            <span className="flex-1 flex items-center justify-between text-sm">
              {item.title}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {item.title}
          {item.badge !== undefined && item.badge > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
              {item.badge}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
};

interface NavGroupProps {
  id: string;
  label: string;
  icon: React.ElementType;
  items: { title: string; url: string; icon: React.ElementType; badge?: number }[];
  expandedGroup: string | null;
  onToggle: (id: string) => void;
}

const NavGroup = ({ id, label, icon: GroupIcon, items, expandedGroup, onToggle }: NavGroupProps) => {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const isGroupActive = items.some((item) => location.pathname === item.url || location.pathname.startsWith(item.url + '/'));
  const isOpen = expandedGroup === id;

  if (items.length === 0) return null;

  // Collapsed state - show icons only with tooltips
  if (collapsed) {
    return (
      <SidebarGroup className="py-1">
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <NavItem
                key={item.url}
                item={item}
                isActive={location.pathname === item.url || location.pathname.startsWith(item.url + '/')}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup className="py-1">
      <button
        onClick={() => onToggle(id)}
        className={cn(
          "w-full cursor-pointer rounded-lg px-3 py-2.5 mx-1 flex items-center gap-3",
          "text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200",
          isGroupActive && "text-white"
        )}
      >
        <GroupIcon className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-left">{label}</span>
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform duration-300 ease-out",
          isOpen && "rotate-180"
        )} />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <SidebarGroupContent className="pl-3 mt-1">
          <SidebarMenu>
            {items.map((item) => (
              <NavItem
                key={item.url}
                item={item}
                isActive={location.pathname === item.url || location.pathname.startsWith(item.url + '/')}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </div>
    </SidebarGroup>
  );
};

const SIDEBAR_STATE_KEY = 'erp-sidebar-expanded-group';

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut, role, isSuperAdmin } = useAuth();
  const { organization, orgRole } = useOrganization();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [pendingChallanCount, setPendingChallanCount] = useState(0);
  
  // Remember last expanded group
  const [expandedGroup, setExpandedGroup] = useState<string | null>(() => {
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
    return saved || 'sales';
  });

  const handleToggleGroup = useCallback((groupId: string) => {
    setExpandedGroup(prev => {
      const newValue = prev === groupId ? null : groupId;
      if (newValue) {
        localStorage.setItem(SIDEBAR_STATE_KEY, newValue);
      } else {
        localStorage.removeItem(SIDEBAR_STATE_KEY);
      }
      return newValue;
    });
  }, []);

  // Auto-expand group when navigating to a child route
  useEffect(() => {
    const groups = [
      { id: 'sales', paths: ['/customers', '/invoices', '/quotations', '/delivery-challans', '/price-calculation'] },
      { id: 'expenses', paths: ['/vendors', '/expenses'] },
      { id: 'hr', paths: ['/employees', '/attendance', '/leave', '/salary', '/performance', '/tasks'] },
      { id: 'reports', paths: ['/reports'] },
      { id: 'settings', paths: ['/user-roles', '/settings'] },
    ];

    for (const group of groups) {
      if (group.paths.some(p => location.pathname.startsWith(p))) {
        setExpandedGroup(group.id);
        localStorage.setItem(SIDEBAR_STATE_KEY, group.id);
        break;
      }
    }
  }, [location.pathname]);

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  // Fetch pending challan count with realtime updates
  useEffect(() => {
    const fetchPendingCount = async () => {
      const { count } = await supabase
        .from('delivery_challans')
        .select('*', { count: 'exact', head: true })
        .in('status', ['draft', 'dispatched']);
      
      setPendingChallanCount(count || 0);
    };

    fetchPendingCount();

    const channel = supabase
      .channel('sidebar_challan_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_challans',
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Build navigation items based on permissions
  const mainNavItems = [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  ];

  const salesItems = [
    ...(hasPermission(role, 'customers', 'view') ? [{ title: 'Customers', url: '/customers', icon: Users }] : []),
    ...(hasPermission(role, 'invoices', 'view') ? [{ title: 'Invoices', url: '/invoices', icon: FileText }] : []),
    ...(hasPermission(role, 'quotations', 'view') ? [{ title: 'Quotations', url: '/quotations', icon: FileCheck }] : []),
    ...(hasPermission(role, 'invoices', 'view') ? [{ title: 'Delivery Challans', url: '/delivery-challans', icon: Truck, badge: pendingChallanCount }] : []),
    ...(hasPermission(role, 'price_calculations', 'view') ? [{ title: 'Price Calculations', url: '/price-calculation', icon: Calculator }] : []),
  ];

  const expenseItems = [
    ...(hasPermission(role, 'vendors', 'view') ? [{ title: 'Vendors', url: '/vendors', icon: Building2 }] : []),
    ...(hasPermission(role, 'expenses', 'view') ? [{ title: 'Expenses', url: '/expenses', icon: Wallet }] : []),
  ];

  const hrItems = [
    ...(hasPermission(role, 'employees', 'view') ? [{ title: 'Employees', url: '/employees', icon: Users }] : []),
    ...(hasPermission(role, 'attendance', 'view') ? [{ title: 'Attendance', url: '/attendance', icon: CalendarCheck }] : []),
    ...(hasPermission(role, 'leave', 'view') ? [{ title: 'Leave Management', url: '/leave', icon: ClipboardList }] : []),
    ...(hasPermission(role, 'salary', 'view') ? [{ title: 'Payroll', url: '/salary', icon: Receipt }] : []),
    ...(hasPermission(role, 'performance', 'view') ? [{ title: 'Performance', url: '/performance', icon: Award }] : []),
    ...(hasPermission(role, 'tasks', 'view') ? [{ title: 'Tasks', url: '/tasks', icon: ListTodo }] : []),
  ];

  const reportItems = [
    ...(hasPermission(role, 'reports', 'view') ? [{ title: 'Financial Reports', url: '/reports', icon: BarChart3 }] : []),
    ...(hasPermission(role, 'reports', 'view') ? [{ title: 'HR Reports', url: '/reports?tab=hr', icon: FileBarChart }] : []),
  ];

  const settingsItems = [
    ...(hasPermission(role, 'user_roles', 'view') ? [{ title: 'Role Management', url: '/user-roles', icon: UserCog }] : []),
    ...(hasPermission(role, 'settings', 'view') ? [{ title: 'Organization Settings', url: '/settings', icon: Settings }] : []),
    { title: 'Team Members', url: '/team-members', icon: Users },
    { title: 'Usage & Limits', url: '/usage', icon: BarChart3 },
    ...(orgRole === 'owner' ? [{ title: 'Billing', url: '/billing', icon: CreditCard }] : []),
    ...(isSuperAdmin ? [{ title: 'Platform Admin', url: '/admin', icon: Building2 }] : []),
  ];

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950"
    >
      {/* Header */}
      <SidebarHeader className="p-4 border-b border-slate-800">
        <div className={cn(
          "flex items-center",
          collapsed ? "justify-center" : "gap-3"
        )}>
          <div className={cn(
            "flex items-center justify-center rounded-xl overflow-hidden flex-shrink-0 bg-white/10 p-1.5",
            collapsed ? "h-10 w-10" : "h-10 w-10"
          )}>
            <img 
              src={logo} 
              alt="Logo" 
              className="h-full w-full object-contain"
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white truncate">
                {organization?.name || 'PrintoSaaS'}
              </span>
              <span className="text-[11px] text-slate-400 truncate">
                {orgRole ? `${orgRole.charAt(0).toUpperCase() + orgRole.slice(1)}` : (role ? getRoleDisplayName(role) : 'Loading...')}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-2 py-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {/* Dashboard - Always visible */}
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <NavItem
                  key={item.url}
                  item={item}
                  isActive={location.pathname === item.url}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Favorites */}
        <FavoritePages />

        {/* Divider */}
        {!collapsed && <div className="mx-3 my-3 border-t border-slate-800" />}

        {/* Navigation Groups */}
        {salesItems.length > 0 && (
          <NavGroup 
            id="sales"
            label="Sales & Billing" 
            icon={TrendingUp}
            items={salesItems}
            expandedGroup={expandedGroup}
            onToggle={handleToggleGroup}
          />
        )}
        {expenseItems.length > 0 && (
          <NavGroup 
            id="expenses"
            label="Expenses" 
            icon={CreditCard}
            items={expenseItems}
            expandedGroup={expandedGroup}
            onToggle={handleToggleGroup}
          />
        )}
        {hrItems.length > 0 && (
          <NavGroup 
            id="hr"
            label="HR & Workforce" 
            icon={Briefcase}
            items={hrItems}
            expandedGroup={expandedGroup}
            onToggle={handleToggleGroup}
          />
        )}
        {reportItems.length > 0 && (
          <NavGroup 
            id="reports"
            label="Reports" 
            icon={BarChart3}
            items={reportItems}
            expandedGroup={expandedGroup}
            onToggle={handleToggleGroup}
          />
        )}
        {settingsItems.length > 0 && (
          <NavGroup 
            id="settings"
            label="Settings" 
            icon={Settings}
            items={settingsItems}
            expandedGroup={expandedGroup}
            onToggle={handleToggleGroup}
          />
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-3 border-t border-slate-800">
        <div className={cn(
          "flex items-center",
          collapsed ? "justify-center" : "gap-3"
        )}>
          <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-slate-700">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {user?.email ? getInitials(user.email) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {user?.email}
              </p>
            </div>
          )}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="shrink-0 h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Logout</TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
