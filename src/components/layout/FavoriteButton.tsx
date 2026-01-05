import { Star } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/invoices': 'Invoices',
  '/quotations': 'Quotations',
  '/price-calculation': 'Price Calculations',
  '/delivery-challans': 'Delivery Challans',
  '/vendors': 'Vendors',
  '/expenses': 'Expenses',
  '/employees': 'Employees',
  '/attendance': 'Attendance',
  '/leave': 'Leave Management',
  '/salary': 'Payroll',
  '/performance': 'Performance',
  '/tasks': 'Tasks',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/user-roles': 'User Roles',
};

export const FavoriteButton = () => {
  const location = useLocation();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  // Extract base path (e.g., /customers from /customers/123)
  const basePath = '/' + location.pathname.split('/').filter(Boolean)[0] || '/';
  const pageTitle = pageTitles[basePath];
  
  // Don't show for pages we don't have titles for or detail pages
  if (!pageTitle || location.pathname.split('/').filter(Boolean).length > 1) {
    return null;
  }

  const isFav = isFavorite(basePath);

  const handleToggle = () => {
    toggleFavorite({
      url: basePath,
      title: pageTitle,
      icon: basePath,
    });
    
    if (!isFav) {
      toast.success(`Added "${pageTitle}" to favorites`);
    } else {
      toast.info(`Removed "${pageTitle}" from favorites`);
    }
  };

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 transition-colors",
            isFav ? "text-yellow-500 hover:text-yellow-600" : "text-muted-foreground hover:text-foreground"
          )}
          onClick={handleToggle}
        >
          <Star className={cn("h-4 w-4", isFav && "fill-current")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isFav ? 'Remove from favorites' : 'Add to favorites'}
      </TooltipContent>
    </Tooltip>
  );
};
