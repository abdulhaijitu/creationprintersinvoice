import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Plus, Search, Eye, FileText, CheckCircle, Clock, XCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { exportToCSV, exportToExcel } from '@/lib/exportUtils';

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  invoice_date: string;
  total: number;
  paid_amount: number;
  status: 'unpaid' | 'partial' | 'paid';
  customers: { name: string } | null;
}

const Invoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customers(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('ইনভয়েস লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('bn-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-success/10 text-success border-0">
            <CheckCircle className="w-3 h-3 mr-1" />
            পরিশোধিত
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-warning/10 text-warning border-0">
            <Clock className="w-3 h-3 mr-1" />
            আংশিক
          </Badge>
        );
      case 'unpaid':
        return (
          <Badge className="bg-destructive/10 text-destructive border-0">
            <XCircle className="w-3 h-3 mr-1" />
            বাকি
          </Badge>
        );
      default:
        return null;
    }
  };

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const invoiceHeaders = {
    invoice_number: 'ইনভয়েস নং',
    customer_name: 'গ্রাহক',
    invoice_date: 'তারিখ',
    total: 'মোট',
    paid_amount: 'পরিশোধিত',
    status: 'স্ট্যাটাস',
  };

  const handleExport = (exportFormat: 'csv' | 'excel') => {
    if (filteredInvoices.length === 0) {
      toast.error('এক্সপোর্ট করার মতো ডেটা নেই');
      return;
    }
    
    const exportData = filteredInvoices.map(inv => ({
      invoice_number: inv.invoice_number,
      customer_name: inv.customers?.name || '',
      invoice_date: format(new Date(inv.invoice_date), 'dd/MM/yyyy'),
      total: inv.total,
      paid_amount: inv.paid_amount,
      status: inv.status === 'paid' ? 'পরিশোধিত' : inv.status === 'partial' ? 'আংশিক' : 'বাকি',
    }));

    if (exportFormat === 'csv') {
      exportToCSV(exportData, 'invoices', invoiceHeaders);
    } else {
      exportToExcel(exportData, 'invoices', invoiceHeaders);
    }
    toast.success(`${exportFormat.toUpperCase()} ফাইল ডাউনলোড হচ্ছে`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">ইনভয়েস</h1>
          <p className="text-muted-foreground">সকল ইনভয়েস পরিচালনা করুন</p>
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

          <Button className="gap-2" onClick={() => navigate('/invoices/new')}>
            <Plus className="h-4 w-4" />
            নতুন ইনভয়েস
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ইনভয়েস নম্বর বা গ্রাহক খুঁজুন..."
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
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">কোনো ইনভয়েস পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ইনভয়েস নং</TableHead>
                    <TableHead>গ্রাহক</TableHead>
                    <TableHead>তারিখ</TableHead>
                    <TableHead className="text-right">মোট</TableHead>
                    <TableHead className="text-right">পরিশোধ</TableHead>
                    <TableHead>স্ট্যাটাস</TableHead>
                    <TableHead className="text-right">অ্যাকশন</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>{invoice.customers?.name || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(invoice.total))}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(invoice.paid_amount))}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
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

export default Invoices;
