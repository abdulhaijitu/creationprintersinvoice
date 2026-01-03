import { useState, useEffect } from "react";
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
import { Plus, CheckCircle2, Circle, Clock, ListTodo, Search, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { bn } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Database } from "@/integrations/supabase/types";
import { createNotification } from "@/hooks/useNotifications";

type TaskStatus = Database["public"]["Enums"]["task_status"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  deadline: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
  assignee?: { full_name: string } | null;
  assigner?: { full_name: string } | null;
}

interface Employee {
  id: string;
  full_name: string;
}

const priorityLabels: Record<TaskPriority, string> = {
  low: "নিম্ন",
  medium: "মাঝারি",
  high: "উচ্চ",
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "করতে হবে",
  in_progress: "চলমান",
  completed: "সম্পন্ন",
};

const Tasks = () => {
  const { isAdmin, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_to: "",
    deadline: "",
    priority: "medium" as TaskPriority,
  });

  useEffect(() => {
    fetchData();
  }, [filterStatus, isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees if admin
      if (isAdmin) {
        const { data: employeesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .order("full_name");
        setEmployees(employeesData || []);
      }

      // Fetch tasks
      let query = supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        query = query.or(`assigned_to.eq.${user?.id},assigned_by.eq.${user?.id}`);
      }

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus as TaskStatus);
      }

      const { data: tasksData } = await query;

      if (tasksData) {
        // Fetch profile names
        const tasksWithProfiles = await Promise.all(
          tasksData.map(async (task) => {
            let assignee = null;
            let assigner = null;

            if (task.assigned_to) {
              const { data } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", task.assigned_to)
                .maybeSingle();
              assignee = data;
            }

            if (task.assigned_by) {
              const { data } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", task.assigned_by)
                .maybeSingle();
              assigner = data;
            }

            return { ...task, assignee, assigner };
          })
        );
        setTasks(tasksWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      toast.error("টাস্কের শিরোনাম দিন");
      return;
    }

    try {
      if (editingTask) {
        // Update existing task
        const { error } = await supabase
          .from("tasks")
          .update({
            title: formData.title,
            description: formData.description || null,
            assigned_to: formData.assigned_to || null,
            deadline: formData.deadline || null,
            priority: formData.priority,
          })
          .eq("id", editingTask.id);

        if (error) throw error;
        toast.success("টাস্ক আপডেট হয়েছে");
      } else {
        // Create new task
        const { data: newTask, error } = await supabase.from("tasks").insert({
          title: formData.title,
          description: formData.description || null,
          assigned_to: formData.assigned_to || null,
          assigned_by: user?.id,
          deadline: formData.deadline || null,
          priority: formData.priority,
          status: "todo",
        }).select().single();

        if (error) throw error;

        // Notify assigned user
        if (formData.assigned_to && newTask) {
          await createNotification(
            formData.assigned_to,
            "নতুন টাস্ক অ্যাসাইন",
            `আপনাকে নতুন টাস্ক অ্যাসাইন করা হয়েছে: ${formData.title}`,
            "task_assigned",
            newTask.id,
            "task"
          );
        }

        toast.success("টাস্ক তৈরি হয়েছে");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("টাস্ক সংরক্ষণ ব্যর্থ হয়েছে");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      assigned_to: "",
      deadline: "",
      priority: "medium",
    });
    setEditingTask(null);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      assigned_to: task.assigned_to || "",
      deadline: task.deadline || "",
      priority: task.priority,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("এই টাস্ক মুছে ফেলতে চান?")) return;

    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      toast.success("টাস্ক মুছে ফেলা হয়েছে");
      fetchData();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("টাস্ক মুছতে সমস্যা হয়েছে");
    }
  };

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    try {
      const updateData: { status: TaskStatus; completed_at?: string | null } = { status };
      
      if (status === "completed") {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      const { error } = await supabase.from("tasks").update(updateData).eq("id", id);

      if (error) throw error;

      toast.success("টাস্ক আপডেট হয়েছে");
      fetchData();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("আপডেট ব্যর্থ হয়েছে");
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">{priorityLabels[priority]}</Badge>;
      case "medium":
        return <Badge variant="secondary">{priorityLabels[priority]}</Badge>;
      default:
        return <Badge variant="outline">{priorityLabels[priority]}</Badge>;
    }
  };

  const filteredTasks = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assignee?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">টাস্ক</h1>
          <p className="text-muted-foreground">টাস্ক অ্যাসাইনমেন্ট ও মনিটরিং</p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                নতুন টাস্ক
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTask ? "টাস্ক সম্পাদনা" : "নতুন টাস্ক তৈরি"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>শিরোনাম *</Label>
                  <Input
                    placeholder="টাস্কের শিরোনাম"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>বিবরণ</Label>
                  <Textarea
                    placeholder="টাস্কের বিবরণ..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>অ্যাসাইন করুন</Label>
                    <Select
                      value={formData.assigned_to}
                      onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="কর্মচারী বাছুন" />
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
                    <Label>ডেডলাইন</Label>
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>প্রায়োরিটি</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData({ ...formData, priority: v as TaskPriority })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">নিম্ন</SelectItem>
                      <SelectItem value="medium">মাঝারি</SelectItem>
                      <SelectItem value="high">উচ্চ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    বাতিল
                  </Button>
                  <Button type="submit">তৈরি করুন</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              মোট টাস্ক
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Circle className="h-4 w-4" />
              করতে হবে
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{todoCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-warning flex items-center gap-2">
              <Clock className="h-4 w-4" />
              চলমান
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">{inProgressCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-success flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              সম্পন্ন
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{completedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="টাস্ক খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="স্ট্যাটাস" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">সব</SelectItem>
            <SelectItem value="todo">করতে হবে</SelectItem>
            <SelectItem value="in_progress">চলমান</SelectItem>
            <SelectItem value="completed">সম্পন্ন</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead>শিরোনাম</TableHead>
              <TableHead>অ্যাসাইনী</TableHead>
              <TableHead>প্রায়োরিটি</TableHead>
              <TableHead>ডেডলাইন</TableHead>
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
            ) : filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  কোনো টাস্ক নেই
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(task.status)}
                      <span className="text-sm">{statusLabels[task.status]}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{task.assignee?.full_name || "-"}</TableCell>
                  <TableCell>{getPriorityBadge(task.priority)}</TableCell>
                  <TableCell>
                    {task.deadline
                      ? format(new Date(task.deadline), "dd MMM yyyy", { locale: bn })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Select
                        value={task.status}
                        onValueChange={(v) => updateTaskStatus(task.id, v as TaskStatus)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">করতে হবে</SelectItem>
                          <SelectItem value="in_progress">চলমান</SelectItem>
                          <SelectItem value="completed">সম্পন্ন</SelectItem>
                        </SelectContent>
                      </Select>
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(task)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(task.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
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

export default Tasks;
