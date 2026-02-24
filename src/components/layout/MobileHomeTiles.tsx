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
          placeholder="মডিউল খুঁজুন..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 bg-muted/50 border-border/50 rounded-xl text-sm"
        />
      </div>

      {/* Tile Groups */}
      {filteredNavGroups.length === 0 && search && (
        <p className="text-center text-sm text-muted-foreground py-8">
          কোনো মডিউল পাওয়া যায়নি
        </p>
      )}
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
                  onClick={() => navigate(item.url === '/' ? '/dashboard' : item.url)}
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
