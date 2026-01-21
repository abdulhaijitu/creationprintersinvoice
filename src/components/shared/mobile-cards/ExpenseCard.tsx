import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Edit2, Trash2, MoreHorizontal, Tag, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface ExpenseCardProps {
  expense: {
    id: string;
    date: string;
    description: string;
    amount: number;
    payment_method?: string | null;
    category?: { id: string; name: string } | null;
    vendor?: { id: string; name: string } | null;
  };
  onEdit?: (expense: any) => void;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const formatCurrency = (amount: number) => {
  return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const ExpenseCard = ({
  expense,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
}: ExpenseCardProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Description */}
            <p className="font-medium text-sm line-clamp-2">
              {expense.description}
            </p>

            {/* Amount */}
            <p className="text-lg font-semibold text-destructive">
              {formatCurrency(Number(expense.amount))}
            </p>

            {/* Date + payment method */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{format(new Date(expense.date), 'dd MMM yyyy')}</span>
              {expense.payment_method && (
                <span className="capitalize">• {expense.payment_method}</span>
              )}
            </div>

            {/* Category + Vendor badges */}
            <div className="flex flex-wrap items-center gap-2">
              {expense.category && (
                <Badge variant="secondary" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  {expense.category.name}
                </Badge>
              )}
              {expense.vendor && (
                <Badge variant="outline" className="text-xs">
                  <Building2 className="w-3 h-3 mr-1" />
                  {expense.vendor.name}
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          {(canEdit || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(expense)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canDelete && onDelete && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(expense.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseCard;
