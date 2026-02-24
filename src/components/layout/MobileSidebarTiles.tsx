import { useLocation, useNavigate } from 'react-router-dom';
import { X, Building2 } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { useCompanySettings } from '@/contexts/CompanySettingsContext';
import { sidebarNavGroups, SidebarNavGroup } from '@/lib/permissions/sidebarConfig';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export function MobileSidebarTiles() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openMobile, setOpenMobile } = useSidebar();
  const { user, signOut, isSuperAdmin } = useAuth();
  const { isOrgOwner } = useOrganization();
  const { settings: companySettings } = useCompanySettings();
  const { hasModuleAccess, hasAnyPermission } = usePermissionContext();

  const filteredNavGroups = useMemo(() => {
    return sidebarNavGroups
      .map((group): SidebarNavGroup => ({
        ...group,
        items: group.items.filter((item) => {
          if (!item.permissionKey) return true;
          if (isSuperAdmin || isOrgOwner) return true;
          if (item.requiresAnyPermission) return hasAnyPermission;
          return hasModuleAccess(item.permissionKey);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [hasModuleAccess, hasAnyPermission, isSuperAdmin, isOrgOwner]);

  if (!openMobile) return null;

  const handleNav = (url: string) => {
    navigate(url);
    setOpenMobile(false);
  };

  const handleSignOut = async () => {
    setOpenMobile(false);
    await signOut();
  };

  return (
    <div className="fixed inset-0 z-50 bg-sidebar text-sidebar-foreground flex flex-col animate-in fade-in duration-200 md:hidden">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
            <Building2 className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground truncate">
            {companySettings?.company_name || 'Your Company'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpenMobile(false)}
          className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Grid Tiles */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {filteredNavGroups.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 mb-2.5 px-1">
                {group.label}
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {group.items.map((item) => {
                  const isActive =
                    location.pathname === item.url ||
                    (item.url !== '/' && location.pathname.startsWith(item.url));
                  return (
                    <button
                      key={item.url}
                      onClick={() => handleNav(item.url)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 rounded-xl p-3 aspect-square text-center transition-all duration-200 active:scale-95',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-sidebar-accent/50 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-6 w-6 shrink-0',
                          isActive ? 'text-primary-foreground' : 'text-sidebar-foreground/50'
                        )}
                      />
                      <span className="text-[10px] font-medium leading-tight line-clamp-2">
                        {item.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer - User info + Sign out */}
      <div className="border-t border-sidebar-border p-3 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-sidebar-border/50">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs font-medium">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-sidebar-foreground">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleSignOut}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
