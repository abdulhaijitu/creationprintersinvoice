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
import { toast } from 'sonner';
import { Plus, Search, Eye, Calculator, ShieldAlert, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PriceCalculationCard } from '@/components/shared/mobile-cards/PriceCalculationCard';
import { SortableTableHeader, useSortableTable } from '@/components/shared/SortableTableHeader';
import { formatCurrency } from '@/lib/formatters';

const PAGE_SIZE = 25;

interface PriceCalculation {
  id: string;
  job_description: string;
  costing_total: number;
  margin_percent: number;
  final_price: number;
  created_at: string;
  quotation_id: string | null;
  invoice_id: string | null;
  customers: { name: string } | null;
}

const PriceCalculations = () => {
  const navigate = useNavigate();
  const { canPerform, showCreate, showDelete } = usePermissions();
  const { organizationId, hasOrgContext } = useOrgScopedQuery();
  const [calculations, setCalculations] = useState<PriceCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [calculationToDelete, setCalculationToDelete] = useState<PriceCalculation | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { sortKey, sortDirection, handleSort, sortData } = useSortableTable<PriceCalculation>('created_at', 'desc');

  const hasViewAccess = canPerform('price_calculations', 'view');
  const hasCreateAccess = showCreate('price_calculations');
  const hasDeleteAccess = showDelete('price_calculations');

  useEffect(() => {
    if (hasOrgContext && organizationId) {
      fetchCalculations();
    } else {
      setCalculations([]);
      setLoading(false);
    }
  }, [organizationId, hasOrgContext]);

  const fetchCalculations = async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('price_calculations')
        .select('id, job_description, costing_total, margin_percent, final_price, created_at, quotation_id, invoice_id, customers(name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCalculations(data || []);
    } catch (error) {
      console.error('Error fetching calculations:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const canBeDeleted = (calc: PriceCalculation) => {
    return !calc.quotation_id && !calc.invoice_id;
  };

  const handleDeleteClick = (calc: PriceCalculation) => {
    if (!canBeDeleted(calc)) {
      toast.error('Cannot delete - linked to quotation or invoice');
      return;
    }
    setCalculationToDelete(calc);
    setDeleteId(calc.id);
  };

  const handleDelete = async () => {
    if (!deleteId || !calculationToDelete) return;

    if (!canBeDeleted(calculationToDelete)) {
      toast.error('Cannot delete - linked to quotation or invoice');
      setDeleteId(null);
      setCalculationToDelete(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('price_calculations')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast.success('Price calculation deleted');
      setDeleteId(null);
      setCalculationToDelete(null);
      fetchCalculations();
    } catch (error) {
      console.error('Error deleting calculation:', error);
      toast.error('Failed to delete calculation');
    }
  };

  const filteredCalculations = useMemo(() => {
    return calculations.filter(
      (calc) =>
        calc.job_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        calc.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [calculations, searchQuery]);

  // Custom sort for nested fields
  const sortedCalculations = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredCalculations;

    return [...filteredCalculations].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortKey) {
        case 'job_description':
          aVal = a.job_description; bVal = b.job_description; break;
        case 'customer':
          aVal = a.customers?.name || ''; bVal = b.customers?.name || ''; break;
        case 'costing_total':
          aVal = Number(a.costing_total); bVal = Number(b.costing_total);
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        case 'margin_percent':
          aVal = Number(a.margin_percent); bVal = Number(b.margin_percent);
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        case 'final_price':
          aVal = Number(a.final_price); bVal = Number(b.final_price);
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        case 'created_at':
          aVal = new Date(a.created_at).getTime(); bVal = new Date(b.created_at).getTime();
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        default: return 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [filteredCalculations, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedCalculations.length / PAGE_SIZE);
  const paginatedCalculations = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedCalculations.slice(start, start + PAGE_SIZE);
  }, [sortedCalculations, currentPage]);

  // Reset page on filter change
  useMemo(() => { setCurrentPage(1); }, [searchQuery, sortKey, sortDirection]);

  if (!hasViewAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Price Calculation"
        description="Printing job costing calculation"
        actions={
          hasCreateAccess && (
            <Button className="gap-2" onClick={() => navigate('/price-calculation/new')}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Job</span>
              <span className="sm:hidden">Add</span>
            </Button>
          )
        }
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search job or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 md:px-6">
          {loading ? (
            <div className="px-4 md:px-0">
              <TableSkeleton rows={5} columns={7} />
            </div>
          ) : filteredCalculations.length === 0 ? (
            <EmptyState
              icon={Calculator}
              title="No calculations found"
              description="Create your first price calculation to get started"
              action={hasCreateAccess ? {
                label: 'Add Job',
                onClick: () => navigate('/price-calculation/new'),
                icon: Plus,
              } : undefined}
            />
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 px-4">
                {paginatedCalculations.map((calc) => (
                  <PriceCalculationCard
                    key={calc.id}
                    calculation={calc}
                    onView={(id) => navigate(`/price-calculation/${id}`)}
                    onEdit={(id) => navigate(`/price-calculation/${id}`)}
                    onDelete={(id) => {
                      const c = calculations.find(c => c.id === id);
                      if (c) handleDeleteClick(c);
                    }}
                    canEdit={false}
                    canDelete={hasDeleteAccess && canBeDeleted(calc)}
                  />
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block rounded-lg border mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">
                        <SortableTableHeader label="Job Description" sortKey="job_description" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                      </TableHead>
                      <TableHead className="whitespace-nowrap hidden lg:table-cell">
                        <SortableTableHeader label="Customer" sortKey="customer" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap">
                        <SortableTableHeader label="Costing" sortKey="costing_total" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap hidden lg:table-cell">
                        <SortableTableHeader label="Margin %" sortKey="margin_percent" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap">
                        <SortableTableHeader label="Final Price" sortKey="final_price" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} align="right" />
                      </TableHead>
                      <TableHead className="whitespace-nowrap hidden xl:table-cell">
                        <SortableTableHeader label="Date" sortKey="created_at" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort} />
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCalculations.map((calc) => (
                      <TableRow 
                        key={calc.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/price-calculation/${calc.id}`)}
                      >
                        <TableCell className="font-medium max-w-[200px] truncate whitespace-nowrap">
                          {calc.job_description}
                        </TableCell>
                        <TableCell className="whitespace-nowrap hidden lg:table-cell">
                          {calc.customers?.name || '-'}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {formatCurrency(Number(calc.costing_total) || 0)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap hidden lg:table-cell">
                          {Number(calc.margin_percent) || 0}%
                        </TableCell>
                        <TableCell className="text-right font-medium text-primary whitespace-nowrap">
                          {formatCurrency(Number(calc.final_price) || 0)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap hidden xl:table-cell">
                          {format(new Date(calc.created_at), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/price-calculation/${calc.id}`)}
                              title="View / Edit"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {hasDeleteAccess && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`text-destructive hover:text-destructive ${!canBeDeleted(calc) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={() => handleDeleteClick(calc)}
                                disabled={!canBeDeleted(calc)}
                                title={canBeDeleted(calc) ? 'Delete' : 'Cannot delete - linked to quotation/invoice'}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
                    Page {currentPage} of {totalPages} ({sortedCalculations.length} records)
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
          setCalculationToDelete(null);
        }}
        title="Delete Price Calculation"
        description="Are you sure you want to delete this price calculation? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default PriceCalculations;
