import { Star, LayoutDashboard, FileText, Users, Building2, Wallet, CalendarCheck, ListTodo, Settings, FileCheck, Calculator, Truck } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useFavorites, FavoritePage } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidebar } from '@/components/ui/sidebar';

const iconMap: Record<string, React.ElementType> = {
  '/': LayoutDashboard,
  '/invoices': FileText,
  '/customers': Users,
  '/vendors': Building2,
  '/expenses': Wallet,
  '/quotations': FileCheck,
  '/price-calculation': Calculator,
  '/delivery-challans': Truck,
  '/employees': Users,
  '/attendance': CalendarCheck,
  '/tasks': ListTodo,
  '/settings': Settings,
};

export const FavoritePages = () => {
  const { favorites, removeFavorite } = useFavorites();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  if (favorites.length === 0) return null;

  return (
    <div className="px-2 py-2">
      {!collapsed && (
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Star className="h-3 w-3" />
          Favorites
        </div>
      )}
      <div className="space-y-0.5">
        {favorites.map((fav) => {
          const Icon = iconMap[fav.url] || LayoutDashboard;
          const isActive = location.pathname === fav.url;

          const content = (
            <div
              key={fav.url}
              className={cn(
                "group flex items-center gap-3 px-3 py-2 rounded-lg mx-1 transition-all duration-200",
                "text-slate-400 hover:text-white hover:bg-white/5",
                isActive && "bg-gradient-to-r from-primary/20 to-primary/5 text-white font-medium border-l-2 border-primary"
              )}
            >
              <NavLink to={fav.url} className="flex items-center gap-3 flex-1 min-w-0">
                <Icon className={cn("h-4 w-4 flex-shrink-0", isActive && "text-primary")} />
                {!collapsed && <span className="text-sm truncate">{fav.title}</span>}
              </NavLink>
              {!collapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-yellow-400"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeFavorite(fav.url);
                  }}
                >
                  <Star className="h-3 w-3 fill-current" />
                </Button>
              )}
            </div>
          );

          if (collapsed) {
            return (
              <Tooltip key={fav.url} delayDuration={0}>
                <TooltipTrigger asChild>{content}</TooltipTrigger>
                <TooltipContent side="right">{fav.title}</TooltipContent>
              </Tooltip>
            );
          }

          return content;
        })}
      </div>
    </div>
  );
};
