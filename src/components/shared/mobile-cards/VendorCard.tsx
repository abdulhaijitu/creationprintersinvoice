import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Edit2, Trash2, MoreHorizontal, Phone, Mail, Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface VendorCardProps {
  vendor: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    total_bills?: number;
    total_paid?: number;
    due_amount?: number;
  };
  onView?: (id: string) => void;
  onEdit?: (vendor: any) => void;
  onDelete?: (id: string) => void;
  canView?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const formatCurrency = (amount: number) => {
  return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const VendorCard = ({
  vendor,
  onView,
  onEdit,
  onDelete,
  canView = true,
  canEdit = false,
  canDelete = false,
}: VendorCardProps) => {
  const dueAmount = vendor.due_amount || 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Vendor name */}
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-semibold text-sm truncate">{vendor.name}</span>
            </div>

            {/* Contact info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {vendor.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {vendor.phone}
                </span>
              )}
              {vendor.email && (
                <span className="flex items-center gap-1 truncate max-w-[150px]">
                  <Mail className="w-3 h-3" />
                  {vendor.email}
                </span>
              )}
            </div>

            {/* Financial summary */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {vendor.total_bills !== undefined && (
                <div>
                  <span className="text-muted-foreground">Bills: </span>
                  <span className="font-medium">{formatCurrency(vendor.total_bills)}</span>
                </div>
              )}
              {vendor.total_paid !== undefined && (
                <div>
                  <span className="text-muted-foreground">Paid: </span>
                  <span className="font-medium text-success">{formatCurrency(vendor.total_paid)}</span>
                </div>
              )}
              {dueAmount > 0 && (
                <div>
                  <span className="text-muted-foreground">Due: </span>
                  <span className="font-medium text-destructive">{formatCurrency(dueAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {canView && onView && (
              <Button variant="ghost" size="icon" onClick={() => onView(vendor.id)}>
                <Eye className="w-4 h-4" />
              </Button>
            )}
            {(canEdit || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canView && onView && (
                    <DropdownMenuItem onClick={() => onView(vendor.id)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                  )}
                  {canEdit && onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(vendor)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {canDelete && onDelete && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete(vendor.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VendorCard;
