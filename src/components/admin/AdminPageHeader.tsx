import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Menu, Command } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  searchComponent?: ReactNode;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  onCommandPaletteOpen?: () => void;
}

export const AdminPageHeader = ({
  title,
  description,
  actions,
  searchComponent,
  onMenuClick,
  showMenuButton = false,
  onCommandPaletteOpen,
}: AdminPageHeaderProps) => {
  const isMobile = useIsMobile();

  const handleViewApp = () => {
    window.open('/', '_blank');
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Menu Button */}
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="shrink-0 lg:hidden h-10 w-10 touch-target"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        )}

        {/* Command Palette Trigger */}
        {onCommandPaletteOpen && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size={isMobile ? 'icon' : 'sm'}
                onClick={onCommandPaletteOpen}
                className="gap-2 shrink-0 h-10 touch-target"
                aria-label="Open command palette"
              >
                <Command className="h-4 w-4" />
                {!isMobile && (
                  <>
                    <span className="text-xs text-muted-foreground hidden sm:inline">Search...</span>
                    <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:inline-flex">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span className="flex items-center gap-2">
                Command palette
                <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium inline-flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </span>
            </TooltipContent>
          </Tooltip>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight text-foreground truncate">
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
          className="gap-2 shrink-0 h-10 touch-target"
        >
          <ExternalLink className="h-4 w-4" />
          {!isMobile && <span className="hidden sm:inline">View App</span>}
        </Button>
      </div>
    </div>
  );
};
