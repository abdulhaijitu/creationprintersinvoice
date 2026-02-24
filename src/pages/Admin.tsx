import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { hasAdminAccess, getAdminRole, canAccessSection } from '@/lib/adminPermissions';
import { AdminSidebar, SIDEBAR_STORAGE_KEY_EXPORT } from '@/components/admin/AdminSidebar';
import { AdminMobileTiles } from '@/components/admin/AdminMobileTiles';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import logo from '@/assets/logo.png';

// Lazy-load heavy admin section components
const AdminDashboardOverview = lazy(() => import('@/components/admin/AdminDashboardOverview').then(m => ({ default: m.AdminDashboardOverview })));
const AdminUsersTable = lazy(() => import('@/components/admin/AdminUsersTable').then(m => ({ default: m.AdminUsersTable })));
const OrgRolePermissionsManager = lazy(() => import('@/components/admin/OrgRolePermissionsManager'));
const PlanPermissionPresetsManager = lazy(() => import('@/components/admin/PlanPermissionPresetsManager'));
const UpgradeRequestsManager = lazy(() => import('@/components/admin/UpgradeRequestsManager').then(m => ({ default: m.UpgradeRequestsManager })));
const BusinessAnalyticsDashboard = lazy(() => import('@/components/analytics/BusinessAnalyticsDashboard').then(m => ({ default: m.BusinessAnalyticsDashboard })));
const AdminNotificationLogs = lazy(() => import('@/components/admin/AdminNotificationLogs').then(m => ({ default: m.AdminNotificationLogs })));
const EnhancedAuditLogsTable = lazy(() => import('@/components/admin/EnhancedAuditLogsTable'));
const InvestorDashboard = lazy(() => import('@/components/admin/InvestorDashboard').then(m => ({ default: m.InvestorDashboard })));

// Section label map for topbar
const sectionLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  analytics: 'Analytics',
  organizations: 'Organizations',
  users: 'Users',
  'role-permissions': 'Role Permissions',
  'plan-presets': 'Plan Presets',
  'plan-limits': 'Plan Limits',
  'upgrade-requests': 'Upgrade Requests',
  billing: 'Billing',
  notifications: 'Notifications',
  audit: 'Audit Logs',
  investor: 'Investor',
};

const SectionFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const AdminSectionContent = ({ section }: { section: string }) => {
  // Placeholder stats for dashboard
  const defaultStats = {
    totalOrgs: 0, activeOrgs: 0, trialOrgs: 0, expiredOrgs: 0, totalUsers: 0, monthlySignups: 0,
  };

  switch (section) {
    case 'dashboard':
      return <Suspense fallback={<SectionFallback />}><AdminDashboardOverview stats={defaultStats} /></Suspense>;
    case 'analytics':
      return <Suspense fallback={<SectionFallback />}><BusinessAnalyticsDashboard /></Suspense>;
    case 'organizations':
      return <div className="p-4 text-muted-foreground">Organizations management panel</div>;
    case 'users':
      return <Suspense fallback={<SectionFallback />}><AdminUsersTable /></Suspense>;
    case 'role-permissions':
      return <Suspense fallback={<SectionFallback />}><OrgRolePermissionsManager /></Suspense>;
    case 'plan-presets':
      return <Suspense fallback={<SectionFallback />}><PlanPermissionPresetsManager /></Suspense>;
    case 'plan-limits':
      return <div className="p-4 text-muted-foreground">Plan limits management</div>;
    case 'upgrade-requests':
      return <Suspense fallback={<SectionFallback />}><UpgradeRequestsManager /></Suspense>;
    case 'billing':
      return <div className="p-4 text-muted-foreground">Billing management</div>;
    case 'notifications':
      return <Suspense fallback={<SectionFallback />}><AdminNotificationLogs /></Suspense>;
    case 'audit':
      return <Suspense fallback={<SectionFallback />}><EnhancedAuditLogsTable /></Suspense>;
    case 'investor':
      return <Suspense fallback={<SectionFallback />}><InvestorDashboard /></Suspense>;
    default:
      return <div className="p-4 text-muted-foreground">Unknown section</div>;
  }
};

const Admin = () => {
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<string | null>(isMobile ? null : 'dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY_EXPORT);
      return stored ? JSON.parse(stored) : false;
    } catch { return false; }
  });

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && !hasAdminAccess(role)) {
      navigate('/', { replace: true });
    }
  }, [authLoading, role, navigate]);

  if (authLoading) return <SectionFallback />;
  if (!hasAdminAccess(role)) return null;

  const handleSignOut = async () => {
    navigate('/login');
  };

  // ─── MOBILE VIEW ─────────────────────────────────────────
  if (isMobile) {
    // Tiles home screen
    if (activeSection === null) {
      return <AdminMobileTiles onSelect={setActiveSection} onSignOut={handleSignOut} />;
    }

    // Section content with back button
    return (
      <div className="flex h-dvh flex-col bg-background">
        {/* Topbar */}
        <header className="flex h-14 items-center gap-3 border-b px-4 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveSection(null)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold truncate">
            {sectionLabels[activeSection] ?? activeSection}
          </h1>
        </header>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            <AdminSectionContent section={activeSection} />
          </div>
        </ScrollArea>
      </div>
    );
  }

  // ─── DESKTOP VIEW ────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar
        activeSection={activeSection ?? 'dashboard'}
        onSectionChange={setActiveSection}
        onSignOut={handleSignOut}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <main
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? 64 : 256 }}
      >
        <div className="p-6">
          <AdminSectionContent section={activeSection ?? 'dashboard'} />
        </div>
      </main>
    </div>
  );
};

export default Admin;
