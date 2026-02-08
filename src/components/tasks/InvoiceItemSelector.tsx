import * as React from "react";
import { Check, FileText, ChevronDown, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // Fetch invoices with items
  React.useEffect(() => {
    const fetchInvoices = async () => {
      if (!organization?.id) return;
      setLoading(true);
      try {
        const { data: invoicesData, error: invError } = await supabase
          .from("invoices")
          .select(`id, invoice_number, customers(name)`)
          .eq("organization_id", organization.id)
          .order("invoice_date", { ascending: false })
          .limit(50);

        if (invError) throw invError;

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

  const filteredInvoices = invoices.filter((inv) => {
    const query = searchQuery.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(query) ||
      (inv.customer_name || "").toLowerCase().includes(query)
    );
  });

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

  const handleSelectInvoice = (invoiceId: string) => {
    onInvoiceChange(invoiceId);
    onItemsChange([]);
    setDropdownOpen(false);
    setSearchQuery("");
  };

  const handleClearSelection = () => {
    onInvoiceChange("");
    onItemsChange([]);
    setDropdownOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="space-y-3">
      {/* Invoice Selector - Custom inline dropdown (no portal) */}
      <div className="relative" ref={dropdownRef}>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || loading}
          className={cn(
            "w-full justify-between font-normal",
            !selectedInvoiceId && "text-muted-foreground"
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDropdownOpen(!dropdownOpen);
          }}
        >
          <span className="flex items-center gap-2 truncate">
            <FileText className="h-4 w-4 shrink-0" />
            {selectedInvoice
              ? `${selectedInvoice.invoice_number}${selectedInvoice.customer_name ? ` - ${selectedInvoice.customer_name}` : ""}`
              : "Select Invoice..."}
          </span>
          {selectedInvoiceId ? (
            <X
              className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClearSelection();
              }}
            />
          ) : (
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>

        {dropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-md shadow-lg">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <ScrollArea className="max-h-[200px]">
              <div className="p-1">
                {filteredInvoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No invoices found.
                  </p>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <button
                      key={invoice.id}
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-2 text-left rounded-sm hover:bg-accent transition-colors text-sm",
                        selectedInvoiceId === invoice.id && "bg-accent"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectInvoice(invoice.id);
                      }}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selectedInvoiceId === invoice.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">{invoice.invoice_number}</span>
                        {invoice.customer_name && (
                          <span className="text-xs text-muted-foreground truncate">
                            {invoice.customer_name} • {invoice.items.length} item(s)
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Invoice Items - only show when invoice is selected */}
      {selectedInvoice && selectedInvoice.items.length > 0 && (
        <div className="border rounded-md p-3 space-y-2 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Select Items</span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={selectAllItems} className="h-6 text-xs">
                Select All
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearAllItems} className="h-6 text-xs">
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
                  <p className="text-sm line-clamp-2">
                    {item.description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 100)}
                  </p>
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
