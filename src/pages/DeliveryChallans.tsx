import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, Eye, Printer, MoreVertical, Trash2, FileText, Filter, X, Search, ShieldAlert, ChevronLeft, ChevronRight, PackageCheck, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PageHeader } from '@/components/shared/PageHeader';
import { ChallanDetailDrawer } from '@/components/delivery-challan/ChallanDetailDrawer';
import { CreateChallanDialog } from '@/components/delivery-challan/CreateChallanDialog';
import { SortableTableHeader, type SortDirection } from '@/components/shared/SortableTableHeader';
import { useDeliveryChallans } from '@/hooks/useDeliveryChallans';
import { usePermissions } from '@/lib/permissions/hooks';

type ChallanStatus = 'draft' | 'dispatched' | 'delivered' | 'cancelled';

const PAGE_SIZE = 25;

const STATUS_OPTIONS: { value: ChallanStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function DeliveryChallans() {
  const {
    challans,
    loading,
    pendingCount,
    createChallan,
    updateChallanStatus,
    deleteChallan,
  } = useDeliveryChallans();

  const { canPerform, showCreate, showEdit, showDelete } = usePermissions();

  const hasViewAccess = canPerform('delivery_challans', 'view');
  const hasCreateAccess = showCreate('delivery_challans');
  const hasEditAccess = showEdit('delivery_challans');
  const hasDeleteAccess = showDelete('delivery_challans');

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedChallanId, setSelectedChallanId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ChallanStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<string | null>('challan_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredChallans = useMemo(() => {
    let filtered = challans;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.challan_number.toLowerCase().includes(query) ||
          c.invoice?.invoice_number?.toLowerCase().includes(query) ||
          c.customers?.name?.toLowerCase().includes(query) ||
          c.invoice?.customers?.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [challans, statusFilter, searchQuery]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') { setSortDirection(null); setSortKey(null); }
      else setSortDirection('asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedChallans = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredChallans;

    return [...filteredChallans].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortKey) {
        case 'challan_number':
          aVal = a.challan_number; bVal = b.challan_number; break;
        case 'challan_date':
          aVal = new Date(a.challan_date).getTime(); bVal = new Date(b.challan_date).getTime();
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        case 'invoice_number':
          aVal = a.invoice?.invoice_number || ''; bVal = b.invoice?.invoice_number || ''; break;
        case 'customer':
          aVal = (a.customers?.name || a.invoice?.customers?.name || '').toLowerCase();
          bVal = (b.customers?.name || b.invoice?.customers?.name || '').toLowerCase(); break;
        case 'status':
          aVal = a.status; bVal = b.status; break;
        default: return 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [filteredChallans, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedChallans.length / PAGE_SIZE);
  const paginatedChallans = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedChallans.slice(start, start + PAGE_SIZE);
  }, [sortedChallans, currentPage]);

  // Reset page on filter change
  useMemo(() => { setCurrentPage(1); }, [searchQuery, statusFilter, sortKey, sortDirection]);

  const statusCounts = useMemo(() => {
    const counts: Record<ChallanStatus | 'all', number> = {
      all: challans.length,
      draft: 0, dispatched: 0, delivered: 0, cancelled: 0,
    };
    challans.forEach(c => {
      if (counts[c.status as ChallanStatus] !== undefined) counts[c.status as ChallanStatus]++;
    });
    return counts;
  }, [challans]);

  const clearFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter !== 'all' || searchQuery !== '';

  const handleView = (id: string) => {
    setSelectedChallanId(id);
    setDetailOpen(true);
  };

  const handlePrint = (id: string, status: string) => {
    if (status === 'cancelled') return;
    window.open(`/delivery-challans/${id}/print`, '_blank');
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteChallan(deleteId);
      setDeleteId(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: ChallanStatus) => {
    await updateChallanStatus(id, newStatus);
  };

  const canModify = (status: string) => status === 'draft';
  const canPrint = (status: string) => status !== 'cancelled';

  if (!hasViewAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view delivery challans.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Delivery Challans"
        description="Manage delivery challans for your invoices"
        actions={
          hasCreateAccess && (
            <Button onClick={() => setCreateOpen(true)} size="sm" className="md:h-10 md:px-4">
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">New Challan</span>
              <span className="sm:hidden">New</span>
            </Button>
          )
        }
      />

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUS_OPTIONS.filter(s => s.value !== 'all').map((status) => (
          <Card 
            key={status.value}
            className={`cursor-pointer transition-all hover:shadow-md ${
              statusFilter === status.value ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setStatusFilter(statusFilter === status.value ? 'all' : status.value as ChallanStatus)}
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{statusCounts[status.value as ChallanStatus]}</p>
              <p className="text-xs text-muted-foreground capitalize">{status.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search with icon */}
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search challan, invoice, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as ChallanStatus | 'all')}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                      {option.value !== 'all' && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                          {statusCounts[option.value as ChallanStatus]}
                        </Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-sm text-muted-foreground">Filters:</span>
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Status: {statusFilter}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter('all')} />
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: "{searchQuery}"
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                </Badge>
              )}
              <span className="text-sm text-muted-foreground ml-2">
                Showing {filteredChallans.length} of {challans.length}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {loading ? (
            <div className="px-4 md:px-0">
              <TableSkeleton rows={5} columns={6} />
            </div>
          ) : filteredChallans.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={hasActiveFilters ? "No challans match filters" : "No delivery challans yet"}
              description={hasActiveFilters ? "Try adjusting your filters" : "Create your first delivery challan to get started"}
              action={hasActiveFilters ? {
                label: 'Clear Filters',
                onClick: clearFilters,
                icon: X,
              } : hasCreateAccess ? {
                label: 'Create Challan',
                onClick: () => setCreateOpen(true),
                icon: Plus,
              } : undefined}
            />
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 px-4">
                {paginatedChallans.map((challan) => (
                  <div
                    key={challan.id}
                    className="border rounded-lg p-3 space-y-2 active:bg-muted/50 transition-colors"
                    onClick={() => handleView(challan.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{challan.challan_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(challan.challan_date), 'dd/MM/yyyy')}
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
                      {hasDeleteAccess && canModify(challan.status) ? (
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
                      ) : hasDeleteAccess && !canModify(challan.status) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-2 text-destructive opacity-50 cursor-not-allowed"
                                disabled
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            Only draft challans can be deleted
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block rounded-md border mx-0 overflow-x-auto">
                <div className="min-w-[700px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <SortableTableHeader label="Challan No" sortKey="challan_number" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                      </TableHead>
                      <TableHead>
                        <SortableTableHeader label="Date" sortKey="challan_date" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                      </TableHead>
                      <TableHead>
                        <SortableTableHeader label="Invoice No" sortKey="invoice_number" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                      </TableHead>
                      <TableHead>
                        <SortableTableHeader label="Customer" sortKey="customer" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                      </TableHead>
                      <TableHead>
                        <SortableTableHeader label="Status" sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedChallans.map((challan) => (
                      <TableRow
                        key={challan.id}
                        className="cursor-pointer transition-colors duration-200 hover:bg-muted/50"
                        onClick={() => handleView(challan.id)}
                      >
                        <TableCell className="font-medium">
                          {challan.challan_number}
                        </TableCell>
                        <TableCell>
                          {format(new Date(challan.challan_date), 'dd/MM/yyyy')}
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

                              {/* Status change options */}
                              {hasEditAccess && challan.status === 'draft' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(challan.id, 'dispatched');
                                    }}
                                  >
                                    <Truck className="h-4 w-4 mr-2" />
                                    Mark Dispatched
                                  </DropdownMenuItem>
                                </>
                              )}
                              {hasEditAccess && challan.status === 'dispatched' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(challan.id, 'delivered');
                                    }}
                                  >
                                    <PackageCheck className="h-4 w-4 mr-2" />
                                    Mark Delivered
                                  </DropdownMenuItem>
                                </>
                              )}

                              {hasDeleteAccess && canModify(challan.status) && (
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
                              {hasDeleteAccess && !canModify(challan.status) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    disabled
                                    className="text-muted-foreground"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete (only draft)
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
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-4 md:px-0">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} ({sortedChallans.length} records)
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
