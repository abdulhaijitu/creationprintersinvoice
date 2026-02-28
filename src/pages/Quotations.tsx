import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgScopedQuery } from '@/hooks/useOrgScopedQuery';
import { usePermissions } from '@/lib/permissions/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Search, Eye, FileText, Trash2, Edit, ShieldAlert, Filter, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { QuotationCard } from '@/components/shared/mobile-cards/QuotationCard';
import { formatCurrency } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { SortableTableHeader, type SortDirection } from '@/components/shared/SortableTableHeader';

type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted' | 'expired';

const PAGE_SIZE = 25;

interface Quotation {
  id: string;
  quotation_number: string;
  customer_id: string | null;
  quotation_date: string;
  valid_until: string | null;
  total: number;
  status: QuotationStatus;
  customers: { name: string } | null;
}

// Status options for filter
const STATUS_OPTIONS: { value: QuotationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'converted', label: 'Converted' },
  { value: 'expired', label: 'Expired' },
];

// Date range presets
const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
];

const Quotations = () => {
  const navigate = useNavigate();
  const { canPerform, showCreate, showDelete, showEdit } = usePermissions();
  const { organizationId, hasOrgContext } = useOrgScopedQuery();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | 'all'>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null);
  const [sortKey, setSortKey] = useState<string | null>('quotation_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // Permission checks
  const hasViewAccess = canPerform('quotations', 'view');
  const hasCreateAccess = showCreate('quotations');
  const hasEditAccess = showEdit('quotations');
  const hasDeleteAccess = showDelete('quotations');

  useEffect(() => {
    if (hasOrgContext && organizationId) {
      fetchQuotations();
    } else {
      setQuotations([]);
      setLoading(false);
    }
  }, [organizationId, hasOrgContext]);

  const fetchQuotations = async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    
    try {
      // Fire-and-forget: don't block page load
      supabase.rpc('auto_expire_quotations').then(() => {});
      
      const { data, error } = await supabase
        .from('quotations')
        .select('id, quotation_number, customer_id, quotation_date, valid_until, total, status, created_at, customers(name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations((data || []) as Quotation[]);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      toast.error('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (quotation: Quotation) => {
    if (quotation.status !== 'draft') {
      toast.error('Only draft quotations can be deleted');
      return;
    }
    setQuotationToDelete(quotation);
    setDeleteId(quotation.id);
  };

  const handleDelete = async () => {
    if (!deleteId || !quotationToDelete) return;
    
    if (quotationToDelete.status !== 'draft') {
      toast.error('Only draft quotations can be deleted');
      setDeleteId(null);
      setQuotationToDelete(null);
      return;
    }
    
    try {
      await supabase.from('quotation_items').delete().eq('quotation_id', deleteId);
      const { error } = await supabase.from('quotations').delete().eq('id', deleteId);
      if (error) throw error;
      
      toast.success('Quotation deleted');
      setDeleteId(null);
      setQuotationToDelete(null);
      fetchQuotations();
    } catch (error) {
      console.error('Error deleting quotation:', error);
      toast.error('Failed to delete quotation');
    }
  };

  const getDateRange = (range: string) => {
    const today = new Date();
    switch (range) {
      case 'today':
        return { start: format(today, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      case 'this_week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { start: format(weekStart, 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      case 'this_month':
        return { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd') };
      case 'last_month':
        const lastMonth = subMonths(today, 1);
        return { start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), end: format(endOfMonth(lastMonth), 'yyyy-MM-dd') };
      case 'last_3_months':
        const threeMonthsAgo = subMonths(today, 3);
        return { start: format(startOfMonth(threeMonthsAgo), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      default:
        return null;
    }
  };

  const filteredQuotations = useMemo(() => {
    let filtered = quotations;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(q => q.status === statusFilter);
    }

    const dateRange = getDateRange(dateRangeFilter);
    if (dateRange) {
      filtered = filtered.filter(q => {
        const date = q.quotation_date;
        return date >= dateRange.start && date <= dateRange.end;
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.quotation_number.toLowerCase().includes(query) ||
          q.customers?.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [quotations, statusFilter, dateRangeFilter, searchQuery]);

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

  const sortedQuotations = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredQuotations;

    return [...filteredQuotations].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortKey) {
        case 'quotation_number':
          aVal = a.quotation_number; bVal = b.quotation_number; break;
        case 'customer':
          aVal = a.customers?.name?.toLowerCase() || ''; bVal = b.customers?.name?.toLowerCase() || ''; break;
        case 'quotation_date':
          aVal = new Date(a.quotation_date).getTime(); bVal = new Date(b.quotation_date).getTime(); break;
        case 'valid_until':
          aVal = a.valid_until ? new Date(a.valid_until).getTime() : 0;
          bVal = b.valid_until ? new Date(b.valid_until).getTime() : 0; break;
        case 'total':
          aVal = Number(a.total); bVal = Number(b.total); break;
        case 'status':
          aVal = a.status; bVal = b.status; break;
        default: return 0;
      }

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;

      let comparison: number;
      if (typeof aVal === 'string') comparison = aVal.localeCompare(bVal);
      else comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredQuotations, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedQuotations.length / PAGE_SIZE);
  const paginatedQuotations = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedQuotations.slice(start, start + PAGE_SIZE);
  }, [sortedQuotations, currentPage]);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, dateRangeFilter, sortKey, sortDirection]);

  const statusCounts = useMemo(() => {
    const counts: Record<QuotationStatus | 'all', number> = {
      all: quotations.length,
      draft: 0, sent: 0, accepted: 0, rejected: 0, converted: 0, expired: 0,
    };
    quotations.forEach(q => {
      if (counts[q.status] !== undefined) counts[q.status]++;
    });
    return counts;
  }, [quotations]);

  const clearFilters = () => {
    setStatusFilter('all');
    setDateRangeFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter !== 'all' || dateRangeFilter !== 'all' || searchQuery !== '';

  const isDeletable = (status: QuotationStatus) => status === 'draft';

  // Access denied view
  if (!hasViewAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view quotations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 w-full min-w-0 animate-fade-in">
      <PageHeader
        title="Quotations"
        description="Manage all quotations"
        actions={
          hasCreateAccess && (
            <Button className="gap-2" onClick={() => navigate('/quotations/new')}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Quotation</span>
              <span className="sm:hidden">New</span>
            </Button>
          )
        }
      />

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATUS_OPTIONS.filter(s => s.value !== 'all').map((status) => (
          <Card 
            key={status.value}
            className={`cursor-pointer transition-all hover:shadow-md ${
              statusFilter === status.value ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setStatusFilter(statusFilter === status.value ? 'all' : status.value as QuotationStatus)}
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{statusCounts[status.value as QuotationStatus]}</p>
              <p className="text-xs text-muted-foreground capitalize">{status.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quotation or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as QuotationStatus | 'all')}>
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
                          {statusCounts[option.value as QuotationStatus]}
                        </Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger className="w-[150px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
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
              {dateRangeFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {DATE_RANGE_OPTIONS.find(o => o.value === dateRangeFilter)?.label}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setDateRangeFilter('all')} />
                </Badge>
              )}
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: "{searchQuery}"
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                </Badge>
              )}
              <span className="text-sm text-muted-foreground ml-2">
                Showing {filteredQuotations.length} of {quotations.length}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {loading ? (
            <div className="px-4 md:px-0">
              <TableSkeleton rows={5} columns={7} />
            </div>
          ) : filteredQuotations.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={hasActiveFilters ? "No quotations match filters" : "No quotations found"}
              description={hasActiveFilters ? "Try adjusting your filters" : "Create your first quotation to get started"}
              action={hasActiveFilters ? {
                label: 'Clear Filters',
                onClick: clearFilters,
                icon: X,
              } : hasCreateAccess ? {
                label: 'New Quotation',
                onClick: () => navigate('/quotations/new'),
                icon: Plus,
              } : undefined}
            />
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 px-4">
                {paginatedQuotations.map((quotation) => (
                  <QuotationCard
                    key={quotation.id}
                    quotation={quotation}
                    onView={(id) => navigate(`/quotations/${id}`)}
                    onEdit={(id) => navigate(`/quotations/${id}/edit`)}
                    onDelete={(id) => {
                      const q = quotations.find(q => q.id === id);
                      if (q) handleDeleteClick(q);
                    }}
                    canEdit={hasEditAccess}
                    canDelete={hasDeleteAccess}
                  />
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block rounded-lg border mx-0">
                <Table>
                  <TableHeader>
                     <TableRow>
                      <TableHead className="whitespace-nowrap">
                        <SortableTableHeader label="Quotation No" sortKey="quotation_number" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        <SortableTableHeader label="Customer" sortKey="customer" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                      </TableHead>
                      <TableHead className="whitespace-nowrap hidden lg:table-cell">
                        <SortableTableHeader label="Date" sortKey="quotation_date" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                      </TableHead>
                      <TableHead className="whitespace-nowrap hidden xl:table-cell">
                        <SortableTableHeader label="Valid Until" sortKey="valid_until" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        <SortableTableHeader label="Total" sortKey="total" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        <SortableTableHeader label="Status" sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedQuotations.map((quotation) => (
                      <TableRow 
                        key={quotation.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/quotations/${quotation.id}`)}
                      >
                        <TableCell className="font-medium whitespace-nowrap">
                          {quotation.quotation_number}
                        </TableCell>
                        <TableCell className="whitespace-nowrap max-w-[150px] truncate">
                          {quotation.customers?.name || '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap hidden lg:table-cell">
                          {format(new Date(quotation.quotation_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="whitespace-nowrap hidden xl:table-cell">
                          {quotation.valid_until
                            ? format(new Date(quotation.valid_until), 'dd/MM/yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium whitespace-nowrap">
                          {formatCurrency(Number(quotation.total))}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <StatusBadge status={quotation.status} />
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/quotations/${quotation.id}`)}
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {hasEditAccess && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/quotations/${quotation.id}/edit`)}
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {hasDeleteAccess && isDeletable(quotation.status) ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteClick(quotation)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : hasDeleteAccess && !isDeletable(quotation.status) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      disabled
                                      className="opacity-50 cursor-not-allowed text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Only draft quotations can be deleted
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 px-4 md:px-0">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} ({sortedQuotations.length} records)
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

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => {
          setDeleteId(null);
          setQuotationToDelete(null);
        }}
        title="Delete Quotation"
        description="Are you sure you want to delete this draft quotation? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default Quotations;
