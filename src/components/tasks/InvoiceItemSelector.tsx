import * as React from "react";
import { Check, FileText, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name?: string;
  items: InvoiceItem[];
}

interface InvoiceItemSelectorProps {
  selectedInvoiceId: string;
  selectedItemIds: string[];
  onInvoiceChange: (invoiceId: string) => void;
  onItemsChange: (itemIds: string[]) => void;
  disabled?: boolean;
}

export function InvoiceItemSelector({
  selectedInvoiceId,
  selectedItemIds,
  onInvoiceChange,
  onItemsChange,
  disabled = false,
}: InvoiceItemSelectorProps) {
  const { organization } = useOrganization();
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [invoiceOpen, setInvoiceOpen] = React.useState(false);

  // Fetch invoices with items
  React.useEffect(() => {
    const fetchInvoices = async () => {
      if (!organization?.id) return;
      setLoading(true);
      try {
        const { data: invoicesData, error: invError } = await supabase
          .from("invoices")
          .select(`
            id,
            invoice_number,
            customers(name)
          `)
          .eq("organization_id", organization.id)
          .order("invoice_date", { ascending: false })
          .limit(50);

        if (invError) throw invError;

        // Fetch items for all invoices
        const invoiceIds = invoicesData?.map((inv) => inv.id) || [];
        const { data: itemsData, error: itemsError } = await supabase
          .from("invoice_items")
          .select("id, invoice_id, description, quantity, unit_price")
          .in("invoice_id", invoiceIds);

        if (itemsError) throw itemsError;

        const formattedInvoices: Invoice[] = (invoicesData || []).map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          customer_name: (inv.customers as any)?.name,
          items: (itemsData || [])
            .filter((item) => item.invoice_id === inv.id)
            .map((item) => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
            })),
        }));

        setInvoices(formattedInvoices);
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [organization?.id]);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);

  const toggleItem = (itemId: string) => {
    if (selectedItemIds.includes(itemId)) {
      onItemsChange(selectedItemIds.filter((id) => id !== itemId));
    } else {
      onItemsChange([...selectedItemIds, itemId]);
    }
  };

  const selectAllItems = () => {
    if (selectedInvoice) {
      onItemsChange(selectedInvoice.items.map((item) => item.id));
    }
  };

  const clearAllItems = () => {
    onItemsChange([]);
  };

  return (
    <div className="space-y-3">
      {/* Invoice Selector */}
      <Popover open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={invoiceOpen}
            disabled={disabled || loading}
            className={cn(
              "w-full justify-between font-normal",
              !selectedInvoiceId && "text-muted-foreground"
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <FileText className="h-4 w-4 shrink-0" />
              {selectedInvoice
                ? `${selectedInvoice.invoice_number}${selectedInvoice.customer_name ? ` - ${selectedInvoice.customer_name}` : ""}`
                : "Select Invoice..."}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0 z-50 bg-popover" align="start">
          <Command>
            <CommandInput placeholder="Search invoices..." />
            <CommandList>
              <CommandEmpty>No invoices found.</CommandEmpty>
              <CommandGroup>
                {/* Option to clear */}
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onInvoiceChange("");
                    onItemsChange([]);
                    setInvoiceOpen(false);
                  }}
                >
                  <span className="text-muted-foreground">Clear selection</span>
                </CommandItem>
                {invoices.map((invoice) => (
                  <CommandItem
                    key={invoice.id}
                    value={`${invoice.invoice_number} ${invoice.customer_name || ""}`}
                    onSelect={() => {
                      onInvoiceChange(invoice.id);
                      onItemsChange([]);
                      setInvoiceOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedInvoiceId === invoice.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{invoice.invoice_number}</span>
                      {invoice.customer_name && (
                        <span className="text-xs text-muted-foreground">
                          {invoice.customer_name} • {invoice.items.length} item(s)
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Invoice Items - only show when invoice is selected */}
      {selectedInvoice && selectedInvoice.items.length > 0 && (
        <div className="border rounded-md p-3 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Select Items</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={selectAllItems}
                className="h-6 text-xs"
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAllItems}
                className="h-6 text-xs"
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {selectedInvoice.items.map((item, index) => (
              <label
                key={item.id}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors",
                  selectedItemIds.includes(item.id) && "bg-primary/10"
                )}
              >
                <Checkbox
                  checked={selectedItemIds.includes(item.id)}
                  onCheckedChange={() => toggleItem(item.id)}
                  disabled={disabled}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Item {index + 1}
                    </span>
                  </div>
                  <p
                    className="text-sm line-clamp-2"
                    dangerouslySetInnerHTML={{
                      __html: item.description.replace(/<[^>]*>/g, " ").slice(0, 100),
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    Qty: {item.quantity} × ৳{item.unit_price.toLocaleString()}
                  </span>
                </div>
              </label>
            ))}
          </div>
          {selectedItemIds.length > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              {selectedItemIds.length} item(s) selected - will create {selectedItemIds.length} sub-task(s)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
