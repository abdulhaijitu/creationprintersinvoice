import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger, SidebarInset, useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useIsMobile } from '@/hooks/use-mobile';

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
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <MobileSidebarHandler />
        <SidebarInset className="flex-1 min-w-0">
          <header className="sticky top-0 z-10 flex h-14 md:h-16 items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 md:px-6">
            <SidebarTrigger className="-ml-1 h-9 w-9 md:h-10 md:w-10" />
            <div className="flex-1" />
            <NotificationBell />
          </header>
          <main className="flex-1 p-3 md:p-4 lg:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
