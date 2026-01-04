import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/contexts/AuthContext";
import { 
  allRoles, 
  getRoleDisplayName, 
  getModulesWithPermissions, 
  permissions as defaultPermissions,
  Module,
  Action
} from "@/lib/permissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Eye,
  Plus,
  Edit,
  Trash2,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface PermissionOverride {
  module: string;
  action: string;
  role: string;
  allowed: boolean;
}

const PermissionMatrix = () => {
  const [overrides, setOverrides] = useState<PermissionOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const modulesWithPermissions = getModulesWithPermissions();

  useEffect(() => {
    fetchOverrides();
  }, []);

  const fetchOverrides = async () => {
    try {
      const { data, error } = await supabase
        .from("module_permissions")
        .select("module, action, role, allowed");

      if (error) throw error;
      setOverrides(data || []);
    } catch (error) {
      console.error("Error fetching permission overrides:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEffectivePermission = (module: Module, action: Action, role: AppRole): boolean => {
    // Check for override first
    const override = overrides.find(
      o => o.module === module && o.action === action && o.role === role
    );
    if (override !== undefined) {
      return override.allowed;
    }
    // Fall back to default permissions
    return defaultPermissions[module]?.[action]?.includes(role) ?? false;
  };

  const togglePermission = async (module: Module, action: Action, role: AppRole) => {
    const key = `${module}-${action}-${role}`;
    setSaving(key);

    const currentValue = getEffectivePermission(module, action, role);
    const newValue = !currentValue;

    try {
      // Check if override exists
      const existingOverride = overrides.find(
        o => o.module === module && o.action === action && o.role === role
      );

      if (existingOverride) {
        // Update existing override
        const { error } = await supabase
          .from("module_permissions")
          .update({ allowed: newValue })
          .eq("module", module)
          .eq("action", action)
          .eq("role", role);

        if (error) throw error;

        setOverrides(prev => 
          prev.map(o => 
            o.module === module && o.action === action && o.role === role 
              ? { ...o, allowed: newValue } 
              : o
          )
        );
      } else {
        // Insert new override
        const { error } = await supabase
          .from("module_permissions")
          .insert({ module, action, role, allowed: newValue });

        if (error) throw error;

        setOverrides(prev => [...prev, { module, action, role, allowed: newValue }]);
      }

      toast.success("Permission updated");
    } catch (error) {
      console.error("Error updating permission:", error);
      toast.error("Failed to update permission");
    } finally {
      setSaving(null);
    }
  };

  const renderActionRow = (
    module: { module: Module; moduleName: string },
    action: Action,
    icon: React.ReactNode,
    label: string,
    isFirst: boolean,
    isLast: boolean
  ) => (
    <TableRow key={`${module.module}-${action}`} className={isLast ? "border-b-2" : ""}>
      {isFirst && (
        <TableCell rowSpan={4} className="font-medium sticky left-0 bg-background border-r">
          {module.moduleName}
        </TableCell>
      )}
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
      </TableCell>
      {allRoles.map((r) => {
        const key = `${module.module}-${action}-${r}`;
        const isChecked = getEffectivePermission(module.module, action, r);
        const isSaving = saving === key;

        return (
          <TableCell key={key} className="text-center">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : (
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => togglePermission(module.module, action, r)}
                className="mx-auto"
              />
            )}
          </TableCell>
        );
      })}
    </TableRow>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permission Matrix</CardTitle>
        <CardDescription>Click checkboxes to toggle permissions for each role per module</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10">Module</TableHead>
                <TableHead className="text-center">Action</TableHead>
                {allRoles.map((r) => (
                  <TableHead key={r} className="text-center min-w-[100px]">
                    {getRoleDisplayName(r)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {modulesWithPermissions.map((module) => (
                <>
                  {renderActionRow(module, 'view', <Eye className="h-3 w-3" />, 'View', true, false)}
                  {renderActionRow(module, 'create', <Plus className="h-3 w-3" />, 'Add', false, false)}
                  {renderActionRow(module, 'edit', <Edit className="h-3 w-3" />, 'Edit', false, false)}
                  {renderActionRow(module, 'delete', <Trash2 className="h-3 w-3" />, 'Delete', false, true)}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PermissionMatrix;
