import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface PriceCalculationCardProps {
  calculation: {
    id: string;
    job_description: string;
    costing_total: number;
    margin_percent: number;
    final_price: number;
    created_at: string;
    customers: { name: string } | null;
  };
  onView: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function PriceCalculationCard({
  calculation,
  onView,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
}: PriceCalculationCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onView(calculation.id)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="min-w-0">
          <p className="font-semibold truncate">{calculation.job_description}</p>
          <p className="text-sm text-muted-foreground truncate">
            {calculation.customers?.name || 'No Customer'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Costing:</span>
            <p className="font-medium">{formatCurrency(Number(calculation.costing_total) || 0)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Margin:</span>
            <p className="font-medium">{Number(calculation.margin_percent) || 0}%</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {format(new Date(calculation.created_at), 'dd MMM yyyy')}
          </span>
          <span className="font-semibold text-primary">
            {formatCurrency(Number(calculation.final_price) || 0)}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9"
            onClick={(e) => {
              e.stopPropagation();
              onView(calculation.id);
            }}
          >
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
          {canEdit && onEdit && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(calculation.id);
              }}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          {canDelete && onDelete && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(calculation.id);
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
