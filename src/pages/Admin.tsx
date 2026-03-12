import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { hasAdminAccess } from '@/lib/adminPermissions';
import { AdminSidebar, SIDEBAR_STORAGE_KEY_EXPORT } from '@/components/admin/AdminSidebar';
import { AdminMobileTiles } from '@/components/admin/AdminMobileTiles';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import logo from '@/assets/logo.png';
import { lazyRetry } from '@/lib/lazyLoadRecovery';

// Lazy-load heavy admin section components
const AdminDashboardOverview = lazy(() => lazyRetry(() => import('@/components/admin/AdminDashboardOverview').then(m => ({ default: m.AdminDashboardOverview }))));
const AdminUsersTable = lazy(() => lazyRetry(() => import('@/components/admin/AdminUsersTable').then(m => ({ default: m.AdminUsersTable }))));
const OrgRolePermissionsManager = lazy(() => lazyRetry(() => import('@/components/admin/OrgRolePermissionsManager')));
const BusinessAnalyticsDashboard = lazy(() => lazyRetry(() => import('@/components/analytics/BusinessAnalyticsDashboard').then(m => ({ default: m.BusinessAnalyticsDashboard }))));
const AdminNotificationLogs = lazy(() => lazyRetry(() => import('@/components/admin/AdminNotificationLogs').then(m => ({ default: m.AdminNotificationLogs }))));
const EnhancedAuditLogsTable = lazy(() => lazyRetry(() => import('@/components/admin/EnhancedAuditLogsTable')));

// Section label map for topbar
const sectionLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  analytics: 'Analytics',
  organizations: 'Organizations',
  users: 'Users',
  'role-permissions': 'Role Permissions',
  notifications: 'Notifications',
  audit: 'Audit Logs',
};

const SectionFallback = () => (
  <div className="flex items-center justify-center py-20">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const AdminSectionContent = ({ section }: { section: string }) => {
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
    case 'notifications':
      return <Suspense fallback={<SectionFallback />}><AdminNotificationLogs /></Suspense>;
    case 'audit':
      return <Suspense fallback={<SectionFallback />}><EnhancedAuditLogsTable /></Suspense>;
    default:
      return <div className="p-4 text-muted-foreground">Unknown section</div>;
  }
};

const Admin = () => {
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<string | null>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY_EXPORT);
      return stored ? JSON.parse(stored) : false;
    } catch { return false; }
  });

  useEffect(() => {
    if (isMobile) {
      setActiveSection(null);
    }
  }, [isMobile]);

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

  if (isMobile) {
    if (activeSection === null) {
      return <AdminMobileTiles onSelect={setActiveSection} onSignOut={handleSignOut} />;
    }

    return (
      <div className="flex h-dvh flex-col bg-background">
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
        <ScrollArea className="flex-1">
          <div className="p-4">
            <AdminSectionContent section={activeSection} />
          </div>
        </ScrollArea>
      </div>
    );
  }

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
