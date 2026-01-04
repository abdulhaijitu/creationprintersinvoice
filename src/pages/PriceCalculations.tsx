import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { Plus, Search, Eye, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface PriceCalculation {
  id: string;
  job_description: string;
  costing_total: number;
  margin_percent: number;
  final_price: number;
  created_at: string;
  customers: { name: string } | null;
}

const PriceCalculations = () => {
  const navigate = useNavigate();
  const [calculations, setCalculations] = useState<PriceCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCalculations();
  }, []);

  const fetchCalculations = async () => {
    try {
      const { data, error } = await supabase
        .from('price_calculations')
        .select('id, job_description, costing_total, margin_percent, final_price, created_at, customers(name)')
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredCalculations = calculations.filter(
    (calc) =>
      calc.job_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      calc.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Price Calculation</h1>
          <p className="text-muted-foreground">Printing job costing calculation</p>
        </div>

        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => navigate('/price-calculation/new')}>
            <Plus className="h-4 w-4" />
            Add Job
          </Button>
        </div>
      </div>

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
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredCalculations.length === 0 ? (
            <div className="text-center py-12">
              <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No calculations found</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Job Description</TableHead>
                    <TableHead className="whitespace-nowrap">Customer</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Costing</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Margin %</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Final Price</TableHead>
                    <TableHead className="whitespace-nowrap">Date</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCalculations.map((calc) => (
                    <TableRow key={calc.id}>
                      <TableCell className="font-medium max-w-[200px] truncate whitespace-nowrap">
                        {calc.job_description}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{calc.customers?.name || '-'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatCurrency(Number(calc.costing_total) || 0)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {Number(calc.margin_percent) || 0}%
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary whitespace-nowrap">
                        {formatCurrency(Number(calc.final_price) || 0)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(calc.created_at), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/price-calculation/${calc.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PriceCalculations;
