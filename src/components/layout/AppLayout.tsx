import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { SidebarProvider, SidebarTrigger, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
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
import AppFooter from './AppFooter';

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
  const { loading: orgLoading, needsOnboarding } = useOrganization();

  // Only block on auth loading - show shell immediately
  // Organization loading can happen in background
  if (authLoading) {
    return <AuthLoadingShell />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if user has no organization
  if (needsOnboarding && !orgLoading) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-muted/30">
          <AppSidebar />
          <MobileSidebarHandler />
          <NotificationManager />
          <SidebarInset className="flex-1 min-w-0 flex flex-col">
            {/* Top Header Bar */}
            <header className="sticky top-0 z-20 flex h-12 items-center border-b bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 shadow-sm">
              {/* Left section */}
              <div className="flex items-center gap-2 pl-4 md:pl-5 min-w-0">
                <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-all duration-200" />
                <div className="hidden md:flex items-center gap-2 min-w-0">
                  <Breadcrumb />
                  <FavoriteButton />
                </div>
              </div>
              
              {/* Center section */}
              <div className="flex-1 flex items-center justify-center px-4">
                <div className="hidden sm:block w-full max-w-sm">
                  <GlobalSearch />
                </div>
              </div>
              
              {/* Right section */}
              <div className="flex items-center gap-1.5 pr-4 md:pr-5">
                <QuickActions />
                <div className="hidden md:flex items-center gap-1">
                  <ThemeToggle />
                  <RecentActivity />
                </div>
                <PushNotificationToggle />
                <NotificationBell />
                <div className="w-px h-5 bg-border/60 mx-1.5 hidden md:block" />
                <UserDropdown />
              </div>
            </header>
            
            {/* Main Content - Use Suspense for lazy-loaded pages */}
            <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
              <div className="mx-auto max-w-7xl space-y-4">
                <Suspense fallback={<PageLoadingFallback />}>
                  <Outlet />
                </Suspense>
              </div>
            </main>

            {/* Footer */}
            <AppFooter />

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />

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
