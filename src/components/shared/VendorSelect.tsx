import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  CommandSeparator,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Vendor {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  due_amount?: number;
}

interface VendorSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  vendors: Vendor[];
  onVendorAdded: () => void;
  placeholder?: string;
  showDueAmount?: boolean;
  formatCurrency?: (amount: number) => string;
}

export function VendorSelect({
  value,
  onValueChange,
  vendors,
  onVendorAdded,
  placeholder = 'Select vendor',
  showDueAmount = false,
  formatCurrency = (amount) => `৳${amount.toLocaleString()}`,
}: VendorSelectProps) {
  const { organization } = useOrganization();
  const [open, setOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const selectedVendor = useMemo(() => 
    vendors.find((vendor) => vendor.id === value),
    [vendors, value]
  );

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Please enter vendor name');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vendors')
        .insert({
          name: formData.name.trim(),
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          organization_id: organization?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Vendor added successfully');
      setIsAddDialogOpen(false);
      setFormData({ name: '', phone: '', email: '', address: '' });
      onVendorAdded();
      
      // Select the newly created vendor
      if (data) {
        onValueChange(data.id);
      }
    } catch (error: any) {
      console.error('Error adding vendor:', error);
      toast.error(error.message || 'Failed to add vendor');
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = (vendor: Vendor) => {
    if (showDueAmount && vendor.due_amount && vendor.due_amount > 0) {
      return `${vendor.name} (Due: ${formatCurrency(vendor.due_amount)})`;
    }
    return vendor.name;
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal h-10"
          >
            {selectedVendor ? selectedVendor.name : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search vendor..." />
            <CommandList>
              <CommandEmpty>No vendor found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setIsAddDialogOpen(true);
                  }}
                  className="text-primary cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Vendor
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Vendors">
                {vendors.map((vendor) => (
                  <CommandItem
                    key={vendor.id}
                    value={vendor.name}
                    onSelect={() => {
                      onValueChange(vendor.id);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === vendor.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <Building2 className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{getDisplayName(vendor)}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>
              Quickly add a new vendor to the list
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddVendor}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="vendor_name">Name *</Label>
                <Input
                  id="vendor_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Vendor name"
                  autoFocus
                  className="h-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor_phone">Phone</Label>
                  <Input
                    id="vendor_phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01XXXXXXXXX"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor_email">Email</Label>
                  <Input
                    id="vendor_email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vendor@example.com"
                    className="h-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor_address">Address</Label>
                <Textarea
                  id="vendor_address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Vendor address"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Vendor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
