import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, User, Mail, Phone, MapPin, Building2, FileText, CreditCard, AlertCircle, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CustomerStatementPDF } from "@/components/customer/CustomerStatementPDF";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  company_name: string | null;
  notes: string | null;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  total: number;
  paid_amount: number;
  status: string;
}

interface Payment {
  id: string;
  invoice_id: string;
  invoice_number: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  notes: string | null;
}

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStatement, setShowStatement] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCustomerData();
    }
  }, [id]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);

      // Fetch customer
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("id, name, email, phone, address, company_name, notes, created_at")
        .eq("id", id)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("id, invoice_number, invoice_date, due_date, total, paid_amount, status")
        .eq("customer_id", id)
        .order("invoice_date", { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);

      // Fetch payments scoped to this customer's invoices
      const invoiceIds = (invoicesData || []).map((inv) => inv.id);
      
      if (invoiceIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from("invoice_payments")
          .select(`
            id,
            invoice_id,
            payment_date,
            amount,
            payment_method,
            notes,
            invoices!inner(invoice_number)
          `)
          .in("invoice_id", invoiceIds)
          .order("payment_date", { ascending: false });

        if (paymentsError) throw paymentsError;

        const customerPayments = (paymentsData || []).map((p: any) => ({
          id: p.id,
          invoice_id: p.invoice_id,
          invoice_number: p.invoices?.invoice_number || "",
          payment_date: p.payment_date,
          amount: p.amount,
          payment_method: p.payment_method,
          notes: p.notes,
        }));

        setPayments(customerPayments);
      } else {
        setPayments([]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30">Paid</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">Partial</Badge>;
      default:
        return <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30">Unpaid</Badge>;
    }
  };

  // Calculate summary stats
  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.paid_amount), 0);
  const outstandingBalance = totalInvoiced - totalPaid;
  const overdueInvoices = invoices.filter(
    (inv) => inv.status !== "paid" && inv.due_date && new Date(inv.due_date) < new Date()
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Customer not found</p>
        <Button variant="outline" onClick={() => navigate("/customers")} className="mt-4">
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/customers")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            {customer.company_name && (
              <p className="text-muted-foreground">{customer.company_name}</p>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowStatement(true)}>
          <Printer className="h-4 w-4" />
          Print Statement
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvoiced)}</div>
            <p className="text-xs text-muted-foreground">{invoices.length} invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{formatCurrency(totalPaid)}</div>
            <p className="text-xs text-muted-foreground">{payments.length} payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${outstandingBalance > 0 ? "text-red-500" : "text-green-500"}`}>
              {formatCurrency(outstandingBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              {outstandingBalance > 0 ? "Due amount" : "All cleared"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{overdueInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              {overdueInvoices.length > 0
                ? formatCurrency(overdueInvoices.reduce((sum, inv) => sum + Number(inv.total) - Number(inv.paid_amount), 0))
                : "No overdue invoices"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Info & Tabs */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer Details Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{customer.email}</span>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{customer.phone}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-sm">{customer.address}</span>
              </div>
            )}
            {customer.company_name && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{customer.company_name}</span>
              </div>
            )}
            {customer.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground font-medium mb-1">Notes</p>
                <p className="text-sm">{customer.notes}</p>
              </div>
            )}
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Customer since {format(new Date(customer.created_at), "dd/MM/yyyy")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Invoices & Payments Tabs */}
        <Card className="lg:col-span-2">
          <Tabs defaultValue="invoices" className="w-full">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="invoices">Invoice History</TabsTrigger>
                <TabsTrigger value="payments">Payment Records</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="invoices" className="mt-0">
                {invoices.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No invoices found
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {invoices.map((invoice) => (
                        <Card
                          key={invoice.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                        >
                          <CardContent className="p-4 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{invoice.invoice_number}</span>
                              {getStatusBadge(invoice.status || "unpaid")}
                            </div>
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>{format(new Date(invoice.invoice_date), "dd/MM/yyyy")}</span>
                              <span>Due: {invoice.due_date ? format(new Date(invoice.due_date), "dd/MM/yyyy") : "-"}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Total: <span className="font-medium">{formatCurrency(invoice.total)}</span></span>
                              <span>Paid: <span className="font-medium text-green-500">{formatCurrency(invoice.paid_amount)}</span></span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoices.map((invoice) => (
                            <TableRow
                              key={invoice.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => navigate(`/invoices/${invoice.id}`)}
                            >
                              <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                              <TableCell>{format(new Date(invoice.invoice_date), "dd/MM/yyyy")}</TableCell>
                              <TableCell>
                                {invoice.due_date
                                  ? format(new Date(invoice.due_date), "dd/MM/yyyy")
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(invoice.paid_amount)}</TableCell>
                              <TableCell>{getStatusBadge(invoice.status || "unpaid")}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="payments" className="mt-0">
                {payments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No payments recorded
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {payments.map((payment) => (
                        <Card key={payment.id}>
                          <CardContent className="p-4 space-y-2">
                            <div className="flex justify-between items-center">
                              <span
                                className="font-medium cursor-pointer hover:underline"
                                onClick={() => navigate(`/invoices/${payment.invoice_id}`)}
                              >
                                {payment.invoice_number}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(payment.payment_date), "dd/MM/yyyy")}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <Badge variant="outline" className="capitalize">{payment.payment_method || "Cash"}</Badge>
                              <span className="font-medium text-green-500">{formatCurrency(payment.amount)}</span>
                            </div>
                            {payment.notes && (
                              <p className="text-xs text-muted-foreground truncate">{payment.notes}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>{format(new Date(payment.payment_date), "dd/MM/yyyy")}</TableCell>
                              <TableCell
                                className="font-medium cursor-pointer hover:underline"
                                onClick={() => navigate(`/invoices/${payment.invoice_id}`)}
                              >
                                {payment.invoice_number}
                              </TableCell>
                              <TableCell className="capitalize">{payment.payment_method || "Cash"}</TableCell>
                              <TableCell className="text-right text-green-500">
                                {formatCurrency(payment.amount)}
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate">
                                {payment.notes || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Customer Statement Print */}
      {showStatement && (
        <CustomerStatementPDF
          customer={customer}
          invoices={invoices}
          payments={payments}
          onClose={() => setShowStatement(false)}
        />
      )}
    </div>
  );
};

export default CustomerDetail;
