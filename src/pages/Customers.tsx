import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Phone, Mail, Building2, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  company_name: string | null;
  notes: string | null;
  created_at: string;
}

const Customers = () => {
  const { isAdmin } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    company_name: '',
    notes: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('গ্রাহক তালিকা লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(formData)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast.success('গ্রাহকের তথ্য আপডেট হয়েছে');
      } else {
        const { error } = await supabase.from('customers').insert([formData]);

        if (error) throw error;
        toast.success('নতুন গ্রাহক যোগ হয়েছে');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCustomers();
    } catch (error: any) {
      console.error('Error saving customer:', error);
      toast.error(error.message || 'সমস্যা হয়েছে');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      company_name: customer.company_name || '',
      notes: customer.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত এই গ্রাহক মুছে ফেলতে চান?')) return;

    try {
      const { error } = await supabase.from('customers').delete().eq('id', id);

      if (error) throw error;
      toast.success('গ্রাহক মুছে ফেলা হয়েছে');
      fetchCustomers();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast.error(error.message || 'মুছে ফেলতে সমস্যা হয়েছে');
    }
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      company_name: '',
      notes: '',
    });
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.includes(searchQuery) ||
      customer.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const customerHeaders = {
    name: 'নাম',
    phone: 'ফোন',
    email: 'ইমেইল',
    company_name: 'কোম্পানি',
    address: 'ঠিকানা',
    notes: 'নোট',
  };

  const handleExport = (format: 'csv' | 'excel') => {
    if (filteredCustomers.length === 0) {
      toast.error('এক্সপোর্ট করার মতো ডেটা নেই');
      return;
    }
    
    const exportData = filteredCustomers.map(c => ({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      company_name: c.company_name || '',
      address: c.address || '',
      notes: c.notes || '',
    }));

    if (format === 'csv') {
      exportToCSV(exportData, 'customers', customerHeaders);
    } else {
      exportToExcel(exportData, 'customers', customerHeaders);
    }
    toast.success(`${format.toUpperCase()} ফাইল ডাউনলোড হচ্ছে`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">গ্রাহক তালিকা</h1>
          <p className="text-muted-foreground">সকল গ্রাহকদের তথ্য পরিচালনা করুন</p>
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                এক্সপোর্ট
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                CSV ডাউনলোড
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                Excel ডাউনলোড
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              নতুন গ্রাহক
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? 'গ্রাহকের তথ্য সম্পাদনা' : 'নতুন গ্রাহক যোগ করুন'}
              </DialogTitle>
              <DialogDescription>
                গ্রাহকের সকল তথ্য সঠিকভাবে পূরণ করুন
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">নাম *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="গ্রাহকের নাম"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">ফোন</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">ইমেইল</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_name">কোম্পানির নাম</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="কোম্পানির নাম"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">ঠিকানা</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="সম্পূর্ণ ঠিকানা"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">নোট</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="অতিরিক্ত তথ্য"
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  বাতিল
                </Button>
                <Button type="submit">
                  {editingCustomer ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="নাম, ফোন বা কোম্পানি খুঁজুন..."
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
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">কোনো গ্রাহক পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>নাম</TableHead>
                    <TableHead>যোগাযোগ</TableHead>
                    <TableHead>কোম্পানি</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="font-medium">{customer.name}</div>
                        {customer.address && (
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {customer.address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {customer.phone}
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{customer.company_name || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(customer.id)}
                              className="text-destructive hover:text-destructive"
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
    </div>
  );
};

export default Customers;
