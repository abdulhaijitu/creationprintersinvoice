import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { SortableTableHeader, useSortableTable } from '@/components/shared/SortableTableHeader';
import { usePayments, Payment } from '@/hooks/usePayments';
import { useActionPermission } from '@/components/guards/ActionGuard';
import { CreateGuard, EditGuard, DeleteGuard } from '@/components/guards/ActionGuard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Search,
  Eye,
  Edit,
  RotateCcw,
  MoreHorizontal,
  TrendingUp,
  Clock,
  AlertCircle,
  Calendar,
  CheckCircle,
  Filter,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { AddPaymentFromListDialog } from '@/components/payments/AddPaymentFromListDialog';
import { EditPaymentDialog } from '@/components/payments/EditPaymentDialog';

type StatusFilter = 'all' | 'paid' | 'partial' | 'due';
const PAGE_SIZE = 25;

const Payments = () => {
  const navigate = useNavigate();
  const { payments, stats, loading, refetch } = usePayments();
  const paymentPerms = useActionPermission('payments');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { sortKey, sortDirection, handleSort } = useSortableTable<Payment>('payment_date', 'desc');

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getInvoiceStatus = (payment: Payment) => {
    const invoice = payment.invoice;
    if (!invoice) return 'unknown';

    const total = Number(invoice.total);
    const paid = Number(invoice.paid_amount || 0);
    const due = total - paid;

    if (due <= 0) return 'paid';
    if (paid > 0) return 'partial';
    return 'due';
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, JSX.Element> = {
      paid: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
          <CheckCircle className="w-3.5 h-3.5" />
          PAID
        </span>
      ),
      partial: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">
          <Clock className="w-3.5 h-3.5" />
          PARTIAL
        </span>
      ),
      due: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
          <AlertCircle className="w-3.5 h-3.5" />
          DUE
        </span>
      ),
      unknown: (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          Unknown
        </span>
      ),
    };
    return badges[status] || badges.unknown;
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const matchesSearch =
        payment.invoice?.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.invoice?.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.reference?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;

      const status = getInvoiceStatus(payment);
      return status === statusFilter;
    });
  }, [payments, searchQuery, statusFilter]);

  const sortedPayments = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredPayments;

    return [...filteredPayments].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortKey) {
        case 'payment_date':
          aVal = a.payment_date;
          bVal = b.payment_date;
          break;
        case 'invoice_number':
          aVal = a.invoice?.invoice_number || '';
          bVal = b.invoice?.invoice_number || '';
          break;
        case 'customer':
          aVal = a.invoice?.customers?.name || '';
          bVal = b.invoice?.customers?.name || '';
          break;
        case 'payment_method':
          aVal = a.payment_method || '';
          bVal = b.payment_method || '';
          break;
        case 'amount':
          aVal = Number(a.amount);
          bVal = Number(b.amount);
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        case 'total':
          aVal = Number(a.invoice?.total || 0);
          bVal = Number(b.invoice?.total || 0);
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        case 'due':
          aVal = Number(a.invoice?.total || 0) - Number(a.invoice?.paid_amount || 0);
          bVal = Number(b.invoice?.total || 0) - Number(b.invoice?.paid_amount || 0);
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        case 'status':
          aVal = getInvoiceStatus(a);
          bVal = getInvoiceStatus(b);
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [filteredPayments, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedPayments.length / PAGE_SIZE);
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedPayments.slice(start, start + PAGE_SIZE);
  }, [sortedPayments, currentPage]);

  // Reset page on filter change
  useMemo(() => { setCurrentPage(1); }, [searchQuery, statusFilter, sortKey, sortDirection]);

  // Summary totals for filtered data
  const summaryTotals = useMemo(() => {
    let totalPaid = 0;
    let totalDue = 0;
    filteredPayments.forEach((p) => {
      totalPaid += Number(p.amount);
      const invoiceTotal = Number(p.invoice?.total || 0);
      const paidAmount = Number(p.invoice?.paid_amount || 0);
      totalDue += Math.max(0, invoiceTotal - paidAmount);
    });
    return { totalPaid, totalDue };
  }, [filteredPayments]);

  const handleRefund = async () => {
    if (!selectedPayment) return;
    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from('invoice_payments')
        .delete()
        .eq('id', selectedPayment.id);

      if (error) throw error;

      toast.success('Payment refunded successfully');
      setRefundDialogOpen(false);
      setSelectedPayment(null);
      refetch();
    } catch (error: any) {
      console.error('Error processing refund:', error);
      toast.error(error.message || 'Failed to process refund');
    } finally {
      setIsProcessing(false);
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    variant = 'default',
  }: {
    title: string;
    value: string;
    icon: React.ElementType;
    variant?: 'default' | 'success' | 'warning' | 'destructive';
  }) => {
    const variantStyles = {
      default: 'text-foreground',
      success: 'text-success',
      warning: 'text-warning',
      destructive: 'text-destructive',
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className={cn('h-4 w-4', variantStyles[variant])} />
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', variantStyles[variant])}>{value}</div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 w-full min-w-0">
      {/* Stats Cards - Collapsible */}
      <Collapsible open={showStats} onOpenChange={setShowStats}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            {showStats ? 'Hide Stats' : 'Show Stats'}
            <ChevronDown className={cn("w-4 h-4 transition-transform", showStats && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Received (This Month)"
              value={formatCurrency(stats.totalReceivedThisMonth)}
              icon={TrendingUp}
              variant="success"
            />
            <StatCard
              title="Pending Due"
              value={formatCurrency(stats.pendingDue)}
              icon={Clock}
              variant="warning"
            />
            <StatCard
              title="Overdue Amount"
              value={formatCurrency(stats.overdueAmount)}
              icon={AlertCircle}
              variant="destructive"
            />
            <StatCard
              title="Today's Collections"
              value={formatCurrency(stats.todayCollections)}
              icon={Calendar}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Payments Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Payment Records</CardTitle>
            <CreateGuard module="payments">
              <Button onClick={() => setAddPaymentOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Payment
              </Button>
            </CreateGuard>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          {/* Filters */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_auto] mb-4">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice, customer, or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="due">Due</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop/Tablet: Responsive Table */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortableTableHeader label="Date" sortKey="payment_date" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} /></TableHead>
                  <TableHead><SortableTableHeader label="Invoice" sortKey="invoice_number" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} /></TableHead>
                  <TableHead className="hidden lg:table-cell"><SortableTableHeader label="Customer" sortKey="customer" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} /></TableHead>
                  <TableHead className="hidden xl:table-cell"><SortableTableHeader label="Method" sortKey="payment_method" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} /></TableHead>
                  <TableHead className="text-right"><SortableTableHeader label="Paid" sortKey="amount" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" /></TableHead>
                  <TableHead className="text-right hidden xl:table-cell"><SortableTableHeader label="Total" sortKey="total" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" /></TableHead>
                  <TableHead className="text-right"><SortableTableHeader label="Due" sortKey="due" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" /></TableHead>
                  <TableHead className="hidden lg:table-cell"><SortableTableHeader label="Status" sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} /></TableHead>
                  <TableHead className="text-right w-[60px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Clock className="w-8 h-8 mb-2" />
                        <p>No payments found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPayments.map((payment) => {
                    const invoice = payment.invoice;
                    const invoiceTotal = Number(invoice?.total || 0);
                    const paidAmount = Number(invoice?.paid_amount || 0);
                    const balanceDue = invoiceTotal - paidAmount;
                    const status = getInvoiceStatus(payment);

                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(parseISO(payment.payment_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            className="p-0 h-auto font-medium text-xs md:text-sm"
                            onClick={() => navigate(`/invoices/${invoice?.id}`)}
                          >
                            {invoice?.invoice_number || 'N/A'}
                          </Button>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell truncate max-w-[120px]">{invoice?.customers?.name || 'N/A'}</TableCell>
                        <TableCell className="capitalize hidden xl:table-cell">
                          {payment.payment_method || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-success">
                          {formatCurrency(Number(payment.amount))}
                        </TableCell>
                        <TableCell className="text-right hidden xl:table-cell">
                          {formatCurrency(invoiceTotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(balanceDue > 0 && 'text-destructive')}>
                            {formatCurrency(balanceDue)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{getStatusBadge(status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => navigate(`/invoices/${invoice?.id}`)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Invoice
                              </DropdownMenuItem>
                              <EditGuard module="payments">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedPayment(payment);
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              </EditGuard>
                              <DeleteGuard module="payments">
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    setSelectedPayment(payment);
                                    setRefundDialogOpen(true);
                                  }}
                                >
                                  <RotateCcw className="w-4 h-4 mr-2" />
                                  Refund
                                </DropdownMenuItem>
                              </DeleteGuard>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              {paginatedPayments.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="hidden xl:table-cell font-semibold">
                      Filtered Total ({filteredPayments.length} records)
                    </TableCell>
                    <TableCell colSpan={2} className="xl:hidden font-semibold">
                      Total ({filteredPayments.length})
                    </TableCell>
                    <TableCell className="text-right font-semibold text-success">
                      {formatCurrency(summaryTotals.totalPaid)}
                    </TableCell>
                    <TableCell className="text-right hidden xl:table-cell" />
                    <TableCell className="text-right font-semibold text-destructive">
                      {formatCurrency(summaryTotals.totalDue)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell" />
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({sortedPayments.length} records)
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Mobile: Card layout */}
          <div className="block md:hidden space-y-3">
            {paginatedPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="w-8 h-8 mb-2" />
                <p>No payments found</p>
              </div>
            ) : (
              paginatedPayments.map((payment) => {
                const invoice = payment.invoice;
                const invoiceTotal = Number(invoice?.total || 0);
                const paidAmount = Number(invoice?.paid_amount || 0);
                const balanceDue = invoiceTotal - paidAmount;
                const status = getInvoiceStatus(payment);

                return (
                  <div
                    key={payment.id}
                    className="bg-card border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">
                            {invoice?.invoice_number || 'N/A'}
                          </span>
                          {getStatusBadge(status)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {invoice?.customers?.name || 'No Customer'}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                          <span>{format(parseISO(payment.payment_date), 'dd/MM/yyyy')}</span>
                          {payment.payment_method && (
                            <span className="capitalize">• {payment.payment_method}</span>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => invoice?.id && navigate(`/invoices/${invoice.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm pt-2 border-t">
                      <div>
                        <span className="text-muted-foreground">Paid: </span>
                        <span className="font-medium text-success">{formatCurrency(Number(payment.amount))}</span>
                      </div>
                      {balanceDue > 0 && (
                        <div>
                          <span className="text-muted-foreground">Due: </span>
                          <span className="font-medium text-destructive">{formatCurrency(balanceDue)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => invoice?.id && navigate(`/invoices/${invoice.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Invoice
                      </Button>
                      <EditGuard module="payments">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </EditGuard>
                      <DeleteGuard module="payments">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setRefundDialogOpen(true);
                          }}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </DeleteGuard>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Payment Dialog */}
      <AddPaymentFromListDialog
        open={addPaymentOpen}
        onOpenChange={setAddPaymentOpen}
        onPaymentAdded={refetch}
      />

      {/* Edit Payment Dialog */}
      {selectedPayment && (
        <EditPaymentDialog
          payment={selectedPayment}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onPaymentUpdated={refetch}
        />
      )}

      {/* Refund Confirmation Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Refund</DialogTitle>
            <DialogDescription>
              Are you sure you want to refund this payment of{' '}
              <strong>{formatCurrency(Number(selectedPayment?.amount || 0))}</strong>?{' '}
              <span className="text-destructive font-medium">
                This will permanently delete the payment record
              </span>{' '}
              and update the invoice balance accordingly.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRefund} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Confirm Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
