import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { QuotationWorkflowStepper } from '@/components/quotation/QuotationWorkflowStepper';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface QuotationCardProps {
  quotation: {
    id: string;
    quotation_number: string;
    quotation_date: string;
    valid_until: string | null;
    total: number;
    status: string;
    customers: { name: string } | null;
  };
  onView: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function QuotationCard({
  quotation,
  onView,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
}: QuotationCardProps) {
  // UPDATED BUSINESS RULES:
  // - Edit: Allowed for ALL statuses (permission-based only)
  // - Delete: Only allowed for draft status
  const isEditable = true; // All statuses are now editable
  const isDeletable = quotation.status === 'draft';

  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onView(quotation.id)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold truncate">{quotation.quotation_number}</p>
            <p className="text-sm text-muted-foreground truncate">
              {quotation.customers?.name || 'No Customer'}
            </p>
          </div>
          <StatusBadge status={quotation.status} />
        </div>

        {/* Compact Workflow Stepper */}
        <QuotationWorkflowStepper
          currentStatus={quotation.status as any}
          compact={true}
          interactive={false}
        />

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {format(new Date(quotation.quotation_date), 'dd MMM yyyy')}
          </span>
          <span className="font-medium text-primary">
            {formatCurrency(Number(quotation.total))}
          </span>
        </div>

        {quotation.valid_until && (
          <p className="text-xs text-muted-foreground">
            Valid until: {format(new Date(quotation.valid_until), 'dd MMM yyyy')}
          </p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9"
            onClick={(e) => {
              e.stopPropagation();
              onView(quotation.id);
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          {canEdit && isEditable && onEdit && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(quotation.id);
              }}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          {canDelete && isDeletable && onDelete && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(quotation.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
