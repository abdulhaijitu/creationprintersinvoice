import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  UserRound, 
  Wallet, 
  Plus,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePermissionContext } from '@/contexts/PermissionContext';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  matchPaths?: string[];
}

export const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasModuleAccess } = usePermissionContext();
  const [showQuickActions, setShowQuickActions] = useState(false);

  const navItems: NavItem[] = [
    { 
      icon: LayoutDashboard, 
      label: 'Home', 
      path: '/',
      matchPaths: ['/']
    },
    { 
      icon: FileText, 
      label: 'Invoices', 
      path: '/invoices',
      matchPaths: ['/invoices', '/quotations', '/delivery-challans']
    },
    { 
      icon: UserRound, 
      label: 'Customers', 
      path: '/customers',
      matchPaths: ['/customers']
    },
    { 
      icon: Wallet, 
      label: 'Expenses', 
      path: '/expenses',
      matchPaths: ['/expenses', '/vendors']
    },
  ];

  const quickActions = [
    { label: 'New Invoice', path: '/invoices/new', permissionKey: 'main.invoices' },
    { label: 'New Customer', path: '/customers', permissionKey: 'business.customers' },
    { label: 'New Quotation', path: '/quotations/new', permissionKey: 'main.quotations' },
    { label: 'Add Expense', path: '/expenses', permissionKey: 'business.expenses' },
  ];

  const isActive = (item: NavItem) => {
    if (item.matchPaths) {
      return item.matchPaths.some(p => 
        p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
      );
    }
    return location.pathname === item.path;
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setShowQuickActions(false);
  };

  return (
    <>
      {/* Quick Actions Overlay */}
      {showQuickActions && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 sm:hidden animate-fade-in"
          onClick={() => setShowQuickActions(false)}
        />
      )}

      {/* Quick Actions Menu */}
      <div className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-50 sm:hidden transition-all duration-300",
        showQuickActions 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        <div className="bg-card border rounded-2xl shadow-xl p-2 flex flex-col gap-1 min-w-[200px]">
          {quickActions
            .filter(action => hasModuleAccess(action.permissionKey))
            .map((action) => (
              <Button
                key={action.path}
                variant="ghost"
                className="justify-start h-12 text-sm font-medium touch-target"
                onClick={() => handleNavClick(action.path)}
              >
                <Plus className="h-4 w-4 mr-2 text-primary" />
                {action.label}
              </Button>
            ))}
        </div>
      </div>

      {/* Bottom Navigation Bar - Only on mobile (<640px) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-background/95 backdrop-blur-lg border-t safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {navItems.slice(0, 2).map((item) => {
            const active = isActive(item);
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px] touch-target",
                  active 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground active:scale-95"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  active && "bg-primary/10"
                )}>
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}

          {/* Center FAB Button */}
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className={cn(
              "relative -mt-6 flex items-center justify-center h-14 w-14 rounded-full shadow-lg transition-all duration-300 touch-target",
              showQuickActions 
                ? "bg-muted rotate-45" 
                : "bg-primary hover:bg-primary/90 active:scale-95"
            )}
          >
            {showQuickActions ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Plus className="h-6 w-6 text-primary-foreground" />
            )}
          </button>

          {navItems.slice(2, 4).map((item) => {
            const active = isActive(item);
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px] touch-target",
                  active 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground active:scale-95"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  active && "bg-primary/10"
                )}>
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
