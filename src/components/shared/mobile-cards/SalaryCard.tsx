import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, MoreHorizontal, CheckCircle, Clock, Banknote } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface SalaryCardProps {
  salary: {
    id: string;
    employee_id: string;
    month: number;
    year: number;
    basic_salary: number;
    bonus: number;
    deductions: number;
    advance: number;
    net_payable: number;
    status: string;
    paid_date?: string | null;
    employee?: { full_name: string } | null;
  };
  monthNames: string[];
  onEdit?: (salary: any) => void;
  onDelete?: (salary: any) => void;
  onMarkPaid?: (salary: any) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const formatCurrency = (amount: number) => {
  return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const SalaryCard = ({
  salary,
  monthNames,
  onEdit,
  onDelete,
  onMarkPaid,
  canEdit = false,
  canDelete = false,
}: SalaryCardProps) => {
  const isPaid = salary.status === 'paid';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Employee name + Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">
                {salary.employee?.full_name || 'Unknown'}
              </span>
              <Badge variant={isPaid ? 'default' : 'secondary'} className="text-xs">
                {isPaid ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Paid
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 mr-1" />
                    Pending
                  </>
                )}
              </Badge>
            </div>

            {/* Period */}
            <p className="text-sm text-muted-foreground">
              {monthNames[salary.month - 1]} {salary.year}
            </p>

            {/* Net Payable */}
            <p className="text-lg font-semibold text-primary">
              {formatCurrency(Number(salary.net_payable))}
            </p>

            {/* Breakdown */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Basic: {formatCurrency(Number(salary.basic_salary))}</span>
              {Number(salary.bonus) > 0 && (
                <span className="text-success">+Bonus: {formatCurrency(Number(salary.bonus))}</span>
              )}
              {Number(salary.deductions) > 0 && (
                <span className="text-destructive">-Ded: {formatCurrency(Number(salary.deductions))}</span>
              )}
              {Number(salary.advance) > 0 && (
                <span className="text-warning">-Adv: {formatCurrency(Number(salary.advance))}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isPaid && onMarkPaid && (
                <DropdownMenuItem onClick={() => onMarkPaid(salary)}>
                  <Banknote className="w-4 h-4 mr-2" />
                  Mark as Paid
                </DropdownMenuItem>
              )}
              {canEdit && onEdit && (
                <DropdownMenuItem onClick={() => onEdit(salary)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {canDelete && onDelete && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(salary)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalaryCard;
