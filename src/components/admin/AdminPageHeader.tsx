import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  searchComponent?: ReactNode;
}

export const AdminPageHeader = ({
  title,
  description,
  actions,
  searchComponent,
}: AdminPageHeaderProps) => {
  const handleViewApp = () => {
    window.open('/', '_blank');
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground truncate">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {searchComponent}
        {actions}
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewApp}
          className="gap-2 shrink-0"
        >
          <ExternalLink className="h-4 w-4" />
          View App
        </Button>
      </div>
    </div>
  );
};
