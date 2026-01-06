import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  CreditCard,
  Palette,
  Bell,
  FileText,
  LogOut,
  Shield,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'organizations', label: 'Organizations', icon: Building2 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'whitelabel', label: 'White-Label', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'audit', label: 'Audit Logs', icon: FileText },
];

const SIDEBAR_STORAGE_KEY = 'admin-sidebar-collapsed';

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onSignOut: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export const AdminSidebar = ({
  activeSection,
  onSectionChange,
  onSignOut,
  collapsed,
  onCollapsedChange,
}: AdminSidebarProps) => {
  const { user } = useAuth();

  const adminInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'SA';

  const handleToggle = () => {
    const newState = !collapsed;
    onCollapsedChange(newState);
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(newState));
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 ease-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-sidebar-border transition-all duration-300',
          collapsed ? 'justify-center px-2' : 'gap-3 px-5'
        )}
      >
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary/10">
                <Shield className="h-5 w-5 text-sidebar-primary" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              <p className="font-medium">PrintoSaas Admin</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/10">
              <Shield className="h-5 w-5 text-sidebar-primary" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-semibold text-sidebar-foreground">
                PrintoSaas
              </span>
              <span className="truncate text-xs text-sidebar-muted">
                Admin Console
              </span>
            </div>
          </>
        )}
      </div>

      {/* Toggle Button */}
      <div
        className={cn(
          'flex border-b border-sidebar-border py-2 transition-all duration-300',
          collapsed ? 'justify-center px-2' : 'px-3'
        )}
      >
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              onKeyDown={(e) => handleKeyDown(e, handleToggle)}
              className={cn(
                'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200',
                collapsed ? 'h-9 w-9 p-0' : 'w-full justify-start gap-2'
              )}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4" />
                  <span className="text-xs">Collapse</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" sideOffset={10}>
              Expand sidebar
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav
          className={cn(
            'space-y-1 transition-all duration-300',
            collapsed ? 'px-2' : 'px-3'
          )}
        >
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <Tooltip key={item.id} delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onSectionChange(item.id)}
                    onKeyDown={(e) => handleKeyDown(e, () => onSectionChange(item.id))}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'group flex w-full items-center rounded-lg text-sm font-medium transition-all duration-200',
                      collapsed
                        ? 'h-10 justify-center'
                        : 'gap-3 px-3 py-2.5',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors duration-200',
                        isActive
                          ? 'text-sidebar-primary-foreground'
                          : 'text-sidebar-muted group-hover:text-sidebar-accent-foreground'
                      )}
                    />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">
                          {item.label}
                        </span>
                        {isActive && (
                          <ChevronRight className="h-4 w-4 opacity-70" />
                        )}
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" sideOffset={10}>
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div
        className={cn(
          'border-t border-sidebar-border transition-all duration-300',
          collapsed ? 'p-2' : 'p-4'
        )}
      >
        {/* Admin Profile */}
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="flex justify-center py-2">
                <Avatar className="h-9 w-9 border border-sidebar-border">
                  <AvatarFallback className="bg-sidebar-primary/20 text-sm font-medium text-sidebar-primary">
                    {adminInitials}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              <div>
                <p className="font-medium">Super Admin</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || 'admin@printosaas.com'}
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 px-3 py-2.5">
            <Avatar className="h-9 w-9 border border-sidebar-border shrink-0">
              <AvatarFallback className="bg-sidebar-primary/20 text-sm font-medium text-sidebar-primary">
                {adminInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                Super Admin
              </span>
              <span className="truncate text-xs text-sidebar-muted">
                {user?.email || 'admin@printosaas.com'}
              </span>
            </div>
          </div>
        )}

        <Separator className="my-3 bg-sidebar-border" />

        {/* Sign Out Button */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={onSignOut}
              onKeyDown={(e) => handleKeyDown(e, onSignOut)}
              className={cn(
                'w-full text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200',
                collapsed ? 'h-10 p-0 justify-center' : 'justify-start gap-3'
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" sideOffset={10}>
              Sign Out
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </aside>
  );
};

export const SIDEBAR_STORAGE_KEY_EXPORT = SIDEBAR_STORAGE_KEY;
