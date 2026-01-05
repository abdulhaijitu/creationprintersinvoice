import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useIsMobile } from '@/hooks/use-mobile';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
  const { user, loading } = useAuth();

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

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <MobileSidebarHandler />
          <SidebarInset className="flex-1 min-w-0 flex flex-col">
            {/* Top Header Bar */}
            <header className="sticky top-0 z-20 flex h-14 md:h-16 items-center gap-3 border-b bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80 px-4 md:px-6 shadow-sm">
              <SidebarTrigger className="-ml-1 h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors" />
              
              {/* Breadcrumb or page context could go here */}
              <div className="flex-1" />
              
              {/* Right side actions */}
              <div className="flex items-center gap-2">
                <NotificationBell />
              </div>
            </header>
            
            {/* Main Content */}
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
              <div className="mx-auto max-w-7xl animate-fade-in">
                <Outlet />
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export default AppLayout;
