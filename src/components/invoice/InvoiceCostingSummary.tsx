import { useState, useEffect, useMemo } from 'react';
import { Calculator, ChevronDown, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';

interface CostingItem {
  id: string;
  invoice_item_id: string | null;
  item_no: number | null;
  item_type: string;
  description: string | null;
  quantity: number;
  price: number;
  line_total: number;
}

interface InvoiceItem {
  id: string;
  description: string;
}

interface InvoiceCostingSummaryProps {
  invoiceId: string;
  invoiceTotal: number;
  canViewProfit?: boolean;
}

export function InvoiceCostingSummary({
  invoiceId,
  invoiceTotal,
  canViewProfit = true,
}: InvoiceCostingSummaryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<CostingItem[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (invoiceId) {
      fetchData();
    }
  }, [invoiceId]);

  const fetchData = async () => {
    try {
      const [costingRes, itemsRes] = await Promise.all([
        supabase
          .from('invoice_costing_items' as any)
          .select('*')
          .eq('invoice_id', invoiceId)
          .order('sort_order'),
        supabase
          .from('invoice_items')
          .select('id, description')
          .eq('invoice_id', invoiceId)
      ]);

      if (costingRes.error) throw costingRes.error;
      
      setItems((costingRes.data as any[])?.map((item: any) => ({
        id: item.id,
        invoice_item_id: item.invoice_item_id || null,
        item_no: item.item_no || null,
        item_type: item.item_type,
        description: item.description,
        quantity: Number(item.quantity),
        price: Number(item.price),
        line_total: Number(item.line_total),
      })) || []);
      
      setInvoiceItems(itemsRes.data || []);
    } catch (error) {
      console.error('Error fetching costing items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group costing by invoice item
  const groupedCostings = useMemo(() => {
    const groups: Map<string | null, { item: InvoiceItem | null; costings: CostingItem[]; subtotal: number }> = new Map();
    
    // First, group by invoice_item_id
    items.forEach(costing => {
      const key = costing.invoice_item_id;
      if (!groups.has(key)) {
        const invoiceItem = invoiceItems.find(i => i.id === key) || null;
        groups.set(key, { item: invoiceItem, costings: [], subtotal: 0 });
      }
      const group = groups.get(key)!;
      group.costings.push(costing);
      group.subtotal += costing.line_total;
    });
    
    return groups;
  }, [items, invoiceItems]);

  // Check if we have item-wise costing (with invoice_item_id) or legacy flat costing
  const hasItemWiseCosting = useMemo(() => {
    return items.some(item => item.invoice_item_id);
  }, [items]);

  // Don't render if no items
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
    design: 'Design',
    plate: 'Plate',
    paper: 'Paper',
    print: 'Print',
    lamination: 'Lamination',
    die_cutting: 'Die Cutting',
    foil: 'Foil',
    binding: 'Binding',
    packaging: 'Packaging',
    others: 'Others',
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
                  {hasItemWiseCosting ? 'Item-wise Costing Summary' : 'Costing Summary'}
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    (Internal Only)
                  </span>
                </CardTitle>
              </div>
              <div className="flex items-center gap-3">
                {/* Quick Profit Badge - Only shown if canViewProfit */}
                {canViewProfit && (
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
                )}
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
              {hasItemWiseCosting ? (
                // Item-wise grouped view
                <div className="space-y-4">
                  {Array.from(groupedCostings.entries()).map(([itemId, data], groupIndex) => {
                    const itemNum = data.costings[0]?.item_no || (groupIndex + 1);
                    
                    return (
                      <div key={itemId || 'ungrouped'} className="space-y-2">
                        {/* Item Header */}
                        <div className="flex items-center gap-2 px-2">
                          <Badge variant="default" className="text-xs">
                            Item-{itemNum}
                          </Badge>
                          <span className="font-medium text-sm truncate">
                            {data.item?.description || 'Invoice Item'}
                          </span>
                        </div>
                        
                        {/* Costing Table for this Item */}
                        <div className="rounded-lg border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-amber-500/10">
                                <TableHead>Costing Step</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-center">Qty</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {data.costings.map((item) => (
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
                              {/* Subtotal Row */}
                              <TableRow className="bg-muted/30">
                                <TableCell colSpan={4} className="text-right font-medium">
                                  Subtotal (Item-{itemNum}):
                                </TableCell>
                                <TableCell className="text-right font-bold tabular-nums">
                                  {formatCurrency(data.subtotal)}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Grand Total */}
                  <div className="flex items-center justify-between py-3 px-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <span className="font-semibold">Grand Total (All Costing):</span>
                    <span className="text-xl font-bold text-primary tabular-nums">
                      {formatCurrency(costingTotal)}
                    </span>
                  </div>
                </div>
              ) : (
                // Legacy flat view
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
              )}

              {/* Profit Margin Summary - Only shown if canViewProfit */}
              {canViewProfit && (
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
              )}

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
