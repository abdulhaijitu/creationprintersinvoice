import { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import { LogOut, Building2, ChevronsUpDown } from 'lucide-react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { useCompanySettings } from '@/contexts/CompanySettingsContext';
import {
  sidebarNavGroups,
  SidebarNavItem,
  SidebarNavGroup,
} from '@/lib/permissions/sidebarConfig';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FavoritePages } from './FavoritePages';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebar } from '@/components/ui/sidebar';

const sidebarVariants = {
  open: { width: '15rem' },
  closed: { width: '3.05rem' },
};

const transitionProps = {
  type: 'tween' as const,
  ease: 'easeOut' as const,
  duration: 0.2,
};

const textVariants = {
  open: { x: 0, opacity: 1, transition: { x: { stiffness: 1000, velocity: -100 } } },
  closed: { x: -20, opacity: 0, transition: { x: { stiffness: 100 } } },
};

const staggerVariants = {
  open: { transition: { staggerChildren: 0.03, delayChildren: 0.02 } },
};

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const location = useLocation();
  const { user, signOut, isSuperAdmin } = useAuth();
  const { organization, isOrgOwner, orgRole } = useOrganization();
  const { settings: companySettings, loading: companyLoading } = useCompanySettings();
  const isMobile = useIsMobile();
  
  const { 
    hasModuleAccess, 
    hasAnyPermission, 
    refreshPermissions, 
    loading: permissionsLoading,
    getEnabledModules,
    permissionsReady,
    lastUpdated,
  } = usePermissionContext();

  // For mobile drawer integration with shadcn sidebar
  const { openMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    if (permissionsReady) {
      console.log('[AppSidebar] Permissions ready. Enabled modules:', getEnabledModules());
    }
  }, [permissionsReady, getEnabledModules, lastUpdated]);

  // Removed: route-change based refreshPermissions() was causing unnecessary refetches on every navigation

  const handleSignOut = async () => {
    await signOut();
  };

  const handleLogoClick = useCallback((e: React.MouseEvent) => {
    if (location.pathname === '/') {
      e.preventDefault();
    }
  }, [location.pathname]);

  const filteredNavGroups = useMemo(() => {
    const result = sidebarNavGroups.map((group): SidebarNavGroup => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.permissionKey) return true;
        if (isSuperAdmin) return true;
        if (isOrgOwner) return true;
        if (item.requiresAnyPermission) return hasAnyPermission;
        return hasModuleAccess(item.permissionKey);
      }),
    })).filter((group) => group.items.length > 0);
    return result;
  }, [hasModuleAccess, hasAnyPermission, isSuperAdmin, isOrgOwner, lastUpdated]);

  const userInitials = user?.email?.charAt(0).toUpperCase() || 'U';
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userEmail = user?.email || '';
  const companyName = companySettings?.company_name || 'Your Company';

  // On mobile, don't render this sidebar (MobileSidebarTiles handles it)
  if (isMobile) {
    return null;
  }

  return (
    <motion.div
      className="fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border/50 bg-sidebar"
      initial="closed"
      animate={isCollapsed ? 'closed' : 'open'}
      variants={sidebarVariants}
      transition={transitionProps}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <motion.div className="flex h-full flex-col" variants={staggerVariants}>
        {/* Header - Organization */}
        <div className={cn(
          "flex h-14 items-center border-b border-sidebar-border/30 shrink-0",
          isCollapsed ? "justify-center px-1.5" : "px-3"
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "flex items-center gap-2 rounded-lg transition-colors w-full",
                "hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                isCollapsed ? "justify-center p-1.5" : "px-2 py-1.5"
              )}>
                <Avatar className={cn("shrink-0 border border-sidebar-border/50", isCollapsed ? "h-7 w-7" : "h-8 w-8")}>
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs font-bold">
                    {companyName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <motion.div variants={textVariants} className="flex-1 min-w-0 text-left">
                    {companyLoading ? (
                      <Skeleton className="h-4 w-24" />
                    ) : (
                      <span className="text-sm font-semibold text-sidebar-foreground truncate block">
                        {companyName}
                      </span>
                    )}
                  </motion.div>
                )}
                {!isCollapsed && <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" sideOffset={8} className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-semibold">{companyName}</p>
                <p className="text-xs text-muted-foreground">Business Management</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Settings
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Separator */}
        <Separator className="bg-sidebar-border/30" />

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className={cn("py-3", isCollapsed ? "px-1.5" : "px-2")}>
            {/* Favorites - only when expanded */}
            {!isCollapsed && <FavoritePages />}

            <nav aria-label="Main navigation" className={cn("space-y-4", isCollapsed && "space-y-2")}>
              {filteredNavGroups.map((group) => (
                <div key={group.label}>
                  {/* Group Label */}
                  {isCollapsed ? (
                    <div className="w-5 h-px bg-sidebar-border/50 mx-auto my-2" aria-hidden="true" />
                  ) : (
                    <motion.p
                      variants={textVariants}
                      className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold px-2 mb-1.5 mt-1"
                    >
                      {group.label}
                    </motion.p>
                  )}

                  {/* Nav Items */}
                  <div className={cn("space-y-0.5", isCollapsed && "flex flex-col items-center space-y-1")}>
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.url || 
                        (item.url !== '/' && location.pathname.startsWith(item.url));
                      
                      const linkContent = (
                        <NavLink
                          to={item.url}
                          onClick={(e) => { if (isActive) e.preventDefault(); }}
                          className={cn(
                            "flex items-center rounded-md transition-all duration-150 outline-none",
                            "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1",
                            isCollapsed
                              ? "h-8 w-8 justify-center p-0"
                              : "gap-2.5 px-2.5 py-1.5 w-full",
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <item.icon className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60"
                          )} />
                          {!isCollapsed && (
                            <motion.span
                              variants={textVariants}
                              className="truncate text-sm"
                            >
                              {item.title}
                            </motion.span>
                          )}
                        </NavLink>
                      );

                      return isCollapsed ? (
                        <Tooltip key={item.title} delayDuration={100}>
                          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                          <TooltipContent side="right" sideOffset={12} className="font-medium text-sm">
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div key={item.title}>{linkContent}</div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </ScrollArea>

        <Separator className="bg-sidebar-border/30" />

        {/* Footer - User Account */}
        <div className={cn(
          "shrink-0",
          isCollapsed ? "p-1.5 flex justify-center" : "p-2"
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "flex items-center gap-2 rounded-lg transition-colors w-full",
                "hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                isCollapsed ? "justify-center p-1.5" : "px-2 py-1.5"
              )}>
                <Avatar className={cn("shrink-0 border border-sidebar-border/50", isCollapsed ? "h-7 w-7" : "h-8 w-8")}>
                  <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <motion.div variants={textVariants} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate text-sidebar-foreground">{userName}</p>
                    <p className="text-[10px] text-sidebar-foreground/50 truncate">{userEmail}</p>
                  </motion.div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" sideOffset={8} className="w-56">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="flex items-center gap-2">
                <Link to="/settings"><Building2 className="h-4 w-4" /> Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>
    </motion.div>
  );
}
