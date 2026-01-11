import { useCallback, useRef, useEffect } from 'react';
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
  User,
  BarChart3,
  Settings,
  Truck,
  UserCog,
} from 'lucide-react';
import whiteLogo from '@/assets/white-logo.png';
import logoIcon from '@/assets/logo-icon.jpg';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FavoritePages } from './FavoritePages';

const mainNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Invoices', url: '/invoices', icon: FileText },
  { title: 'Quotations', url: '/quotations', icon: FileCheck },
  { title: 'Price Calc', url: '/price-calculation', icon: Calculator },
  { title: 'Challans', url: '/delivery-challans', icon: Truck },
];

const businessNavItems = [
  { title: 'Customers', url: '/customers', icon: Users },
  { title: 'Vendors', url: '/vendors', icon: Building2 },
  { title: 'Expenses', url: '/expenses', icon: Wallet },
];

const hrNavItems = [
  { title: 'Employees', url: '/employees', icon: Users },
  { title: 'Attendance', url: '/attendance', icon: CalendarCheck },
  { title: 'Salary', url: '/salary', icon: Receipt },
  { title: 'Leave', url: '/leave', icon: ClipboardList },
  { title: 'Performance', url: '/performance', icon: Award },
  { title: 'Tasks', url: '/tasks', icon: ListTodo },
];

const settingsNavItems = [
  { title: 'Reports', url: '/reports', icon: BarChart3 },
  { title: 'Team', url: '/team-members', icon: UserCog },
  { title: 'Settings', url: '/settings', icon: Settings },
];

// Flatten all nav items for keyboard navigation
const allNavItems = [
  ...mainNavItems,
  ...businessNavItems,
  ...hrNavItems,
  ...settingsNavItems,
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { organization } = useOrganization();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  
  // Ref to track menu items for keyboard navigation
  const menuItemsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const navContainerRef = useRef<HTMLElement>(null);

  const handleSignOut = async () => {
    await signOut();
  };

  // Get current focused index
  const getFocusedIndex = useCallback(() => {
    const activeElement = document.activeElement;
    return menuItemsRef.current.findIndex(item => item === activeElement);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentIndex = getFocusedIndex();
    const items = menuItemsRef.current.filter(Boolean);
    const itemCount = items.length;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % itemCount;
        items[nextIndex]?.focus();
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prevIndex = currentIndex < 0 ? itemCount - 1 : (currentIndex - 1 + itemCount) % itemCount;
        items[prevIndex]?.focus();
        break;
      }
      case 'Home': {
        e.preventDefault();
        items[0]?.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        items[itemCount - 1]?.focus();
        break;
      }
      case 'Escape': {
        e.preventDefault();
        // Move focus to main content area
        const mainContent = document.querySelector('main') || document.querySelector('[role="main"]');
        if (mainContent instanceof HTMLElement) {
          mainContent.focus();
        } else {
          (document.activeElement as HTMLElement)?.blur();
        }
        break;
      }
      case 'Enter':
      case ' ': {
        // Let the NavLink handle navigation, but prevent if already on the route
        const target = e.currentTarget as HTMLAnchorElement;
        const href = target.getAttribute('href');
        if (href && location.pathname === href) {
          e.preventDefault();
        }
        break;
      }
    }
  }, [getFocusedIndex, location.pathname]);

  const renderNavItems = (items: typeof mainNavItems, startIndex: number) => (
    <SidebarMenu role="menu">
      {items.map((item, idx) => {
        const globalIndex = startIndex + idx;
        const isActive = location.pathname === item.url || 
          (item.url !== '/' && location.pathname.startsWith(item.url));
        
        return (
          <SidebarMenuItem key={item.title} role="none">
            <SidebarMenuButton asChild isActive={isActive}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink 
                    ref={(el) => { menuItemsRef.current[globalIndex] = el; }}
                    to={item.url}
                    role="menuitem"
                    aria-current={isActive ? 'page' : undefined}
                    tabIndex={0}
                    onClick={(e) => {
                      if (isActive) {
                        e.preventDefault();
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg",
                      "transition-all duration-150 ease-out",
                      "outline-none",
                      // Focus styles - distinct from active state
                      "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar-background",
                      "focus-visible:bg-sidebar-accent/50",
                      // Active state styles
                      isActive 
                        ? "bg-sidebar-primary/15 text-sidebar-primary font-medium shadow-sm" 
                        : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className={cn(
                      "h-4 w-4 shrink-0 transition-colors duration-150",
                      isActive && "text-sidebar-primary"
                    )} />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                    {isActive && !collapsed && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" aria-hidden="true" />
                    )}
                  </NavLink>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="font-medium">
                    {item.title}
                  </TooltipContent>
                )}
              </Tooltip>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  const renderGroupLabel = (label: string) => {
    if (collapsed) return null;
    return (
      <SidebarGroupLabel 
        className="text-[10px] uppercase tracking-wider text-sidebar-muted/70 font-semibold px-3 mb-1"
        id={`sidebar-group-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {label}
      </SidebarGroupLabel>
    );
  };

  // Calculate starting indices for each group
  const mainStartIndex = 0;
  const businessStartIndex = mainNavItems.length;
  const hrStartIndex = businessStartIndex + businessNavItems.length;
  const settingsStartIndex = hrStartIndex + hrNavItems.length;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Header with Logo */}
      <SidebarHeader className="border-b border-sidebar-border/30 p-4">
        <div className="flex items-center gap-3">
          <img 
            src={collapsed ? logoIcon : whiteLogo} 
            alt="Logo" 
            className={cn(
              "h-8 object-contain transition-all duration-200",
              collapsed ? "w-8" : "w-auto"
            )}
          />
          {!collapsed && organization && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate text-sidebar-foreground">
                {organization.name}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 space-y-4">
        {/* Favorites */}
        <FavoritePages />
        
        {/* Navigation Container with ARIA */}
        <nav 
          ref={navContainerRef}
          aria-label="Main navigation"
          className="space-y-4"
        >
          {/* Main Navigation */}
          <SidebarGroup role="group" aria-labelledby="sidebar-group-main">
            {renderGroupLabel('Main')}
            <SidebarGroupContent>
              {renderNavItems(mainNavItems, mainStartIndex)}
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Business */}
          <SidebarGroup role="group" aria-labelledby="sidebar-group-business">
            {renderGroupLabel('Business')}
            <SidebarGroupContent>
              {renderNavItems(businessNavItems, businessStartIndex)}
            </SidebarGroupContent>
          </SidebarGroup>

          {/* HR & Operations */}
          <SidebarGroup role="group" aria-labelledby="sidebar-group-hr-&-operations">
            {renderGroupLabel('HR & Operations')}
            <SidebarGroupContent>
              {renderNavItems(hrNavItems, hrStartIndex)}
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Settings */}
          <SidebarGroup role="group" aria-labelledby="sidebar-group-system">
            {renderGroupLabel('System')}
            <SidebarGroupContent>
              {renderNavItems(settingsNavItems, settingsStartIndex)}
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>
      </SidebarContent>

      {/* Footer with User */}
      <SidebarFooter className="border-t border-sidebar-border/30 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border-2 border-sidebar-primary/20">
            <AvatarFallback className="bg-sidebar-primary/10 text-sidebar-primary text-sm font-medium">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-sidebar-foreground">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-sidebar-muted truncate">
                {user?.email}
              </p>
            </div>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSignOut}
                aria-label="Sign out"
                className="text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}