import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Eye, Printer, MoreVertical, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { ChallanDetailDrawer } from '@/components/delivery-challan/ChallanDetailDrawer';
import { CreateChallanDialog } from '@/components/delivery-challan/CreateChallanDialog';
import { useDeliveryChallans } from '@/hooks/useDeliveryChallans';

export default function DeliveryChallans() {
  const {
    challans,
    loading,
    pendingCount,
    createChallan,
    updateChallanStatus,
    deleteChallan,
  } = useDeliveryChallans();

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedChallanId, setSelectedChallanId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleView = (id: string) => {
    setSelectedChallanId(id);
    setDetailOpen(true);
  };

  const handlePrint = (id: string, status: string) => {
    // Don't allow printing cancelled challans
    if (status === 'cancelled') return;
    window.open(`/delivery-challans/${id}/print`, '_blank');
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteChallan(deleteId);
      setDeleteId(null);
    }
  };

  const canModify = (status: string) => status === 'draft';
  const canPrint = (status: string) => status !== 'cancelled';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Challans"
        description="Manage delivery challans for your invoices"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Challan
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            All Challans
            {pendingCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : challans.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No delivery challans yet"
              description="Create your first delivery challan to get started"
              action={{
                label: 'Create Challan',
                onClick: () => setCreateOpen(true),
                icon: Plus,
              }}
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Challan No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice No</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {challans.map((challan) => (
                    <TableRow
                      key={challan.id}
                      className="cursor-pointer transition-colors duration-200 hover:bg-muted/50"
                      onClick={() => handleView(challan.id)}
                    >
                      <TableCell className="font-medium">
                        {challan.challan_number}
                      </TableCell>
                      <TableCell>
                        {format(new Date(challan.challan_date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        {challan.invoice?.invoice_number || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {challan.customers?.name ||
                          challan.invoice?.customers?.name ||
                          'N/A'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={challan.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleView(challan.id);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {canPrint(challan.status) && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrint(challan.id, challan.status);
                                }}
                              >
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                              </DropdownMenuItem>
                            )}
                            {canModify(challan.status) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteId(challan.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateChallanDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={createChallan}
      />

      <ChallanDetailDrawer
        open={detailOpen}
        onOpenChange={setDetailOpen}
        challanId={selectedChallanId}
        onStatusChange={updateChallanStatus}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Challan"
        description="Are you sure you want to delete this delivery challan? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
