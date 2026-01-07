import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  searchComponent?: ReactNode;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export const AdminPageHeader = ({
  title,
  description,
  actions,
  searchComponent,
  onMenuClick,
  showMenuButton = false,
}: AdminPageHeaderProps) => {
  const isMobile = useIsMobile();

  const handleViewApp = () => {
    window.open('/', '_blank');
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Menu Button */}
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="shrink-0 md:hidden h-9 w-9"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground line-clamp-1">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {searchComponent && (
          <div className="w-full sm:w-auto order-last sm:order-none">
            {searchComponent}
          </div>
        )}
        {actions}
        <Button
          variant="outline"
          size={isMobile ? 'icon' : 'sm'}
          onClick={handleViewApp}
          className="gap-2 shrink-0"
        >
          <ExternalLink className="h-4 w-4" />
          {!isMobile && 'View App'}
        </Button>
      </div>
    </div>
  );
};
