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
  Bell,
  FileBarChart,
  Palette,
} from 'lucide-react';
import whiteLogo from '@/assets/white-logo.png';
import logoIcon from '@/assets/logo-icon.jpg';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useOrgPermissions } from '@/hooks/useOrgPermissions';
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
import { OrganizationSwitcher } from './OrganizationSwitcher';

interface NavItemProps {
  item: { title: string; url: string; icon: React.ElementType; badge?: number };
  isActive: boolean;
}

const NavItem = ({ item, isActive }: NavItemProps) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  
  const linkContent = (
    <NavLink 
      to={item.url} 
      className={cn(
        "flex items-center w-full transition-all duration-200",
        collapsed ? "justify-center px-0" : "gap-3 px-3"
      )}
    >
      <div className={cn(
        "relative flex items-center justify-center flex-shrink-0",
        collapsed ? "h-8 w-8" : "h-5 w-5"
      )}>
        <item.icon className={cn(
          "h-[18px] w-[18px] transition-colors duration-200",
          isActive ? "text-primary" : "text-slate-400 group-hover:text-white"
        )} />
        {item.badge !== undefined && item.badge > 0 && collapsed && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[9px] h-3.5 min-w-3.5 px-0.5 rounded-full flex items-center justify-center font-medium leading-none">
            {item.badge > 9 ? '9+' : item.badge}
          </span>
        )}
      </div>
      <span className={cn(
        "flex-1 flex items-center justify-between text-sm whitespace-nowrap transition-all duration-200",
        collapsed ? "w-0 opacity-0 overflow-hidden" : "opacity-100"
      )}>
        {item.title}
        {item.badge !== undefined && item.badge > 0 && (
          <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium ml-2">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </span>
    </NavLink>
  );
  
  const menuItem = (
    <SidebarMenuItem className="group">
      <SidebarMenuButton 
        asChild 
        isActive={isActive}
        className={cn(
          "relative transition-all duration-200 rounded-lg",
          collapsed 
            ? "h-10 w-10 mx-auto p-0 flex items-center justify-center" 
            : "h-10 mx-1 px-0",
          "text-slate-400 hover:text-white hover:bg-white/10",
          isActive && cn(
            "bg-gradient-to-r from-primary/20 to-primary/10 text-white font-medium",
            collapsed ? "ring-2 ring-primary/30" : "border-l-2 border-primary"
          )
        )}
      >
        {linkContent}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          {menuItem}
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          sideOffset={8}
          className="flex items-center gap-2 bg-slate-800 text-white border-slate-700"
        >
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

  return menuItem;
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

  // Collapsed state - show icons only with tooltips, centered
  if (collapsed) {
    return (
      <SidebarGroup className="py-1 px-0">
        <SidebarGroupContent className="flex flex-col items-center">
          <SidebarMenu className="w-full flex flex-col items-center gap-1">
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
  const { user, signOut, isSuperAdmin } = useAuth();
  const { organization } = useOrganization();
  const { appName, branding, isLoaded: brandingLoaded } = useBranding();
  const { permissions, loading } = useOrgPermissions();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [pendingChallanCount, setPendingChallanCount] = useState(0);
  
  // Use white-label logo if available, otherwise use new white logo
  const logoUrl = branding.logo_url || whiteLogo;
  const logoIconUrl = branding.logo_url || logoIcon;
  
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
      { id: 'settings', paths: ['/user-roles', '/settings', '/team-members', '/usage', '/notification-settings', '/white-label', '/billing'] },
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

  // Dashboard - Always visible if permission granted
  const mainNavItems = permissions.dashboard ? [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  ] : [];

  // Build navigation items based on permissions
  const salesItems = [
    ...(permissions.customers ? [{ title: 'Customers', url: '/customers', icon: Users }] : []),
    ...(permissions.invoices ? [{ title: 'Invoices', url: '/invoices', icon: FileText }] : []),
    ...(permissions.quotations ? [{ title: 'Quotations', url: '/quotations', icon: FileCheck }] : []),
    ...(permissions.deliveryChallans ? [{ title: 'Delivery Challans', url: '/delivery-challans', icon: Truck, badge: pendingChallanCount }] : []),
    ...(permissions.priceCalculations ? [{ title: 'Price Calculations', url: '/price-calculation', icon: Calculator }] : []),
  ];

  const expenseItems = [
    ...(permissions.vendors ? [{ title: 'Vendors', url: '/vendors', icon: Building2 }] : []),
    ...(permissions.expensesList ? [{ title: 'Expenses', url: '/expenses', icon: Wallet }] : []),
  ];

  const hrItems = [
    ...(permissions.employees ? [{ title: 'Employees', url: '/employees', icon: Users }] : []),
    ...(permissions.attendance ? [{ title: 'Attendance', url: '/attendance', icon: CalendarCheck }] : []),
    ...(permissions.leaveManagement ? [{ title: 'Leave Management', url: '/leave', icon: ClipboardList }] : []),
    ...(permissions.payroll ? [{ title: 'Payroll', url: '/salary', icon: Receipt }] : []),
    ...(permissions.performance ? [{ title: 'Performance', url: '/performance', icon: Award }] : []),
    ...(permissions.tasks ? [{ title: 'Tasks', url: '/tasks', icon: ListTodo }] : []),
  ];

  const reportItems = [
    ...(permissions.financialReports ? [{ title: 'Financial Reports', url: '/reports', icon: BarChart3 }] : []),
    ...(permissions.hrReports ? [{ title: 'HR Reports', url: '/reports?tab=hr', icon: FileBarChart }] : []),
  ];

  const settingsItems = [
    ...(permissions.roleManagement ? [{ title: 'Role Management', url: '/user-roles', icon: UserCog }] : []),
    ...(permissions.organizationSettings ? [{ title: 'Organization Settings', url: '/settings', icon: Settings }] : []),
    ...(permissions.teamMembers ? [{ title: 'Team Members', url: '/team-members', icon: Users }] : []),
    ...(permissions.usageLimits ? [{ title: 'Usage & Limits', url: '/usage', icon: BarChart3 }] : []),
    ...(permissions.notifications ? [{ title: 'Notifications', url: '/notification-settings', icon: Bell }] : []),
    ...(permissions.whiteLabel ? [{ title: 'White-Label', url: '/white-label', icon: Palette }] : []),
    ...(permissions.billing ? [{ title: 'Billing', url: '/billing', icon: CreditCard }] : []),
    ...(isSuperAdmin ? [{ title: 'Platform Admin', url: '/admin', icon: Building2 }] : []),
  ];

  // Show skeleton while loading
  if (loading && !isSuperAdmin) {
    return (
      <Sidebar 
        collapsible="icon" 
        className="border-r border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950"
      >
        <SidebarHeader className="p-4 border-b border-slate-800">
          <div className="h-10 w-24 bg-slate-800 rounded animate-pulse" />
        </SidebarHeader>
        <SidebarContent className="px-2 py-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 mx-1 mb-2 bg-slate-800/50 rounded animate-pulse" />
          ))}
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950"
    >
      {/* Header */}
      <SidebarHeader className={cn(
        "border-b border-slate-800 transition-all duration-200",
        collapsed ? "px-2 py-4" : "px-4 py-5"
      )}>
        <div className={cn(
          "flex items-center justify-center transition-all duration-200",
          collapsed ? "h-10 w-full" : "h-9 w-full justify-start"
        )}>
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden bg-white/10 p-1.5 cursor-pointer hover:bg-white/15 transition-colors">
                  <img 
                    src={logoIconUrl} 
                    alt={appName} 
                    className="h-full w-full object-contain rounded-lg"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8} className="bg-slate-800 text-white border-slate-700">
                {appName}
              </TooltipContent>
            </Tooltip>
          ) : (
            <img 
              src={logoUrl} 
              alt={appName} 
              className="h-9 max-h-9 w-auto object-contain drop-shadow-sm"
            />
          )}
        </div>
      </SidebarHeader>

      {/* Organization Switcher (multi-org users only) */}
      <OrganizationSwitcher />

      {/* Navigation */}
      <SidebarContent className={cn(
        "py-3 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent overflow-x-hidden",
        collapsed ? "px-1" : "px-2"
      )}>
        {/* Dashboard - Always visible if permitted */}
        {mainNavItems.length > 0 && (
          <SidebarGroup className={cn("py-1", collapsed && "px-0")}>
            <SidebarGroupContent className={cn(collapsed && "flex flex-col items-center")}>
              <SidebarMenu className={cn(collapsed && "w-full flex flex-col items-center")}>
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
        )}

        {/* Favorites */}
        <FavoritePages />

        {/* Divider */}
        {!collapsed && <div className="mx-3 my-3 border-t border-slate-800" />}

        {/* Navigation Groups - Only show if menu access is granted */}
        {permissions.salesBilling && salesItems.length > 0 && (
          <NavGroup 
            id="sales"
            label="Sales & Billing" 
            icon={TrendingUp}
            items={salesItems}
            expandedGroup={expandedGroup}
            onToggle={handleToggleGroup}
          />
        )}
        {permissions.expenses && expenseItems.length > 0 && (
          <NavGroup 
            id="expenses"
            label="Expenses" 
            icon={CreditCard}
            items={expenseItems}
            expandedGroup={expandedGroup}
            onToggle={handleToggleGroup}
          />
        )}
        {permissions.hrWorkforce && hrItems.length > 0 && (
          <NavGroup 
            id="hr"
            label="HR & Workforce" 
            icon={Briefcase}
            items={hrItems}
            expandedGroup={expandedGroup}
            onToggle={handleToggleGroup}
          />
        )}
        {permissions.reports && reportItems.length > 0 && (
          <NavGroup 
            id="reports"
            label="Reports" 
            icon={BarChart3}
            items={reportItems}
            expandedGroup={expandedGroup}
            onToggle={handleToggleGroup}
          />
        )}
        {(permissions.settings || isSuperAdmin) && settingsItems.length > 0 && (
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
      <SidebarFooter className={cn(
        "border-t border-slate-800 transition-all duration-200",
        collapsed ? "p-2" : "p-3"
      )}>
        <div className={cn(
          "flex items-center transition-all duration-200",
          collapsed ? "flex-col gap-2 justify-center" : "gap-3"
        )}>
          {collapsed ? (
            <>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-slate-700 cursor-pointer hover:ring-primary/50 transition-all">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                      {user?.email ? getInitials(user.email) : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="bg-slate-800 text-white border-slate-700">
                  <div className="flex flex-col">
                    <span className="font-medium">{user?.email?.split('@')[0]}</span>
                    <span className="text-xs text-slate-400">{user?.email}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={signOut}
                    className="h-9 w-9 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="bg-slate-800 text-white border-slate-700">
                  Logout
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-slate-700">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {user?.email ? getInitials(user.email) : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.email?.split('@')[0]}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
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
                <TooltipContent side="right" sideOffset={8} className="bg-slate-800 text-white border-slate-700">
                  Logout
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
