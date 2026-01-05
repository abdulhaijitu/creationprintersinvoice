import { useEffect, useState } from 'react';
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
  ChevronRight,
  User,
  BarChart3,
  Settings,
  UserCog,
  Truck,
  TrendingUp,
  CreditCard,
  Briefcase,
} from 'lucide-react';
import logo from '@/assets/logo.png';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, getRoleDisplayName } from '@/lib/permissions';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
          "relative h-9 transition-all duration-200",
          isActive && "bg-sidebar-primary/10 text-sidebar-primary font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-r-full before:bg-sidebar-primary"
        )}
      >
        <NavLink to={item.url} className="flex items-center gap-3 px-3">
          <div className="relative flex-shrink-0">
            <item.icon className={cn("h-[18px] w-[18px]", isActive && "text-sidebar-primary")} />
            {item.badge !== undefined && item.badge > 0 && collapsed && (
              <span className="absolute -top-1.5 -right-1.5 bg-sidebar-primary text-sidebar-primary-foreground text-[10px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center font-medium">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </div>
          {!collapsed && (
            <span className="flex-1 flex items-center justify-between text-sm">
              {item.title}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-sidebar-primary text-sidebar-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
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
  label: string;
  icon: React.ElementType;
  items: { title: string; url: string; icon: React.ElementType; badge?: number }[];
  defaultOpen?: boolean;
}

const NavGroup = ({ label, icon: GroupIcon, items, defaultOpen = false }: NavGroupProps) => {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const isGroupActive = items.some((item) => location.pathname === item.url || location.pathname.startsWith(item.url + '/'));
  const [isOpen, setIsOpen] = useState(defaultOpen || isGroupActive);

  // Keep group open when navigating to a child route
  useEffect(() => {
    if (isGroupActive && !isOpen) {
      setIsOpen(true);
    }
  }, [isGroupActive]);

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
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/collapsible">
      <SidebarGroup className="py-1">
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel 
            className={cn(
              "cursor-pointer rounded-md px-3 py-2 flex items-center gap-3 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors duration-200",
              isGroupActive && "text-sidebar-foreground"
            )}
          >
            <GroupIcon className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-xs font-semibold uppercase tracking-wider">{label}</span>
            <ChevronRight className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen && "rotate-90"
            )} />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent className="animate-accordion-down">
          <SidebarGroupContent className="pl-2 mt-1">
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
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
};

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut, role } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [pendingChallanCount, setPendingChallanCount] = useState(0);

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
    ...(hasPermission(role, 'invoices', 'view') ? [{ title: 'Delivery Challan', url: '/delivery-challans', icon: Truck, badge: pendingChallanCount }] : []),
    ...(hasPermission(role, 'quotations', 'view') ? [{ title: 'Quotations', url: '/quotations', icon: FileCheck }] : []),
    ...(hasPermission(role, 'price_calculations', 'view') ? [{ title: 'Price Calculation', url: '/price-calculation', icon: Calculator }] : []),
  ];

  const expenseItems = [
    ...(hasPermission(role, 'vendors', 'view') ? [{ title: 'Vendors', url: '/vendors', icon: Building2 }] : []),
    ...(hasPermission(role, 'expenses', 'view') ? [{ title: 'Expenses', url: '/expenses', icon: Wallet }] : []),
  ];

  const hrItems = [
    ...(hasPermission(role, 'employees', 'view') ? [{ title: 'Employees', url: '/employees', icon: Users }] : []),
    ...(hasPermission(role, 'attendance', 'view') ? [{ title: 'Attendance', url: '/attendance', icon: CalendarCheck }] : []),
    ...(hasPermission(role, 'salary', 'view') ? [{ title: 'Payroll', url: '/salary', icon: Receipt }] : []),
    ...(hasPermission(role, 'leave', 'view') ? [{ title: 'Leave Management', url: '/leave', icon: ClipboardList }] : []),
    ...(hasPermission(role, 'performance', 'view') ? [{ title: 'Performance', url: '/performance', icon: Award }] : []),
    ...(hasPermission(role, 'tasks', 'view') ? [{ title: 'Tasks', url: '/tasks', icon: ListTodo }] : []),
  ];

  const reportItems = [
    ...(hasPermission(role, 'reports', 'view') ? [{ title: 'Financial Reports', url: '/reports', icon: BarChart3 }] : []),
    ...(hasPermission(role, 'reports', 'view') ? [{ title: 'HR Reports', url: '/reports?tab=hr', icon: Users }] : []),
  ];

  const settingsItems = [
    ...(hasPermission(role, 'user_roles', 'view') ? [{ title: 'Role Management', url: '/user-roles', icon: UserCog }] : []),
    ...(hasPermission(role, 'settings', 'view') ? [{ title: 'System Settings', url: '/settings', icon: Settings }] : []),
    ...(hasPermission(role, 'settings', 'view') ? [{ title: 'Company Profile', url: '/settings?tab=company', icon: Building2 }] : []),
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      {/* Header */}
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className={cn(
          "flex items-center",
          collapsed ? "justify-center" : "gap-3"
        )}>
          <div className={cn(
            "flex items-center justify-center rounded-lg overflow-hidden flex-shrink-0",
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
              <span className="text-sm font-semibold text-sidebar-foreground truncate">
                Creation Printers
              </span>
              <span className="text-[11px] text-sidebar-muted truncate">
                {role ? getRoleDisplayName(role) : 'Loading...'}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-2 py-3">
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

        {/* Divider */}
        {!collapsed && <div className="mx-3 my-2 border-t border-sidebar-border" />}

        {/* Navigation Groups */}
        {salesItems.length > 0 && (
          <NavGroup 
            label="Sales & Billing" 
            icon={TrendingUp}
            items={salesItems} 
            defaultOpen 
          />
        )}
        {expenseItems.length > 0 && (
          <NavGroup 
            label="Expenses" 
            icon={CreditCard}
            items={expenseItems} 
          />
        )}
        {hrItems.length > 0 && (
          <NavGroup 
            label="HR & Workforce" 
            icon={Briefcase}
            items={hrItems} 
          />
        )}
        {reportItems.length > 0 && (
          <NavGroup 
            label="Reports" 
            icon={BarChart3}
            items={reportItems} 
          />
        )}
        {settingsItems.length > 0 && (
          <NavGroup 
            label="Settings" 
            icon={Settings}
            items={settingsItems} 
          />
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <div className={cn(
          "flex items-center",
          collapsed ? "justify-center" : "gap-3"
        )}>
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-sm font-medium">
              {user?.email ? getInitials(user.email) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-[11px] text-sidebar-muted truncate">
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
                className="shrink-0 h-8 w-8 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
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
