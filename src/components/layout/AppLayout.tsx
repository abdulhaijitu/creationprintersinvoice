import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, Suspense, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useCompanySettings } from '@/contexts/CompanySettingsContext';
import { SidebarProvider, SidebarTrigger, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MobileSidebarTiles } from './MobileSidebarTiles';
import { Breadcrumb } from './Breadcrumb';
import { GlobalSearch } from './GlobalSearch';
import { UserDropdown } from './UserDropdown';
import { MobileBottomNav } from './MobileBottomNav';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineIndicator } from '@/components/offline/OfflineIndicator';
import { NotificationManager } from '@/components/notifications/NotificationManager';
import { PushNotificationToggle } from '@/components/notifications/PushNotificationToggle';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { RecentActivity } from './RecentActivity';
import { QuickActions } from './QuickActions';
import { FavoriteButton } from './FavoriteButton';
import { useIsMobile } from '@/hooks/use-mobile';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppFooter from './AppFooter';

const mobilePageTitles: Record<string, string> = {
  '/dashboard': 'ড্যাশবোর্ড',
  '/customers': 'কাস্টমার',
  '/invoices': 'ইনভয়েস',
  '/quotations': 'কোটেশন',
  '/price-calculation': 'মূল্য হিসাব',
  '/delivery-challans': 'ডেলিভারি চালান',
  '/vendors': 'ভেন্ডর',
  '/expenses': 'খরচ',
  '/employees': 'কর্মচারী',
  '/attendance': 'উপস্থিতি',
  '/leave': 'ছুটি',
  '/salary': 'বেতন',
  '/performance': 'পারফরম্যান্স',
  '/tasks': 'টাস্ক',
  '/reports': 'রিপোর্ট',
  '/settings': 'সেটিংস',
  '/team-members': 'টিম মেম্বার',
  '/payments': 'পেমেন্ট',
  '/costing-templates': 'কস্টিং টেমপ্লেট',
};

// Component to handle closing sidebar on route change
const MobileSidebarHandler = () => {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, isMobile, setOpenMobile]);

  return null;
};

// Minimal auth check loader - shows only briefly during initial auth resolution
const AuthLoadingShell = () => (
  <div className="min-h-screen flex w-full bg-muted/30">
    {/* Sidebar skeleton */}
    <div className="hidden md:flex w-[240px] flex-col border-r bg-background">
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-32" />
        <div className="space-y-2 mt-6">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
    {/* Main content skeleton */}
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header skeleton */}
      <header className="h-12 border-b bg-background flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-4 w-32 hidden md:block" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>
      {/* Content area - no loading indicator, just empty */}
      <main className="flex-1 p-6" />
    </div>
  </div>
);

// Page content fallback for Suspense
const PageLoadingFallback = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-64" />
    <div className="mt-6 space-y-3">
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  </div>
);

const AppLayout = () => {
  const { user, loading: authLoading } = useAuth();
  const { loading: orgLoading } = useOrganization();
  const { settings: companySettings } = useCompanySettings();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isHomePage = location.pathname === '/';

  const mobilePageTitle = useMemo(() => {
    const basePath = '/' + location.pathname.split('/').filter(Boolean)[0];
    return mobilePageTitles[basePath] || basePath.replace('/', '').replace(/-/g, ' ');
  }, [location.pathname]);

  // Only block on auth loading - show shell immediately
  // Organization loading can happen in background
  if (authLoading) {
    return <AuthLoadingShell />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }


  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-muted/30">
          <AppSidebar />
          <MobileSidebarTiles />
          <MobileSidebarHandler />
          <NotificationManager />
          <SidebarInset className="flex-1 min-w-0 max-w-full flex flex-col overflow-hidden">
            {/* Top Header Bar */}
            <header className="sticky top-0 z-20 flex h-14 items-center border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-sm w-full min-w-0">
              {/* Left section */}
              <div className="flex items-center gap-2 pl-3 md:pl-4 min-w-0 shrink-0">
                {isMobile ? (
                  isHomePage ? (
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-primary-foreground shadow-sm">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold text-foreground truncate max-w-[160px]">
                        {companySettings?.company_name || 'My Business'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <ArrowLeft className="h-4.5 w-4.5" />
                      </Button>
                      <h1 className="text-sm font-medium text-foreground truncate max-w-[180px] capitalize">
                        {mobilePageTitle}
                      </h1>
                    </div>
                  )
                ) : (
                  <>
                    <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-all duration-200" />
                    <div className="hidden md:flex items-center gap-2 min-w-0">
                      <Breadcrumb />
                      <FavoriteButton />
                    </div>
                  </>
                )}
              </div>
              
              {/* Center section - Search */}
              <div className="flex-1 flex items-center justify-center px-2 md:px-4 min-w-0">
                <div className="hidden sm:block w-full max-w-xs lg:max-w-sm min-w-0">
                  <GlobalSearch />
                </div>
              </div>
              
              {/* Right section */}
              <div className="flex items-center gap-1 pr-3 md:pr-4 shrink-0">
                {!isMobile && <QuickActions />}
                <ThemeToggle />
                <div className="hidden lg:flex items-center gap-1">
                  <RecentActivity />
                </div>
                <div className="hidden sm:block">
                  <PushNotificationToggle />
                </div>
                <NotificationBell />
                <div className="w-px h-5 bg-border/60 mx-0.5 hidden sm:block" />
                <UserDropdown />
              </div>
            </header>
            
            {/* Main Content - Responsive padding, proper overflow */}
            <main className="flex-1 p-2 sm:p-3 md:p-4 lg:p-6 pb-6 overflow-x-hidden overflow-y-auto w-full min-w-0">
              <div className="mx-auto max-w-7xl w-full min-w-0 space-y-3 sm:space-y-4 md:space-y-6">
                <Suspense fallback={<PageLoadingFallback />}>
                  <Outlet />
                </Suspense>
              </div>
            </main>

            {/* Footer - Hidden on mobile (bottom nav takes space) */}
            <div className="hidden md:block">
              <AppFooter />
            </div>

            {/* Mobile Bottom Navigation - Removed */}
            {/* PWA Install Prompt */}
            <InstallPrompt />

            {/* Offline Indicator */}
            <OfflineIndicator />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export default AppLayout;
