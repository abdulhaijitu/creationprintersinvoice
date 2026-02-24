import {
  LayoutDashboard,
  Building2,
  BarChart3,
  CreditCard,
  Bell,
  FileText,
  Users,
  ArrowUp,
  Shield,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import { AdminUserMenu } from './AdminUserMenu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { getAdminRole, canAccessSection } from '@/lib/adminPermissions';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: 'core',
    label: 'Core',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    id: 'org-management',
    label: 'Organization Management',
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
    items: [
      { id: 'upgrade-requests', label: 'Upgrade Requests', icon: ArrowUp },
      { id: 'billing', label: 'Billing', icon: CreditCard },
    ],
  },
  {
    id: 'platform-settings',
    label: 'Platform Settings',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'audit', label: 'Audit Logs', icon: FileText },
    ],
  },
];

interface AdminMobileTilesProps {
  onSelect: (section: string) => void;
  onSignOut: () => void;
}

export const AdminMobileTiles = ({ onSelect, onSignOut }: AdminMobileTilesProps) => {
  const { role } = useAuth();
  const adminRole = getAdminRole(role);

  const filteredGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => canAccessSection(adminRole, item.id)),
    }))
    .filter(group => group.items.length > 0);

  return (
    <div className="flex h-dvh flex-col bg-sidebar text-sidebar-foreground animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-4 shrink-0">
        <img src={logo} alt="Admin" className="h-8 w-auto object-contain" />
        <span className="ml-3 text-sm font-semibold text-sidebar-foreground">Admin Panel</span>
      </div>

      {/* Grid Tiles */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {filteredGroups.map((group) => (
            <div key={group.id}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted mb-2 px-1">
                {group.label}
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 rounded-xl p-3 aspect-square text-center transition-all duration-200',
                      'bg-sidebar-accent/50 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground active:scale-95'
                    )}
                  >
                    <item.icon className="h-6 w-6 shrink-0" />
                    <span className="text-[10px] font-medium leading-tight line-clamp-2">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 shrink-0">
        <AdminUserMenu collapsed={false} onSignOut={onSignOut} />
      </div>
    </div>
  );
};
