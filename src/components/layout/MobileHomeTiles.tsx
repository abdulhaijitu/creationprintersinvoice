import { useNavigate, useLocation } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { useCompanySettings } from '@/contexts/CompanySettingsContext';
import { sidebarNavGroups, SidebarNavGroup } from '@/lib/permissions/sidebarConfig';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export function MobileHomeTiles() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
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

  return (
    <div className="space-y-5">
      {/* Company Header */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
          <Building2 className="h-4.5 w-4.5" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-foreground">
            {companySettings?.company_name || 'Your Company'}
          </h1>
          <p className="text-xs text-muted-foreground">Quick Navigation</p>
        </div>
      </div>

      {/* Tile Groups */}
      {filteredNavGroups.map((group) => (
        <div key={group.label}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2.5 px-1">
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
                  onClick={() => navigate(item.url)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-xl p-3 aspect-square text-center transition-all duration-200 active:scale-95',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted/50 text-foreground/70 hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-6 w-6 shrink-0',
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground'
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
  );
}
