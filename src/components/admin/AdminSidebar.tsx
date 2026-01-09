import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  CreditCard,
  Palette,
  Bell,
  FileText,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  Users,
  ArrowUp,
  Shield,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import logoIcon from '@/assets/logo-icon.jpg';
import { AdminUserMenu } from './AdminUserMenu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  getAdminRole, 
  canAccessSection, 
} from '@/lib/adminPermissions';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

// Define grouped navigation structure
const navGroups: NavGroup[] = [
  {
    id: 'core',
    label: 'Core',
    defaultOpen: true,
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    id: 'org-management',
    label: 'Organization Management',
    defaultOpen: false,
    items: [
      { id: 'organizations', label: 'Organizations', icon: Building2 },
      { id: 'users', label: 'Users', icon: Users },
      { id: 'role-permissions', label: 'Role Permissions', icon: Shield },
      { id: 'plan-presets', label: 'Plan Presets', icon: Layers },
      { id: 'plan-limits', label: 'Plan Limits', icon: Users },
    ],
  },
  {
    id: 'billing-growth',
    label: 'Billing & Growth',
    defaultOpen: false,
    items: [
      { id: 'upgrade-requests', label: 'Upgrade Requests', icon: ArrowUp },
      { id: 'billing', label: 'Billing', icon: CreditCard },
    ],
  },
  {
    id: 'platform-settings',
    label: 'Platform Settings',
    defaultOpen: false,
    items: [
      { id: 'whitelabel', label: 'White-Label', icon: Palette },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'audit', label: 'Audit Logs', icon: FileText },
    ],
  },
];

const SIDEBAR_STORAGE_KEY = 'admin-sidebar-collapsed';
const GROUP_STATE_STORAGE_KEY = 'admin-sidebar-groups';

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onSignOut: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export const AdminSidebar = ({
  activeSection,
  onSectionChange,
  onSignOut,
  collapsed,
  onCollapsedChange,
  mobileOpen = false,
  onMobileOpenChange,
}: AdminSidebarProps) => {
  const { role } = useAuth();
  const adminRole = getAdminRole(role);
  const isMobile = useIsMobile();

  // Initialize group open states from localStorage or defaults
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(GROUP_STATE_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    // Default: Core expanded, others collapsed
    return navGroups.reduce((acc, group) => {
      acc[group.id] = group.defaultOpen ?? false;
      return acc;
    }, {} as Record<string, boolean>);
  });

  // Persist group states
  useEffect(() => {
    localStorage.setItem(GROUP_STATE_STORAGE_KEY, JSON.stringify(openGroups));
  }, [openGroups]);

  // Auto-expand group containing active section
  useEffect(() => {
    const activeGroup = navGroups.find(group =>
      group.items.some(item => item.id === activeSection)
    );
    if (activeGroup && !openGroups[activeGroup.id]) {
      setOpenGroups(prev => ({ ...prev, [activeGroup.id]: true }));
    }
  }, [activeSection]);

  // Filter groups and items based on role permissions
  const filteredGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => canAccessSection(adminRole, item.id)),
    }))
    .filter(group => group.items.length > 0);

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

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const isGroupActive = (group: NavGroup) => {
    return group.items.some(item => item.id === activeSection);
  };

  const handleSectionClick = (sectionId: string) => {
    onSectionChange(sectionId);
    // Close mobile sidebar on navigation
    if (isMobile && onMobileOpenChange) {
      onMobileOpenChange(false);
    }
  };

  // Sidebar content component (shared between desktop and mobile)
  const SidebarContent = ({ isMobileView = false }: { isMobileView?: boolean }) => (
    <div className="flex h-full flex-col">
      {/* Brand Header with Toggle - Only for desktop */}
      {!isMobileView && (
        <div
          className={cn(
            'flex h-16 items-center border-b border-sidebar-border transition-all duration-300',
            collapsed ? 'justify-center px-2' : 'justify-between px-4'
          )}
        >
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={handleToggle}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-accent p-1 hover:bg-sidebar-accent/80 transition-colors"
                >
                  <img 
                    src={logoIcon} 
                    alt="PrintoSaas" 
                    className="h-full w-full object-contain rounded-lg"
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                <p className="font-medium">Expand sidebar</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <img 
                src={logo} 
                alt="PrintoSaas" 
                className="h-9 w-auto object-contain"
              />
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggle}
                    className="h-8 w-8 p-0 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  Collapse sidebar
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      )}

      {/* Navigation with Groups */}
      <ScrollArea className="flex-1 py-4">
        <nav
          className={cn(
            'space-y-2 transition-all duration-300',
            collapsed && !isMobileView ? 'px-2' : 'px-3'
          )}
        >
          {filteredGroups.map((group) => {
            const isOpen = openGroups[group.id] ?? false;
            const groupActive = isGroupActive(group);

            // Collapsed mode: show items with group tooltip (desktop only)
            if (collapsed && !isMobileView) {
              return (
                <div key={group.id} className="space-y-1">
                  {/* Group indicator dot when collapsed */}
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'flex h-6 items-center justify-center',
                          groupActive && 'relative'
                        )}
                      >
                        <div
                          className={cn(
                            'h-1 w-4 rounded-full transition-colors',
                            groupActive ? 'bg-sidebar-primary' : 'bg-sidebar-border'
                          )}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10}>
                      {group.label}
                    </TooltipContent>
                  </Tooltip>
                  
                  {group.items.map((item) => {
                    const isActive = activeSection === item.id;
                    return (
                      <Tooltip key={item.id} delayDuration={0}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleSectionClick(item.id)}
                            onKeyDown={(e) => handleKeyDown(e, () => handleSectionClick(item.id))}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                              'group flex w-full h-10 items-center justify-center rounded-lg text-sm font-medium transition-all duration-200',
                              isActive
                                ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                                : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground'
                            )}
                          >
                            <item.icon
                              className={cn(
                                'h-4 w-4 shrink-0 transition-colors duration-200',
                                isActive
                                  ? 'text-sidebar-primary-foreground'
                                  : 'text-sidebar-muted group-hover:text-sidebar-foreground'
                              )}
                            />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={10}>
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            }

            // Expanded mode: collapsible groups
            return (
              <Collapsible
                key={group.id}
                open={isOpen}
                onOpenChange={() => toggleGroup(group.id)}
                className="space-y-1"
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors duration-200',
                      groupActive
                        ? 'text-sidebar-primary'
                        : 'text-sidebar-muted hover:text-sidebar-foreground'
                    )}
                  >
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 shrink-0 transition-transform duration-200',
                        !isOpen && '-rotate-90'
                      )}
                    />
                    <span className="flex-1 text-left truncate">{group.label}</span>
                    {groupActive && !isOpen && (
                      <div className="h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
                    )}
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                  <div className="space-y-0.5 pl-3 pt-1">
                    {group.items.map((item) => {
                      const isActive = activeSection === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSectionClick(item.id)}
                          onKeyDown={(e) => handleKeyDown(e, () => handleSectionClick(item.id))}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                            isActive
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                              : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground'
                          )}
                        >
                          <item.icon
                            className={cn(
                              'h-4 w-4 shrink-0 transition-colors duration-200',
                              isActive
                                ? 'text-sidebar-primary-foreground'
                                : 'text-sidebar-muted group-hover:text-sidebar-foreground'
                            )}
                          />
                          <span className="flex-1 text-left truncate">
                            {item.label}
                          </span>
                          {isActive && (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Compact User Menu Footer */}
      <div
        className={cn(
          'border-t border-sidebar-border p-2 transition-all duration-300',
          collapsed && !isMobileView ? 'flex justify-center' : 'px-3'
        )}
      >
        <AdminUserMenu 
          collapsed={collapsed && !isMobileView} 
          onSignOut={onSignOut} 
        />
      </div>
    </div>
  );

  // Mobile: Render Sheet
  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent 
          side="left" 
          className="w-[280px] p-0 bg-sidebar text-sidebar-foreground"
        >
          <SheetHeader className="h-16 flex-row items-center justify-between border-b border-sidebar-border px-4">
            <SheetTitle className="flex items-center">
              <img 
                src={logo} 
                alt="PrintoSaas" 
                className="h-8 w-auto object-contain"
              />
            </SheetTitle>
          </SheetHeader>
          <SidebarContent isMobileView />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Render fixed sidebar
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300 ease-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <SidebarContent />
    </aside>
  );
};

export const SIDEBAR_STORAGE_KEY_EXPORT = SIDEBAR_STORAGE_KEY;
