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
    <div className={cn("py-2", collapsed ? "px-0" : "px-2")}>
      {!collapsed && (
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Star className="h-3 w-3" />
          Favorites
        </div>
      )}
      <div className={cn(
        "space-y-0.5",
        collapsed && "flex flex-col items-center"
      )}>
        {favorites.map((fav) => {
          const Icon = iconMap[fav.url] || LayoutDashboard;
          const isActive = location.pathname === fav.url;

          const linkContent = (
            <NavLink 
              to={fav.url} 
              className={cn(
                "flex items-center transition-all duration-200",
                collapsed ? "justify-center" : "gap-3 flex-1 min-w-0"
              )}
            >
              <div className={cn(
                "flex items-center justify-center flex-shrink-0",
                collapsed ? "h-8 w-8" : "h-5 w-5"
              )}>
                <Icon className={cn(
                  "h-4 w-4 transition-colors duration-200",
                  isActive ? "text-primary" : "text-slate-400 group-hover:text-white"
                )} />
              </div>
              <span className={cn(
                "text-sm truncate transition-all duration-200",
                collapsed ? "w-0 opacity-0 overflow-hidden" : "opacity-100"
              )}>
                {fav.title}
              </span>
            </NavLink>
          );

          const content = (
            <div
              key={fav.url}
              className={cn(
                "group flex items-center rounded-lg transition-all duration-200",
                collapsed 
                  ? "h-10 w-10 justify-center mx-auto p-0" 
                  : "gap-3 px-3 py-2 mx-1",
                "text-slate-400 hover:text-white hover:bg-white/10",
                isActive && cn(
                  "bg-gradient-to-r from-primary/20 to-primary/10 text-white font-medium",
                  collapsed ? "ring-2 ring-primary/30" : "border-l-2 border-primary"
                )
              )}
            >
              {linkContent}
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
                <TooltipContent 
                  side="right" 
                  sideOffset={8}
                  className="bg-slate-800 text-white border-slate-700"
                >
                  {fav.title}
                </TooltipContent>
              </Tooltip>
            );
          }

          return content;
        })}
      </div>
    </div>
  );
};
