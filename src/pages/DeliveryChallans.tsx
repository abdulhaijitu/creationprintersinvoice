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
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Delivery Challans"
        description="Manage delivery challans for your invoices"
        actions={
          <Button onClick={() => setCreateOpen(true)} size="sm" className="md:h-10 md:px-4">
            <Plus className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">New Challan</span>
            <span className="sm:hidden">New</span>
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg font-medium flex items-center gap-2">
            All Challans
            {pendingCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {loading ? (
            <div className="px-4 md:px-0">
              <TableSkeleton rows={5} columns={4} />
            </div>
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
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 px-4">
                {challans.map((challan) => (
                  <div
                    key={challan.id}
                    className="border rounded-lg p-3 space-y-2 active:bg-muted/50 transition-colors"
                    onClick={() => handleView(challan.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{challan.challan_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(challan.challan_date), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <StatusBadge status={challan.status} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[60%]">
                        {challan.customers?.name || challan.invoice?.customers?.name || 'N/A'}
                      </span>
                      <span className="text-muted-foreground">
                        {challan.invoice?.invoice_number || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(challan.id);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {canPrint(challan.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrint(challan.id, challan.status);
                          }}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                      )}
                      {canModify(challan.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-2 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(challan.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block rounded-md border mx-0">
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
            </>
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
