import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Eye, Printer, MoreVertical, Trash2 } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ChallanStatusBadge } from '@/components/delivery-challan/ChallanStatusBadge';
import { ChallanDetailDrawer } from '@/components/delivery-challan/ChallanDetailDrawer';
import { CreateChallanDialog } from '@/components/delivery-challan/CreateChallanDialog';
import { useDeliveryChallans } from '@/hooks/useDeliveryChallans';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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

  const handlePrint = (id: string) => {
    window.open(`/delivery-challans/${id}/print`, '_blank');
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteChallan(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delivery Challans</h1>
          <p className="text-muted-foreground">
            Manage delivery challans for your invoices
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Challan
        </Button>
      </div>

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
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : challans.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No delivery challans yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setCreateOpen(true)}
              >
                Create your first challan
              </Button>
            </div>
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
                      className="cursor-pointer transition-colors hover:bg-muted/50"
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
                        <ChallanStatusBadge status={challan.status} />
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
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrint(challan.id);
                              }}
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              Print
                            </DropdownMenuItem>
                            {challan.status === 'draft' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
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

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Challan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this delivery challan? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
