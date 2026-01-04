import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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
import { Plus, Star, TrendingUp, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PerformanceNote {
  id: string;
  user_id: string;
  note: string;
  rating: number | null;
  created_at: string;
  created_by: string | null;
  employee?: { full_name: string } | null;
  creator?: { full_name: string } | null;
}

interface Employee {
  id: string;
  full_name: string;
}

const Performance = () => {
  const { isAdmin, user } = useAuth();
  const [notes, setNotes] = useState<PerformanceNote[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    user_id: "",
    note: "",
    rating: "3",
  });

  useEffect(() => {
    fetchData();
  }, [selectedEmployee, isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees from employees table
      const { data: employeesData } = await supabase
        .from("employees")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      setEmployees(employeesData || []);

      let query = supabase
        .from("performance_notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        query = query.eq("user_id", user?.id);
      } else if (selectedEmployee !== "all") {
        query = query.eq("user_id", selectedEmployee);
      }

      const { data: notesData } = await query;

      if (notesData && employeesData) {
        const notesWithEmployees = notesData.map((note) => {
          const employee = employeesData.find((e) => e.id === note.user_id);
          const creator = employeesData.find((e) => e.id === note.created_by);
          return {
            ...note,
            employee: employee ? { full_name: employee.full_name } : null,
            creator: creator ? { full_name: creator.full_name } : null,
          };
        });
        setNotes(notesWithEmployees);
      }
    } catch (error) {
      console.error("Error fetching performance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.user_id || !formData.note) {
      toast.error("Please select employee and enter note");
      return;
    }

    try {
      const { error } = await supabase.from("performance_notes").insert({
        user_id: formData.user_id,
        note: formData.note,
        rating: parseInt(formData.rating),
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("Performance note saved");
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving performance note:", error);
      toast.error("Failed to save note");
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: "",
      note: "",
      rating: "3",
    });
  };

  const getRatingStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  const avgRating =
    notes.length > 0
      ? notes.reduce((sum, n) => sum + (n.rating || 0), 0) / notes.filter(n => n.rating).length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Performance</h1>
          <p className="text-muted-foreground">Employee performance tracking</p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Performance Note</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select
                    value={formData.user_id}
                    onValueChange={(v) => setFormData({ ...formData, user_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rating</Label>
                  <Select
                    value={formData.rating}
                    onValueChange={(v) => setFormData({ ...formData, rating: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">⭐ (Poor)</SelectItem>
                      <SelectItem value="2">⭐⭐ (Below Average)</SelectItem>
                      <SelectItem value="3">⭐⭐⭐ (Average)</SelectItem>
                      <SelectItem value="4">⭐⭐⭐⭐ (Good)</SelectItem>
                      <SelectItem value="5">⭐⭐⭐⭐⭐ (Excellent)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Note</Label>
                  <Textarea
                    placeholder="Write performance comments..."
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{notes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4" />
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
              {getRatingStars(Math.round(avgRating))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {new Set(notes.map((n) => n.user_id)).size}
            </p>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Employee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              {isAdmin && <TableHead>Employee</TableHead>}
              <TableHead>Rating</TableHead>
              <TableHead>Note</TableHead>
              {isAdmin && <TableHead>Added By</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 3} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : notes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 3} className="text-center py-8 text-muted-foreground">
                  No notes
                </TableCell>
              </TableRow>
            ) : (
              notes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell>
                    {format(new Date(note.created_at), "dd MMM yyyy")}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="font-medium">
                      {note.employee?.full_name || "-"}
                    </TableCell>
                  )}
                  <TableCell>{getRatingStars(note.rating)}</TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="line-clamp-2">{note.note}</p>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-muted-foreground">
                      {note.creator?.full_name || "-"}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Performance;
