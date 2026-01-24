import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Calculator, Download, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { CostingItem } from './InvoiceCostingSection';

interface PriceCalculation {
  id: string;
  job_description: string;
  costing_total: number;
  final_price: number;
  margin_percent: number;
  created_at: string;
  customer_id: string | null;
  customers: { name: string } | null;
  // Cost breakdown fields
  design_qty: number | null;
  design_price: number | null;
  plate_qty: number | null;
  plate_price: number | null;
  plate2_qty: number | null;
  plate2_price: number | null;
  plate3_qty: number | null;
  plate3_price: number | null;
  paper1_qty: number | null;
  paper1_price: number | null;
  paper2_qty: number | null;
  paper2_price: number | null;
  paper3_qty: number | null;
  paper3_price: number | null;
  print_qty: number | null;
  print_price: number | null;
  print2_qty: number | null;
  print2_price: number | null;
  print3_qty: number | null;
  print3_price: number | null;
  lamination_qty: number | null;
  lamination_price: number | null;
  die_cutting_qty: number | null;
  die_cutting_price: number | null;
  foil_printing_qty: number | null;
  foil_printing_price: number | null;
  binding_qty: number | null;
  binding_price: number | null;
  others_qty: number | null;
  others_price: number | null;
}

interface ImportPriceCalculationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (items: CostingItem[]) => void;
  customerId?: string;
}

export function ImportPriceCalculationDialog({
  open,
  onOpenChange,
  onImport,
  customerId,
}: ImportPriceCalculationDialogProps) {
  const { organization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [calculations, setCalculations] = useState<PriceCalculation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const fetchCalculations = useCallback(async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('price_calculations')
        .select(`
          id,
          job_description,
          costing_total,
          final_price,
          margin_percent,
          created_at,
          customer_id,
          customers (name),
          design_qty, design_price,
          plate_qty, plate_price,
          plate2_qty, plate2_price,
          plate3_qty, plate3_price,
          paper1_qty, paper1_price,
          paper2_qty, paper2_price,
          paper3_qty, paper3_price,
          print_qty, print_price,
          print2_qty, print2_price,
          print3_qty, print3_price,
          lamination_qty, lamination_price,
          die_cutting_qty, die_cutting_price,
          foil_printing_qty, foil_printing_price,
          binding_qty, binding_price,
          others_qty, others_price
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(50);

      // Optionally filter by customer
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCalculations((data as PriceCalculation[]) || []);
    } catch (error) {
      console.error('Error fetching price calculations:', error);
    } finally {
      setLoading(false);
    }
  }, [organization?.id, customerId]);

  useEffect(() => {
    if (open) {
      fetchCalculations();
    }
  }, [open, fetchCalculations]);

  const convertToCostingItems = (calc: PriceCalculation): CostingItem[] => {
    const items: CostingItem[] = [];

    // Helper to add item if qty and price are valid
    const addItem = (type: string, description: string, qty: number | null, price: number | null) => {
      if (qty && price && qty > 0 && price > 0) {
        items.push({
          id: crypto.randomUUID(),
          item_type: type,
          description,
          quantity: qty,
          price: price,
          line_total: qty * price,
        });
      }
    };

    // Design
    addItem('design', 'Design Cost', calc.design_qty, calc.design_price);

    // Plates
    addItem('plate', 'Plate 1', calc.plate_qty, calc.plate_price);
    addItem('plate', 'Plate 2', calc.plate2_qty, calc.plate2_price);
    addItem('plate', 'Plate 3', calc.plate3_qty, calc.plate3_price);

    // Paper
    addItem('paper', 'Paper 1', calc.paper1_qty, calc.paper1_price);
    addItem('paper', 'Paper 2', calc.paper2_qty, calc.paper2_price);
    addItem('paper', 'Paper 3', calc.paper3_qty, calc.paper3_price);

    // Printing
    addItem('print', 'Printing 1', calc.print_qty, calc.print_price);
    addItem('print', 'Printing 2', calc.print2_qty, calc.print2_price);
    addItem('print', 'Printing 3', calc.print3_qty, calc.print3_price);

    // Other costs
    addItem('lamination', 'Lamination', calc.lamination_qty, calc.lamination_price);
    addItem('die_cutting', 'Die Cutting', calc.die_cutting_qty, calc.die_cutting_price);
    addItem('foil', 'Foil Printing', calc.foil_printing_qty, calc.foil_printing_price);
    addItem('binding', 'Binding', calc.binding_qty, calc.binding_price);
    addItem('others', 'Others', calc.others_qty, calc.others_price);

    return items;
  };

  const handleSelect = (calc: PriceCalculation) => {
    const costingItems = convertToCostingItems(calc);
    onImport(costingItems);
    onOpenChange(false);
  };

  const filteredCalculations = calculations.filter((calc) =>
    calc.job_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    calc.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Price Calculation থেকে Import করুন
          </DialogTitle>
          <DialogDescription>
            একটি Price Calculation সিলেক্ট করুন, এর costing items Invoice-এ import হবে
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Job description বা customer name দিয়ে সার্চ করুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
          <div className="space-y-2 py-2">
            {loading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 border rounded-lg space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                ))}
              </>
            ) : filteredCalculations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>কোনো Price Calculation পাওয়া যায়নি</p>
                {customerId && (
                  <p className="text-sm mt-1">
                    এই customer-এর জন্য কোনো calculation নেই
                  </p>
                )}
              </div>
            ) : (
              filteredCalculations.map((calc) => (
                <button
                  key={calc.id}
                  type="button"
                  onClick={() => handleSelect(calc)}
                  className="w-full text-left p-4 border rounded-lg hover:bg-muted/50 hover:border-primary/30 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate group-hover:text-primary transition-colors">
                        {calc.job_description}
                      </h4>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                        {calc.customers?.name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {calc.customers.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(calc.created_at), 'dd MMM yyyy')}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <p className="font-semibold text-primary tabular-nums">
                        {formatCurrency(Number(calc.costing_total) || 0)}
                      </p>
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                      >
                        {Number(calc.margin_percent) || 0}% margin
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed">
                    <span className="text-xs text-muted-foreground">
                      Final Price: {formatCurrency(Number(calc.final_price) || 0)}
                    </span>
                    <span className="text-xs text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Download className="h-3.5 w-3.5" />
                      Import করুন
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            বাতিল করুন
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
