import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgScopedQuery } from '@/hooks/useOrgScopedQuery';
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
import { Plus, Search, Eye, FileText, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/PageHeader';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatCurrency } from '@/lib/formatters';

type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'converted';

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

const Quotations = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { organizationId, hasOrgContext } = useOrgScopedQuery();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null);

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
      const { data, error } = await supabase
        .from('quotations')
        .select('*, customers(name)')
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
    // Only allow deletion of draft quotations
    if (quotation.status !== 'draft') {
      toast.error('Only draft quotations can be deleted');
      return;
    }
    setQuotationToDelete(quotation);
    setDeleteId(quotation.id);
  };

  const handleDelete = async () => {
    if (!deleteId || !quotationToDelete) return;
    
    // Double-check status before deletion
    if (quotationToDelete.status !== 'draft') {
      toast.error('Only draft quotations can be deleted');
      setDeleteId(null);
      setQuotationToDelete(null);
      return;
    }
    
    try {
      // Delete quotation items first
      await supabase.from('quotation_items').delete().eq('quotation_id', deleteId);
      // Delete quotation
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

  const filteredQuotations = quotations.filter(
    (quotation) =>
      quotation.quotation_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quotation.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if quotation is editable (only draft)
  const isEditable = (status: QuotationStatus) => status === 'draft';
  const isDeletable = (status: QuotationStatus) => status === 'draft';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        description="Manage all quotations"
        actions={
          <Button className="gap-2" onClick={() => navigate('/quotations/new')}>
            <Plus className="h-4 w-4" />
            New Quotation
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quotation number or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : filteredQuotations.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No quotations found"
              description="Create your first quotation to get started"
              action={{
                label: 'New Quotation',
                onClick: () => navigate('/quotations/new'),
                icon: Plus,
              }}
            />
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Quotation No</TableHead>
                    <TableHead className="whitespace-nowrap">Customer</TableHead>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="whitespace-nowrap">Valid Until</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotations.map((quotation) => (
                    <TableRow key={quotation.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {quotation.quotation_number}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{quotation.customers?.name || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(quotation.quotation_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
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
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/quotations/${quotation.id}`)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isEditable(quotation.status) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/quotations/${quotation.id}/edit`)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {isAdmin && isDeletable(quotation.status) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteClick(quotation)}
                              title="Delete"
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
