import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Wallet,
  Users,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';

interface DashboardStats {
  todaySales: number;
  monthlyIncome: number;
  monthlyExpense: number;
  pendingInvoices: number;
  pendingQuotations: number;
  totalCustomers: number;
  vendorDue: number;
  pendingLeaveRequests: number;
  pendingTasks: number;
}

const Dashboard = () => {
  const { user, role, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    pendingInvoices: 0,
    pendingQuotations: 0,
    totalCustomers: 0,
    vendorDue: 0,
    pendingLeaveRequests: 0,
    pendingTasks: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const todayStr = format(today, 'yyyy-MM-dd');
        const monthStartStr = format(startOfMonth, 'yyyy-MM-dd');

        // Fetch stats in parallel
        const [
          invoicesRes,
          quotationsRes,
          customersRes,
          expensesRes,
          recentInvoicesRes,
          vendorBillsRes,
          leaveRequestsRes,
          tasksRes,
        ] = await Promise.all([
          supabase.from('invoices').select('total, paid_amount, status, invoice_date'),
          supabase.from('quotations').select('status').eq('status', 'pending'),
          supabase.from('customers').select('id', { count: 'exact', head: true }),
          supabase
            .from('expenses')
            .select('amount')
            .gte('date', monthStartStr),
          supabase
            .from('invoices')
            .select('*, customers(name)')
            .order('created_at', { ascending: false })
            .limit(5),
          supabase.from('vendor_bills').select('amount, status').neq('status', 'paid'),
          isAdmin
            ? supabase.from('leave_requests').select('id').eq('status', 'pending')
            : Promise.resolve({ data: [], count: 0 }),
          supabase
            .from('tasks')
            .select('id')
            .eq('assigned_to', user?.id)
            .neq('status', 'completed'),
        ]);

        // Calculate stats
        const invoices = invoicesRes.data || [];
        const todayInvoices = invoices.filter((inv) => inv.invoice_date === todayStr);
        const monthlyInvoices = invoices.filter(
          (inv) => inv.invoice_date >= monthStartStr
        );

        const todaySales = todayInvoices.reduce(
          (sum, inv) => sum + Number(inv.paid_amount || 0),
          0
        );
        const monthlyIncome = monthlyInvoices.reduce(
          (sum, inv) => sum + Number(inv.paid_amount || 0),
          0
        );
        const monthlyExpense = (expensesRes.data || []).reduce(
          (sum, exp) => sum + Number(exp.amount || 0),
          0
        );
        const pendingInvoices = invoices.filter(
          (inv) => inv.status === 'unpaid' || inv.status === 'partial'
        ).length;
        const vendorDue = (vendorBillsRes.data || []).reduce(
          (sum, bill) => sum + Number(bill.amount || 0),
          0
        );

        setStats({
          todaySales,
          monthlyIncome,
          monthlyExpense,
          pendingInvoices,
          pendingQuotations: quotationsRes.data?.length || 0,
          totalCustomers: customersRes.count || 0,
          vendorDue,
          pendingLeaveRequests: (leaveRequestsRes as any).data?.length || 0,
          pendingTasks: tasksRes.data?.length || 0,
        });

        setRecentInvoices(recentInvoicesRes.data || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, isAdmin]);

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

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">ড্যাশবোর্ড</h1>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: bn })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="আজকের বিক্রয়"
          value={formatCurrency(stats.todaySales)}
          icon={TrendingUp}
          iconClassName="bg-success/10 text-success"
        />
        <StatCard
          title="মাসিক আয়"
          value={formatCurrency(stats.monthlyIncome)}
          icon={Wallet}
          iconClassName="bg-primary/10 text-primary"
        />
        <StatCard
          title="মাসিক খরচ"
          value={formatCurrency(stats.monthlyExpense)}
          icon={Wallet}
          iconClassName="bg-warning/10 text-warning"
        />
        <StatCard
          title="মোট গ্রাহক"
          value={stats.totalCustomers}
          icon={Users}
          iconClassName="bg-info/10 text-info"
        />
      </div>

      {/* Alerts Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className={stats.pendingInvoices > 0 ? 'border-warning' : ''}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-warning/10">
              <FileText className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pendingInvoices}</p>
              <p className="text-sm text-muted-foreground">পেন্ডিং ইনভয়েস</p>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.vendorDue > 0 ? 'border-destructive' : ''}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(stats.vendorDue)}</p>
              <p className="text-sm text-muted-foreground">ভেন্ডর ডিউ</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-info/10">
              <Clock className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pendingTasks}</p>
              <p className="text-sm text-muted-foreground">পেন্ডিং টাস্ক</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>সাম্প্রতিক ইনভয়েস</CardTitle>
          <CardDescription>শেষ ৫টি ইনভয়েস</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentInvoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                কোনো ইনভয়েস নেই
              </p>
            ) : (
              recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.customers?.name || 'অজানা গ্রাহক'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(Number(invoice.total))}</p>
                    {getStatusBadge(invoice.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
