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
  User,
  BarChart3,
  Settings,
  Truck,
  Briefcase,
  UserCog,
} from 'lucide-react';
import whiteLogo from '@/assets/white-logo.png';
import logoIcon from '@/assets/logo-icon.jpg';
import { NavLink, useLocation } from 'react-router-dom';
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
import { supabase } from '@/integrations/supabase/client';
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
  const { organization, isOrgOwner } = useOrganization();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const handleSignOut = async () => {
    await signOut();
  };

  const renderNavItems = (items: typeof mainNavItems, showDivider = false) => (
    <SidebarMenu className={cn(showDivider && "pt-2 border-t border-sidebar-border/50")}>
      {items.map((item) => {
        const isActive = location.pathname === item.url || 
          (item.url !== '/' && location.pathname.startsWith(item.url));
        
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={isActive}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink 
                    to={item.url}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                      isActive 
                        ? "bg-sidebar-primary/15 text-sidebar-primary font-medium shadow-sm" 
                        : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className={cn(
                      "h-4 w-4 shrink-0 transition-colors duration-200",
                      isActive && "text-sidebar-primary"
                    )} />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                    {isActive && !collapsed && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
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
      <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-sidebar-muted/70 font-semibold px-3 mb-1">
        {label}
      </SidebarGroupLabel>
    );
  };

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
        
        {/* Main Navigation */}
        <SidebarGroup>
          {renderGroupLabel('Main')}
          <SidebarGroupContent>
            {renderNavItems(mainNavItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Business */}
        <SidebarGroup>
          {renderGroupLabel('Business')}
          <SidebarGroupContent>
            {renderNavItems(businessNavItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* HR & Operations */}
        <SidebarGroup>
          {renderGroupLabel('HR & Operations')}
          <SidebarGroupContent>
            {renderNavItems(hrNavItems)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup>
          {renderGroupLabel('System')}
          <SidebarGroupContent>
            {renderNavItems(settingsNavItems)}
          </SidebarGroupContent>
        </SidebarGroup>
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
                className="text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
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
