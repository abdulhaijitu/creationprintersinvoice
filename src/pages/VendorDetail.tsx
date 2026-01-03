import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Phone, Mail, MapPin, Building2, CreditCard, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface Vendor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  bank_info: string | null;
  notes: string | null;
}

interface Bill {
  id: string;
  bill_date: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  status: string;
}

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string | null;
  notes: string | null;
  bill_id: string | null;
}

const VendorDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const [billForm, setBillForm] = useState({
    bill_date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    amount: "",
    due_date: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    payment_date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    payment_method: "cash",
    notes: "",
    bill_id: "",
  });

  useEffect(() => {
    if (id) {
      fetchVendorData();
    }
  }, [id]);

  const fetchVendorData = async () => {
    setLoading(true);
    try {
      // Fetch vendor
      const { data: vendorData } = await supabase
        .from("vendors")
        .select("*")
        .eq("id", id)
        .single();

      if (vendorData) {
        setVendor(vendorData);
      }

      // Fetch bills
      const { data: billsData } = await supabase
        .from("vendor_bills")
        .select("*")
        .eq("vendor_id", id)
        .order("bill_date", { ascending: false });

      setBills(billsData || []);

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from("vendor_payments")
        .select("*")
        .eq("vendor_id", id)
        .order("payment_date", { ascending: false });

      setPayments(paymentsData || []);
    } catch (error) {
      console.error("Error fetching vendor data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!billForm.amount) {
      toast.error("বিলের পরিমাণ দিন");
      return;
    }

    try {
      if (editingBill) {
        const { error } = await supabase
          .from("vendor_bills")
          .update({
            bill_date: billForm.bill_date,
            description: billForm.description || null,
            amount: parseFloat(billForm.amount),
            due_date: billForm.due_date || null,
          })
          .eq("id", editingBill.id);

        if (error) throw error;
        toast.success("বিল আপডেট হয়েছে");
      } else {
        const { error } = await supabase.from("vendor_bills").insert({
          vendor_id: id,
          bill_date: billForm.bill_date,
          description: billForm.description || null,
          amount: parseFloat(billForm.amount),
          due_date: billForm.due_date || null,
          status: "unpaid",
        });

        if (error) throw error;
        toast.success("বিল যোগ হয়েছে");
      }

      setIsBillDialogOpen(false);
      resetBillForm();
      fetchVendorData();
    } catch (error) {
      console.error("Error saving bill:", error);
      toast.error("বিল সংরক্ষণ ব্যর্থ হয়েছে");
    }
  };

  const handleDeleteBill = async (billId: string) => {
    if (!confirm("আপনি কি এই বিল মুছে ফেলতে চান?")) return;

    try {
      const { error } = await supabase
        .from("vendor_bills")
        .delete()
        .eq("id", billId);

      if (error) throw error;
      toast.success("বিল মুছে ফেলা হয়েছে");
      fetchVendorData();
    } catch (error) {
      console.error("Error deleting bill:", error);
      toast.error("বিল মুছে ফেলা ব্যর্থ হয়েছে");
    }
  };

  const openEditBillDialog = (bill: Bill) => {
    setEditingBill(bill);
    setBillForm({
      bill_date: bill.bill_date,
      description: bill.description || "",
      amount: bill.amount.toString(),
      due_date: bill.due_date || "",
    });
    setIsBillDialogOpen(true);
  };

  const resetBillForm = () => {
    setBillForm({
      bill_date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      amount: "",
      due_date: "",
    });
    setEditingBill(null);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentForm.amount) {
      toast.error("পেমেন্টের পরিমাণ দিন");
      return;
    }

    try {
      if (editingPayment) {
        const { error } = await supabase
          .from("vendor_payments")
          .update({
            payment_date: paymentForm.payment_date,
            amount: parseFloat(paymentForm.amount),
            payment_method: paymentForm.payment_method,
            notes: paymentForm.notes || null,
            bill_id: paymentForm.bill_id || null,
          })
          .eq("id", editingPayment.id);

        if (error) throw error;
        toast.success("পেমেন্ট আপডেট হয়েছে");
      } else {
        const { error } = await supabase.from("vendor_payments").insert({
          vendor_id: id,
          payment_date: paymentForm.payment_date,
          amount: parseFloat(paymentForm.amount),
          payment_method: paymentForm.payment_method,
          notes: paymentForm.notes || null,
          bill_id: paymentForm.bill_id || null,
        });

        if (error) throw error;

        // Update bill status if linked
        if (paymentForm.bill_id) {
          const bill = bills.find((b) => b.id === paymentForm.bill_id);
          if (bill) {
            const billPayments = payments.filter((p) => p.bill_id === bill.id);
            const totalPaid = billPayments.reduce((sum, p) => sum + p.amount, 0) + parseFloat(paymentForm.amount);
            
            if (totalPaid >= bill.amount) {
              await supabase
                .from("vendor_bills")
                .update({ status: "paid" })
                .eq("id", bill.id);
            } else if (totalPaid > 0) {
              await supabase
                .from("vendor_bills")
                .update({ status: "partial" })
                .eq("id", bill.id);
            }
          }
        }

        toast.success("পেমেন্ট যোগ হয়েছে");
      }

      setIsPaymentDialogOpen(false);
      resetPaymentForm();
      fetchVendorData();
    } catch (error) {
      console.error("Error saving payment:", error);
      toast.error("পেমেন্ট সংরক্ষণ ব্যর্থ হয়েছে");
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("আপনি কি এই পেমেন্ট মুছে ফেলতে চান?")) return;

    try {
      const { error } = await supabase
        .from("vendor_payments")
        .delete()
        .eq("id", paymentId);

      if (error) throw error;
      toast.success("পেমেন্ট মুছে ফেলা হয়েছে");
      fetchVendorData();
    } catch (error) {
      console.error("Error deleting payment:", error);
      toast.error("পেমেন্ট মুছে ফেলা ব্যর্থ হয়েছে");
    }
  };

  const openEditPaymentDialog = (payment: Payment) => {
    setEditingPayment(payment);
    setPaymentForm({
      payment_date: payment.payment_date,
      amount: payment.amount.toString(),
      payment_method: payment.payment_method || "cash",
      notes: payment.notes || "",
      bill_id: payment.bill_id || "",
    });
    setIsPaymentDialogOpen(true);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      payment_date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      payment_method: "cash",
      notes: "",
      bill_id: "",
    });
    setEditingPayment(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("bn-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalBills = bills.reduce((sum, b) => sum + b.amount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const dueAmount = totalBills - totalPaid;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-success">পরিশোধিত</Badge>;
      case "partial":
        return <Badge variant="secondary">আংশিক</Badge>;
      default:
        return <Badge variant="destructive">বাকি</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-8">
        <p>ভেন্ডর পাওয়া যায়নি</p>
        <Button variant="outline" onClick={() => navigate("/vendors")} className="mt-4">
          ফিরে যান
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/vendors")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{vendor.name}</h1>
          <p className="text-muted-foreground">ভেন্ডর বিস্তারিত</p>
        </div>
      </div>

      {/* Vendor Info & Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              যোগাযোগ তথ্য
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vendor.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{vendor.phone}</span>
              </div>
            )}
            {vendor.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{vendor.email}</span>
              </div>
            )}
            {vendor.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{vendor.address}</span>
              </div>
            )}
            {vendor.bank_info && (
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>{vendor.bank_info}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                মোট বিল
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalBills)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                পরিশোধ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalPaid)}</p>
            </CardContent>
          </Card>
          <Card className={dueAmount > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                বকেয়া
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${dueAmount > 0 ? "text-destructive" : "text-success"}`}>
                {formatCurrency(dueAmount)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bills & Payments Tabs */}
      <Tabs defaultValue="ledger" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="ledger">লেজার</TabsTrigger>
            <TabsTrigger value="bills">বিল ({bills.length})</TabsTrigger>
            <TabsTrigger value="payments">পেমেন্ট ({payments.length})</TabsTrigger>
          </TabsList>

          {isAdmin && (
            <div className="flex gap-2">
              <Dialog open={isBillDialogOpen} onOpenChange={(open) => {
                setIsBillDialogOpen(open);
                if (!open) resetBillForm();
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    নতুন বিল
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingBill ? "বিল সম্পাদনা" : "নতুন বিল যোগ করুন"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddBill} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>বিল তারিখ</Label>
                        <Input
                          type="date"
                          value={billForm.bill_date}
                          onChange={(e) =>
                            setBillForm({ ...billForm, bill_date: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>টাকা</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={billForm.amount}
                          onChange={(e) =>
                            setBillForm({ ...billForm, amount: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>বিবরণ</Label>
                      <Textarea
                        placeholder="বিলের বিবরণ"
                        value={billForm.description}
                        onChange={(e) =>
                          setBillForm({ ...billForm, description: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ডিউ ডেট (ঐচ্ছিক)</Label>
                      <Input
                        type="date"
                        value={billForm.due_date}
                        onChange={(e) =>
                          setBillForm({ ...billForm, due_date: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => {
                        setIsBillDialogOpen(false);
                        resetBillForm();
                      }}>
                        বাতিল
                      </Button>
                      <Button type="submit">সংরক্ষণ</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
                setIsPaymentDialogOpen(open);
                if (!open) resetPaymentForm();
              }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    পেমেন্ট
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingPayment ? "পেমেন্ট সম্পাদনা" : "পেমেন্ট যোগ করুন"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddPayment} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>তারিখ</Label>
                        <Input
                          type="date"
                          value={paymentForm.payment_date}
                          onChange={(e) =>
                            setPaymentForm({ ...paymentForm, payment_date: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>টাকা</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={paymentForm.amount}
                          onChange={(e) =>
                            setPaymentForm({ ...paymentForm, amount: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>পেমেন্ট মেথড</Label>
                        <Select
                          value={paymentForm.payment_method}
                          onValueChange={(value) =>
                            setPaymentForm({ ...paymentForm, payment_method: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">নগদ</SelectItem>
                            <SelectItem value="bank">ব্যাংক</SelectItem>
                            <SelectItem value="bkash">বিকাশ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>বিল (ঐচ্ছিক)</Label>
                        <Select
                          value={paymentForm.bill_id}
                          onValueChange={(value) =>
                            setPaymentForm({ ...paymentForm, bill_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="বাছুন" />
                          </SelectTrigger>
                          <SelectContent>
                            {bills.filter(b => b.status !== "paid").map((bill) => (
                              <SelectItem key={bill.id} value={bill.id}>
                                {format(new Date(bill.bill_date), "dd/MM/yyyy")} - {formatCurrency(bill.amount)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>নোট</Label>
                      <Textarea
                        placeholder="পেমেন্ট নোট"
                        value={paymentForm.notes}
                        onChange={(e) =>
                          setPaymentForm({ ...paymentForm, notes: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => {
                        setIsPaymentDialogOpen(false);
                        resetPaymentForm();
                      }}>
                        বাতিল
                      </Button>
                      <Button type="submit">সংরক্ষণ</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Ledger Tab */}
        <TabsContent value="ledger">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>তারিখ</TableHead>
                  <TableHead>বিবরণ</TableHead>
                  <TableHead className="text-right">বিল</TableHead>
                  <TableHead className="text-right">পেমেন্ট</TableHead>
                  <TableHead className="text-right">ব্যালেন্স</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  // Combine bills and payments for ledger
                  const ledgerItems: { date: string; description: string; bill: number; payment: number; type: 'bill' | 'payment' }[] = [];
                  
                  bills.forEach(bill => {
                    ledgerItems.push({
                      date: bill.bill_date,
                      description: bill.description || 'বিল',
                      bill: bill.amount,
                      payment: 0,
                      type: 'bill'
                    });
                  });
                  
                  payments.forEach(payment => {
                    ledgerItems.push({
                      date: payment.payment_date,
                      description: payment.notes || `পেমেন্ট (${payment.payment_method === 'cash' ? 'নগদ' : payment.payment_method === 'bank' ? 'ব্যাংক' : 'বিকাশ'})`,
                      bill: 0,
                      payment: payment.amount,
                      type: 'payment'
                    });
                  });
                  
                  // Sort by date
                  ledgerItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                  
                  let runningBalance = 0;
                  
                  if (ledgerItems.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          কোনো লেনদেন নেই
                        </TableCell>
                      </TableRow>
                    );
                  }
                  
                  return ledgerItems.map((item, index) => {
                    runningBalance += item.bill - item.payment;
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          {format(new Date(item.date), "dd MMM yyyy", { locale: bn })}
                        </TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">
                          {item.bill > 0 ? formatCurrency(item.bill) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-success">
                          {item.payment > 0 ? formatCurrency(item.payment) : '-'}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${runningBalance > 0 ? 'text-destructive' : 'text-success'}`}>
                          {formatCurrency(runningBalance)}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="bills">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>তারিখ</TableHead>
                  <TableHead>বিবরণ</TableHead>
                  <TableHead>ডিউ ডেট</TableHead>
                  <TableHead className="text-right">টাকা</TableHead>
                  <TableHead>স্ট্যাটাস</TableHead>
                  {isAdmin && <TableHead className="text-right">অ্যাকশন</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                      কোনো বিল নেই
                    </TableCell>
                  </TableRow>
                ) : (
                  bills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell>
                        {format(new Date(bill.bill_date), "dd MMM yyyy", { locale: bn })}
                      </TableCell>
                      <TableCell>{bill.description || "-"}</TableCell>
                      <TableCell>
                        {bill.due_date
                          ? format(new Date(bill.due_date), "dd MMM yyyy", { locale: bn })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(bill.amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(bill.status)}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditBillDialog(bill)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteBill(bill.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>তারিখ</TableHead>
                  <TableHead>পেমেন্ট মেথড</TableHead>
                  <TableHead>নোট</TableHead>
                  <TableHead className="text-right">টাকা</TableHead>
                  {isAdmin && <TableHead className="text-right">অ্যাকশন</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">
                      কোনো পেমেন্ট নেই
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.payment_date), "dd MMM yyyy", { locale: bn })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {payment.payment_method === "cash"
                            ? "নগদ"
                            : payment.payment_method === "bank"
                            ? "ব্যাংক"
                            : "বিকাশ"}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.notes || "-"}</TableCell>
                      <TableCell className="text-right font-medium text-success">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditPaymentDialog(payment)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePayment(payment.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VendorDetail;
