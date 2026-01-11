import { useCallback, useRef } from 'react';
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
  BarChart3,
  Settings,
  Truck,
  UserCog,
} from 'lucide-react';
import creationPrintersLogo from '@/assets/creation-printers-logo.png';
import appIconLogo from '@/assets/app-logo.jpg';
import { NavLink, useLocation, Link } from 'react-router-dom';
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

export function AppSidebar() {
  const location = useLocation();
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

  // Handle logo click - navigate to dashboard without re-render if already there
  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    if (location.pathname === '/') {
      e.preventDefault();
    }
  }, [location.pathname]);

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
    <SidebarMenu role="menu" className={cn(collapsed && "flex flex-col items-center")}>
      {items.map((item, idx) => {
        const globalIndex = startIndex + idx;
        const isActive = location.pathname === item.url || 
          (item.url !== '/' && location.pathname.startsWith(item.url));
        
        const navLinkContent = (
          <NavLink 
            ref={(el) => { menuItemsRef.current[globalIndex] = el; }}
            to={item.url}
            role="menuitem"
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.title}
            tabIndex={0}
            onClick={(e) => {
              if (isActive) {
                e.preventDefault();
              }
            }}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex items-center rounded-md transition-all duration-200 ease-out outline-none",
              // Focus ring styles
              "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar-background",
              // Collapsed vs expanded layout
              collapsed 
                ? "h-9 w-9 justify-center p-0" 
                : "gap-3 px-3 py-2 w-full",
              // Active and hover states
              isActive 
                ? cn(
                    "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                    collapsed && "ring-1 ring-sidebar-primary/30"
                  )
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className={cn(
              "h-4 w-4 shrink-0 transition-colors duration-150",
              isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60"
            )} />
            {!collapsed && (
              <>
                <span className="truncate text-sm">{item.title}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" aria-hidden="true" />
                )}
              </>
            )}
          </NavLink>
        );
        
        return (
          <SidebarMenuItem key={item.title} role="none" className={cn(collapsed && "w-auto")}>
            <SidebarMenuButton asChild isActive={isActive} className={cn(collapsed && "w-auto p-0")}>
              {collapsed ? (
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    {navLinkContent}
                  </TooltipTrigger>
                  <TooltipContent 
                    side="right" 
                    sideOffset={12}
                    className="font-medium px-3 py-1.5 text-sm"
                  >
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              ) : (
                navLinkContent
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  const renderGroupLabel = (label: string) => {
    if (collapsed) {
      // Subtle separator line for collapsed mode
      return (
        <div 
          className="w-6 h-px bg-sidebar-border/50 mx-auto my-2" 
          aria-hidden="true"
        />
      );
    }
    return (
      <SidebarGroupLabel 
        className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold px-3 mb-1.5 mt-1"
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/50">
      {/* Header with Logo - clickable to navigate to Dashboard */}
      <SidebarHeader className={cn(
        "h-16 flex items-center border-b border-sidebar-border/30 shrink-0 transition-all duration-200",
        collapsed ? "justify-center px-2" : "px-4"
      )}>
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <Link 
              to="/"
              onClick={handleLogoClick}
              className={cn(
                "flex items-center rounded-md transition-all duration-200 ease-out",
                "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1",
                collapsed ? "justify-center p-1" : "gap-3"
              )}
              aria-label="Go to Dashboard"
            >
              {collapsed ? (
                <img 
                  src={appIconLogo}
                  alt="Creation Printers"
                  className="h-8 w-8 object-contain rounded"
                />
              ) : (
                <img 
                  src={creationPrintersLogo}
                  alt="Creation Printers - All Printing Solution"
                  className="h-9 w-auto object-contain max-w-[180px]"
                />
              )}
            </Link>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" sideOffset={12} className="font-medium">
              Creation Printers - Dashboard
            </TooltipContent>
          )}
        </Tooltip>
      </SidebarHeader>

      <SidebarContent className={cn(
        "py-4 transition-all duration-200",
        collapsed ? "px-1.5" : "px-3"
      )}>
        {/* Favorites - hide in collapsed mode for cleaner look */}
        {!collapsed && <FavoritePages />}
        
        {/* Navigation Container with ARIA */}
        <nav 
          ref={navContainerRef}
          aria-label="Main navigation"
          className={cn("space-y-4", collapsed && "space-y-2")}
        >
          {/* Main Navigation */}
          <SidebarGroup role="group" aria-labelledby="sidebar-group-main">
            {renderGroupLabel('Main')}
            <SidebarGroupContent className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
              {renderNavItems(mainNavItems, mainStartIndex)}
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Business */}
          <SidebarGroup role="group" aria-labelledby="sidebar-group-business">
            {renderGroupLabel('Business')}
            <SidebarGroupContent className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
              {renderNavItems(businessNavItems, businessStartIndex)}
            </SidebarGroupContent>
          </SidebarGroup>

          {/* HR & Operations */}
          <SidebarGroup role="group" aria-labelledby="sidebar-group-hr-&-operations">
            {renderGroupLabel('HR & Ops')}
            <SidebarGroupContent className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
              {renderNavItems(hrNavItems, hrStartIndex)}
            </SidebarGroupContent>
          </SidebarGroup>

          {/* System */}
          <SidebarGroup role="group" aria-labelledby="sidebar-group-system">
            {renderGroupLabel('System')}
            <SidebarGroupContent className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
              {renderNavItems(settingsNavItems, settingsStartIndex)}
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>
      </SidebarContent>

      {/* Footer with User */}
      <SidebarFooter className={cn(
        "border-t border-sidebar-border/30 transition-all duration-200",
        collapsed ? "p-2 flex justify-center" : "p-3"
      )}>
        <div className={cn(
          "flex items-center",
          collapsed ? "flex-col gap-2" : "gap-3"
        )}>
          {collapsed ? (
            /* Collapsed: Show avatar with tooltip, then sign out button */
            <>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <Avatar className="h-8 w-8 border border-sidebar-border/50 cursor-default">
                    <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="font-medium">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                    </span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleSignOut}
                    aria-label="Sign out"
                    className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12}>Sign out</TooltipContent>
              </Tooltip>
            </>
          ) : (
            /* Expanded: Full user info layout */
            <>
              <Avatar className="h-8 w-8 border border-sidebar-border/50">
                <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-sidebar-foreground">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-sidebar-foreground/50 truncate">
                  {user?.email}
                </p>
              </div>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleSignOut}
                    aria-label="Sign out"
                    className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}