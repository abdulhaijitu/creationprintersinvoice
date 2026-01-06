import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export const AdminPageHeader = ({
  title,
  description,
  actions,
}: AdminPageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 mt-4 sm:mt-0">
        {actions}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/')}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          View App
        </Button>
      </div>
    </div>
  );
};
