import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown, FileText, Truck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type ReferenceType = 'invoice' | 'challan' | 'quotation' | '';

interface ReferenceItem {
  id: string;
  number: string;
  date: string;
  customer_name?: string;
}

interface ReferenceSelectProps {
  referenceType: ReferenceType;
  referenceId: string;
  onReferenceTypeChange: (type: ReferenceType) => void;
  onReferenceIdChange: (id: string) => void;
}

export function ReferenceSelect({
  referenceType,
  referenceId,
  onReferenceTypeChange,
  onReferenceIdChange,
}: ReferenceSelectProps) {
  const [open, setOpen] = useState(false);
  const [invoices, setInvoices] = useState<ReferenceItem[]>([]);
  const [challans, setChallans] = useState<ReferenceItem[]>([]);
  const [quotations, setQuotations] = useState<ReferenceItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReferences();
  }, []);

  const fetchReferences = async () => {
    setLoading(true);
    try {
      const [invoicesRes, challansRes, quotationsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, invoice_number, invoice_date, customers(name)')
          .order('invoice_date', { ascending: false })
          .limit(50),
        supabase
          .from('delivery_challans')
          .select('id, challan_number, challan_date, customers(name)')
          .order('challan_date', { ascending: false })
          .limit(50),
        supabase
          .from('quotations')
          .select('id, quotation_number, quotation_date, customers(name)')
          .order('quotation_date', { ascending: false })
          .limit(50),
      ]);

      if (invoicesRes.data) {
        setInvoices(invoicesRes.data.map((inv: any) => ({
          id: inv.id,
          number: inv.invoice_number,
          date: inv.invoice_date,
          customer_name: inv.customers?.name,
        })));
      }

      if (challansRes.data) {
        setChallans(challansRes.data.map((ch: any) => ({
          id: ch.id,
          number: ch.challan_number,
          date: ch.challan_date,
          customer_name: ch.customers?.name,
        })));
      }

      if (quotationsRes.data) {
        setQuotations(quotationsRes.data.map((q: any) => ({
          id: q.id,
          number: q.quotation_number,
          date: q.quotation_date,
          customer_name: q.customers?.name,
        })));
      }
    } catch (error) {
      console.error('Error fetching references:', error);
    } finally {
      setLoading(false);
    }
  };

  const items = useMemo(() => {
    switch (referenceType) {
      case 'invoice':
        return invoices;
      case 'challan':
        return challans;
      case 'quotation':
        return quotations;
      default:
        return [];
    }
  }, [referenceType, invoices, challans, quotations]);

  const selectedItem = useMemo(() => {
    if (!referenceId) return null;
    return items.find((item) => item.id === referenceId);
  }, [items, referenceId]);

  const handleTypeChange = (type: ReferenceType) => {
    onReferenceTypeChange(type);
    onReferenceIdChange('');
  };

  const handleClear = () => {
    onReferenceTypeChange('');
    onReferenceIdChange('');
  };

  const getTypeIcon = (type: ReferenceType) => {
    switch (type) {
      case 'invoice':
        return <FileText className="h-4 w-4" />;
      case 'challan':
        return <Truck className="h-4 w-4" />;
      case 'quotation':
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: ReferenceType) => {
    switch (type) {
      case 'invoice':
        return 'Invoice';
      case 'challan':
        return 'Delivery Challan';
      case 'quotation':
        return 'Quotation';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-3">
      {/* Type Selection */}
      <div className="flex flex-wrap gap-2">
        {(['invoice', 'challan', 'quotation'] as const).map((type) => (
          <Button
            key={type}
            type="button"
            variant={referenceType === type ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
            onClick={() => handleTypeChange(type)}
          >
            {getTypeIcon(type)}
            {getTypeLabel(type)}
          </Button>
        ))}
        {referenceType && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Reference Selection */}
      {referenceType && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal"
              disabled={loading}
            >
              {selectedItem ? (
                <span className="truncate">
                  {selectedItem.number}
                  {selectedItem.customer_name && ` - ${selectedItem.customer_name}`}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Select {getTypeLabel(referenceType)}...
                </span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[350px] p-0" align="start">
            <Command>
              <CommandInput placeholder={`Search ${getTypeLabel(referenceType).toLowerCase()}...`} />
              <CommandList>
                <CommandEmpty>
                  {loading ? 'Loading...' : `No ${getTypeLabel(referenceType).toLowerCase()} found.`}
                </CommandEmpty>
                <CommandGroup>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.number} ${item.customer_name || ''}`}
                      onSelect={() => {
                        onReferenceIdChange(item.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          referenceId === item.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.number}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.date), 'dd/MM/yyyy')}
                          </span>
                        </div>
                        {item.customer_name && (
                          <p className="text-sm text-muted-foreground truncate">
                            {item.customer_name}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

// Helper component to display a linked reference
export function ReferenceLink({ 
  referenceType, 
  referenceId 
}: { 
  referenceType: string | null; 
  referenceId: string | null; 
}) {
  const [reference, setReference] = useState<ReferenceItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!referenceType || !referenceId) {
      setLoading(false);
      return;
    }

    const fetchReference = async () => {
      setLoading(true);
      try {
        let query;
        switch (referenceType) {
          case 'invoice':
            query = supabase
              .from('invoices')
              .select('id, invoice_number, invoice_date, customers(name)')
              .eq('id', referenceId)
              .single();
            break;
          case 'challan':
            query = supabase
              .from('delivery_challans')
              .select('id, challan_number, challan_date, customers(name)')
              .eq('id', referenceId)
              .single();
            break;
          case 'quotation':
            query = supabase
              .from('quotations')
              .select('id, quotation_number, quotation_date, customers(name)')
              .eq('id', referenceId)
              .single();
            break;
          default:
            return;
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data) {
          setReference({
            id: data.id,
            number: (data as any).invoice_number || (data as any).challan_number || (data as any).quotation_number,
            date: (data as any).invoice_date || (data as any).challan_date || (data as any).quotation_date,
            customer_name: (data as any).customers?.name,
          });
        }
      } catch (error) {
        console.error('Error fetching reference:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReference();
  }, [referenceType, referenceId]);

  if (loading) {
    return <span className="text-sm text-muted-foreground">Loading...</span>;
  }

  if (!reference) {
    return null;
  }

  const getHref = () => {
    switch (referenceType) {
      case 'invoice':
        return `/invoices/${referenceId}`;
      case 'challan':
        return `/delivery-challans`;
      case 'quotation':
        return `/quotations/${referenceId}`;
      default:
        return '#';
    }
  };

  const getIcon = () => {
    switch (referenceType) {
      case 'invoice':
        return <FileText className="h-4 w-4" />;
      case 'challan':
        return <Truck className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <a
      href={getHref()}
      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {getIcon()}
      <span>{reference.number}</span>
      {reference.customer_name && (
        <span className="text-muted-foreground">({reference.customer_name})</span>
      )}
    </a>
  );
}
