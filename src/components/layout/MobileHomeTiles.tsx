import { useNavigate, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { useCompanySettings } from '@/contexts/CompanySettingsContext';
import { sidebarNavGroups, SidebarNavGroup } from '@/lib/permissions/sidebarConfig';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';

export function MobileHomeTiles() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { isOrgOwner } = useOrganization();
  const { settings: companySettings } = useCompanySettings();
  const { hasModuleAccess, hasAnyPermission } = usePermissionContext();
  const [search, setSearch] = useState('');

  const filteredNavGroups = useMemo(() => {
    const query = search.toLowerCase().trim();
    return sidebarNavGroups
      .map((group): SidebarNavGroup => ({
        ...group,
        items: group.items.filter((item) => {
          if (!item.permissionKey) { /* allowed */ }
          else if (isSuperAdmin || isOrgOwner) { /* allowed */ }
          else if (item.requiresAnyPermission) { if (!hasAnyPermission) return false; }
          else if (!hasModuleAccess(item.permissionKey)) return false;

          if (query) {
            return item.title.toLowerCase().includes(query);
          }
          return true;
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [hasModuleAccess, hasAnyPermission, isSuperAdmin, isOrgOwner, search]);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search modules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 bg-muted/40 border-border/40 rounded-xl text-sm focus-visible:ring-primary/30"
        />
      </div>

      {/* Tile Groups */}
      {filteredNavGroups.length === 0 && search && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Search className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No modules found</p>
        </div>
      )}
      {filteredNavGroups.map((group) => (
        <div key={group.label}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2 px-0.5">
            {group.label}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {group.items.map((item) => {
              const isActive =
                location.pathname === item.url ||
                (item.url !== '/' && location.pathname.startsWith(item.url));
              return (
                <button
                  key={item.url}
                  onClick={() => navigate(item.url === '/' ? '/dashboard' : item.url)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 px-1 text-center transition-all duration-200 active:scale-95',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-muted/40 text-foreground/70 hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                    )}
                  />
                  <span className="text-[10px] font-medium leading-tight line-clamp-1">
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
