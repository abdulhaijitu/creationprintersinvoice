import { useState, useEffect } from 'react';
import { Calculator, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CostingItem {
  id: string;
  item_type: string;
  description: string | null;
  quantity: number;
  price: number;
  line_total: number;
}

interface InvoiceCostingSummaryProps {
  invoiceId: string;
  invoiceTotal: number;
  canView: boolean;
}

export function InvoiceCostingSummary({
  invoiceId,
  invoiceTotal,
  canView,
}: InvoiceCostingSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<CostingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (canView && invoiceId) {
      fetchCostingItems();
    }
  }, [invoiceId, canView]);

  const fetchCostingItems = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_costing_items' as any)
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('sort_order');

      if (error) throw error;
      
      setItems((data as any[])?.map((item: any) => ({
        id: item.id,
        item_type: item.item_type,
        description: item.description,
        quantity: Number(item.quantity),
        price: Number(item.price),
        line_total: Number(item.line_total),
      })) || []);
    } catch (error) {
      console.error('Error fetching costing items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if no view permission or no items
  if (!canView) return null;
  if (!loading && items.length === 0) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const costingTotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const profit = invoiceTotal - costingTotal;
  const marginPercent = costingTotal > 0 ? (profit / costingTotal) * 100 : 0;
  const isPositive = profit >= 0;

  const itemTypeLabels: Record<string, string> = {
    plate: 'Plate',
    print: 'Print',
    lamination: 'Lamination',
    die_cutting: 'Die Cutting',
    foil: 'Foil',
    binding: 'Binding',
    packaging: 'Packaging',
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="py-3">
          <div className="h-5 w-32 bg-muted rounded" />
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-amber-500/30 bg-amber-500/5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-base font-medium text-amber-700 dark:text-amber-400">
                  Costing Summary
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    (Internal Only)
                  </span>
                </CardTitle>
              </div>
              <div className="flex items-center gap-3">
                {/* Quick Profit Badge */}
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                  isPositive 
                    ? "bg-success/10 text-success" 
                    : "bg-destructive/10 text-destructive"
                )}>
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {marginPercent.toFixed(1)}%
                </div>
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} 
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            <div className="space-y-4">
              {/* Costing Items Table */}
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-amber-500/10">
                      <TableHead>Item</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {itemTypeLabels[item.item_type] || item.item_type}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.description || '-'}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(item.price)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrency(item.line_total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Profit Margin Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Costing Total */}
                <div className="bg-muted/50 p-3 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Costing Total</p>
                  <p className="font-semibold tabular-nums">{formatCurrency(costingTotal)}</p>
                </div>
                
                {/* Invoice Total */}
                <div className="bg-primary/10 p-3 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground mb-1">Invoice Total</p>
                  <p className="font-semibold tabular-nums text-primary">{formatCurrency(invoiceTotal)}</p>
                </div>
                
                {/* Profit */}
                <div className={cn(
                  "p-3 rounded-lg text-center",
                  isPositive ? "bg-success/10" : "bg-destructive/10"
                )}>
                  <p className="text-xs text-muted-foreground mb-1">Profit</p>
                  <p className={cn(
                    "font-semibold tabular-nums",
                    isPositive ? "text-success" : "text-destructive"
                  )}>
                    {isPositive ? '+' : ''}{formatCurrency(profit)}
                  </p>
                </div>
                
                {/* Margin */}
                <div className={cn(
                  "p-3 rounded-lg text-center border-2",
                  isPositive ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"
                )}>
                  <p className="text-xs text-muted-foreground mb-1">Margin</p>
                  <p className={cn(
                    "text-xl font-bold tabular-nums",
                    isPositive ? "text-success" : "text-destructive"
                  )}>
                    {isPositive ? '+' : ''}{marginPercent.toFixed(1)}%
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground italic text-center">
                ⚠️ This costing information is for internal use only and is not visible to customers.
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
