import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePasswordResetCheck } from '@/hooks/usePasswordResetCheck';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useFirstLogin } from '@/hooks/useFirstLogin';
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
import { TrialBanner } from '@/components/subscription/TrialBanner';
import { UsageLimitBanner } from '@/components/usage/UsageLimitBanner';
import WelcomeScreen from '@/components/welcome/WelcomeScreen';

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

const AppLayout = () => {
  const { user, loading: authLoading } = useAuth();
  const { loading: orgLoading, needsOnboarding } = useOrganization();
  const { mustResetPassword, checking: resetChecking } = usePasswordResetCheck();
  const { showWelcome, loading: welcomeLoading, completeFirstLogin } = useFirstLogin();

  const loading = authLoading || orgLoading || resetChecking || welcomeLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-8 w-3/4 rounded-lg" />
          <Skeleton className="h-8 w-1/2 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to password reset if required
  if (mustResetPassword) {
    return <Navigate to="/reset-password" replace />;
  }

  // Redirect to onboarding if user has no organization
  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      {showWelcome && <WelcomeScreen onComplete={completeFirstLogin} />}
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-muted/30">
          <AppSidebar />
          <MobileSidebarHandler />
          <NotificationManager />
          <SidebarInset className="flex-1 min-w-0 flex flex-col">
            {/* Top Header Bar */}
            <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 px-4 md:px-6 shadow-sm">
              {/* Left side - trigger + breadcrumb + favorite */}
              <div className="flex items-center gap-3">
                <SidebarTrigger className="-ml-1 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors" />
                <div className="hidden md:flex items-center gap-2">
                  <Breadcrumb />
                  <FavoriteButton />
                </div>
              </div>
              
              {/* Center - spacer */}
              <div className="flex-1" />
              
              {/* Right side - search, quick actions, notifications, user */}
              <div className="flex items-center gap-1">
                <div className="hidden sm:block">
                  <GlobalSearch />
                </div>
                <QuickActions />
                <div className="hidden md:flex items-center gap-1">
                  <ThemeToggle />
                  <RecentActivity />
                </div>
                <PushNotificationToggle />
                <NotificationBell />
                <div className="w-px h-6 bg-border mx-1 hidden md:block" />
                <UserDropdown />
              </div>
            </header>
            
            {/* Main Content */}
            <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
              <div className="mx-auto max-w-7xl animate-fade-in space-y-4">
                <TrialBanner />
                <UsageLimitBanner />
                <Outlet />
              </div>
            </main>

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
