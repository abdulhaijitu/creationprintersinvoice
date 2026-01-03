import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Eye, Phone, Mail, Building2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Vendor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  bank_info: string | null;
  notes: string | null;
  total_bills?: number;
  total_paid?: number;
  due_amount?: number;
}

const Vendors = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    bank_info: "",
    notes: "",
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      // Fetch vendors
      const { data: vendorsData } = await supabase
        .from("vendors")
        .select("*")
        .order("name");

      if (!vendorsData) {
        setVendors([]);
        return;
      }

      // Fetch bills and payments for each vendor
      const vendorsWithDues = await Promise.all(
        vendorsData.map(async (vendor) => {
          const { data: bills } = await supabase
            .from("vendor_bills")
            .select("amount")
            .eq("vendor_id", vendor.id);

          const { data: payments } = await supabase
            .from("vendor_payments")
            .select("amount")
            .eq("vendor_id", vendor.id);

          const totalBills = bills?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;
          const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

          return {
            ...vendor,
            total_bills: totalBills,
            total_paid: totalPaid,
            due_amount: totalBills - totalPaid,
          };
        })
      );

      setVendors(vendorsWithDues);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("ভেন্ডরের নাম দিন");
      return;
    }

    try {
      if (editingVendor) {
        const { error } = await supabase
          .from("vendors")
          .update(formData)
          .eq("id", editingVendor.id);

        if (error) throw error;
        toast.success("ভেন্ডর আপডেট হয়েছে");
      } else {
        const { error } = await supabase.from("vendors").insert(formData);

        if (error) throw error;
        toast.success("ভেন্ডর যোগ হয়েছে");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchVendors();
    } catch (error) {
      console.error("Error saving vendor:", error);
      toast.error("ভেন্ডর সংরক্ষণ ব্যর্থ হয়েছে");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      bank_info: "",
      notes: "",
    });
    setEditingVendor(null);
  };

  const openEditDialog = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      phone: vendor.phone || "",
      email: vendor.email || "",
      address: vendor.address || "",
      bank_info: vendor.bank_info || "",
      notes: vendor.notes || "",
    });
    setIsDialogOpen(true);
  };

  const filteredVendors = vendors.filter(
    (vendor) =>
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.phone?.includes(searchTerm) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDue = vendors.reduce((sum, v) => sum + (v.due_amount || 0), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("bn-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">ভেন্ডর</h1>
          <p className="text-muted-foreground">সকল ভেন্ডরের তালিকা ও বকেয়া হিসাব</p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                নতুন ভেন্ডর
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingVendor ? "ভেন্ডর সম্পাদনা" : "নতুন ভেন্ডর যোগ করুন"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">নাম *</Label>
                  <Input
                    id="name"
                    placeholder="ভেন্ডরের নাম"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">ফোন</Label>
                    <Input
                      id="phone"
                      placeholder="01XXXXXXXXX"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">ইমেইল</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">ঠিকানা</Label>
                  <Textarea
                    id="address"
                    placeholder="ভেন্ডরের ঠিকানা"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_info">ব্যাংক তথ্য</Label>
                  <Textarea
                    id="bank_info"
                    placeholder="ব্যাংক একাউন্ট নম্বর, ব্র্যাঞ্চ ইত্যাদি"
                    value={formData.bank_info}
                    onChange={(e) =>
                      setFormData({ ...formData, bank_info: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">নোট</Label>
                  <Textarea
                    id="notes"
                    placeholder="অতিরিক্ত তথ্য"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      resetForm();
                    }}
                  >
                    বাতিল
                  </Button>
                  <Button type="submit">সংরক্ষণ করুন</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              মোট ভেন্ডর
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{vendors.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              মোট বিল
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(vendors.reduce((sum, v) => sum + (v.total_bills || 0), 0))}
            </p>
          </CardContent>
        </Card>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              মোট বকেয়া
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totalDue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="ভেন্ডর খুঁজুন..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 max-w-md"
        />
      </div>

      {/* Vendors Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>নাম</TableHead>
              <TableHead>যোগাযোগ</TableHead>
              <TableHead className="text-right">মোট বিল</TableHead>
              <TableHead className="text-right">পরিশোধ</TableHead>
              <TableHead className="text-right">বকেয়া</TableHead>
              <TableHead className="text-center">অ্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  লোড হচ্ছে...
                </TableCell>
              </TableRow>
            ) : filteredVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  কোনো ভেন্ডর পাওয়া যায়নি
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{vendor.name}</p>
                        {vendor.address && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {vendor.address}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {vendor.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {vendor.phone}
                        </div>
                      )}
                      {vendor.email && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {vendor.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(vendor.total_bills || 0)}
                  </TableCell>
                  <TableCell className="text-right text-success">
                    {formatCurrency(vendor.total_paid || 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {(vendor.due_amount || 0) > 0 ? (
                      <Badge variant="destructive">{formatCurrency(vendor.due_amount || 0)}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-success border-success">পরিশোধিত</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/vendors/${vendor.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(vendor)}
                        >
                          সম্পাদনা
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Vendors;
