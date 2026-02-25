/**
 * Costing Item Templates Management Page
 * 
 * Admin page for creating and managing item-based costing templates.
 * Templates auto-populate costing rows when selecting an item type.
 */

import { useState, useCallback } from 'react';
import { Plus, Trash2, GripVertical, Save, LayoutTemplate, AlertCircle, Search, Edit, X, ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useCostingItemTemplates, CostingItemTemplate, TemplateRow } from '@/hooks/useCostingItemTemplates';
import { useCostingTemplatePermissions } from '@/hooks/useCostingTemplatePermissions';

// Default item types that can have templates
const DEFAULT_ITEM_TYPES = [
  'Plate',
  'Print',
  'Lamination',
  'Die Cutting',
  'Foil',
  'Binding',
  'Packaging',
  'Design',
  'Paper',
  'Others',
];

interface EditableRow {
  id: string;
  sub_item_name: string;
  description: string;
  default_qty: number;
  default_price: number;
  sort_order: number;
}

export default function CostingItemTemplates() {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, isCreating, isUpdating, isDeleting } = useCostingItemTemplates();
  const permissions = useCostingTemplatePermissions();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CostingItemTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  
  // Form state
  const [formItemName, setFormItemName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formRows, setFormRows] = useState<EditableRow[]>([]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  // Filter templates
  const filteredTemplates = templates.filter(t =>
    t.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get item types that don't have templates yet
  const availableItemTypes = DEFAULT_ITEM_TYPES.filter(
    type => !templates.some(t => t.item_name.toLowerCase() === type.toLowerCase())
  );

  // Reset form
  const resetForm = useCallback(() => {
    setFormItemName('');
    setFormDescription('');
    setFormRows([]);
  }, []);

  // Open create dialog
  const handleOpenCreate = useCallback(() => {
    resetForm();
    setShowCreateDialog(true);
  }, [resetForm]);

  // Open edit dialog
  const handleOpenEdit = useCallback((template: CostingItemTemplate) => {
    setFormItemName(template.item_name);
    setFormDescription(template.description || '');
    setFormRows(template.rows.map((r, idx) => ({
      id: r.id || crypto.randomUUID(),
      sub_item_name: r.sub_item_name,
      description: r.description || '',
      default_qty: r.default_qty,
      default_price: r.default_price,
      sort_order: r.sort_order ?? idx,
    })));
    setEditingTemplate(template);
  }, []);

  // Close dialogs
  const handleCloseDialog = useCallback(() => {
    setShowCreateDialog(false);
    setEditingTemplate(null);
    resetForm();
  }, [resetForm]);

  // Add row
  const handleAddRow = useCallback(() => {
    setFormRows(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sub_item_name: '',
        description: '',
        default_qty: 1,
        default_price: 0,
        sort_order: prev.length,
      },
    ]);
  }, []);

  // Update row
  const handleUpdateRow = useCallback((id: string, field: keyof EditableRow, value: any) => {
    setFormRows(prev => prev.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  }, []);

  // Remove row
  const handleRemoveRow = useCallback((id: string) => {
    setFormRows(prev => prev.filter(row => row.id !== id));
  }, []);

  // Save template
  const handleSave = useCallback(async () => {
    if (!formItemName.trim()) return;
    
    const validRows = formRows.filter(r => r.sub_item_name.trim());
    
    if (editingTemplate) {
      await updateTemplate({
        id: editingTemplate.id,
        item_name: formItemName,
        description: formDescription,
        rows: validRows,
      });
    } else {
      await createTemplate({
        item_name: formItemName,
        description: formDescription,
        rows: validRows,
      });
    }
    
    handleCloseDialog();
  }, [formItemName, formDescription, formRows, editingTemplate, createTemplate, updateTemplate, handleCloseDialog]);

  // Delete template
  const handleDelete = useCallback(async () => {
    if (!deleteConfirmId) return;
    await deleteTemplate(deleteConfirmId);
    setDeleteConfirmId(null);
  }, [deleteConfirmId, deleteTemplate]);

  // Toggle expand
  const toggleExpand = useCallback((id: string) => {
    setExpandedTemplates(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Calculate template total
  const calculateTotal = useCallback((rows: TemplateRow[] | EditableRow[]) => {
    return rows.reduce((sum, row) => sum + (row.default_qty * row.default_price), 0);
  }, []);

  // Permission check
  if (permissions.isHidden) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view costing templates.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Costing Item Templates"
        description="Create predefined costing structures for each item type"
      />

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {permissions.canEdit && (
          <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        )}
      </div>

      {/* Templates List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <LayoutTemplate className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No Templates Found</h3>
            <p className="text-muted-foreground mb-4">
              Click "New Template" to create your first template
            </p>
            {permissions.canEdit && (
              <Button onClick={handleOpenCreate} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTemplates.map(template => (
            <Card key={template.id}>
              <Collapsible
                open={expandedTemplates.has(template.id)}
                onOpenChange={() => toggleExpand(template.id)}
              >
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <ChevronDown className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          expandedTemplates.has(template.id) && "rotate-180"
                        )} />
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {template.item_name}
                            {!template.is_active && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </CardTitle>
                          {template.description && (
                            <CardDescription className="mt-1">
                              {template.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{template.rows.length} items</Badge>
                        <span className="font-medium tabular-nums text-primary">
                          {formatCurrency(calculateTotal(template.rows))}
                        </span>
                        {permissions.canEdit && (
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(template)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirmId(template.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sub-Item</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-center w-24">Qty</TableHead>
                          <TableHead className="text-right w-32">Price</TableHead>
                          <TableHead className="text-right w-32">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {template.rows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No items in this template
                            </TableCell>
                          </TableRow>
                        ) : (
                          template.rows.map(row => (
                            <TableRow key={row.id}>
                              <TableCell className="font-medium">{row.sub_item_name}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {row.description || '-'}
                              </TableCell>
                              <TableCell className="text-center tabular-nums">
                                {row.default_qty}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCurrency(row.default_price)}
                              </TableCell>
                              <TableCell className="text-right font-medium tabular-nums">
                                {formatCurrency(row.default_qty * row.default_price)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || !!editingTemplate} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
             <DialogDescription>
              {editingTemplate 
                ? 'Update the template details'
                : 'Create a new item costing template'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* Item Name */}
            <div className="space-y-2">
              <Label htmlFor="item-name">Item Name *</Label>
              {!editingTemplate && availableItemTypes.length > 0 ? (
                <div className="space-y-2">
                  <Input
                    id="item-name"
                    value={formItemName}
                    onChange={(e) => setFormItemName(e.target.value)}
                    placeholder="Enter item name or select from suggestions"
                  />
                  <div className="flex flex-wrap gap-2">
                    {availableItemTypes.map(type => (
                      <Badge
                        key={type}
                        variant={formItemName === type ? "default" : "outline"}
                        className="cursor-pointer hover:bg-primary/10"
                        onClick={() => setFormItemName(type)}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <Input
                  id="item-name"
                  value={formItemName}
                  onChange={(e) => setFormItemName(e.target.value)}
                  placeholder="Enter item name"
                  disabled={!!editingTemplate}
                />
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Write a brief description about this template..."
                rows={2}
              />
            </div>

            {/* Rows */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Template Rows</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRow}
                  className="gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Row
                </Button>
              </div>
              
              {formRows.length === 0 ? (
                <div className="border rounded-lg p-6 text-center text-muted-foreground">
                  <p>No rows yet. Click "Add Row" to start.</p>
                </div>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {formRows.map((row, index) => (
                      <div
                        key={row.id}
                        className="grid grid-cols-12 gap-2 items-center border rounded-lg p-2"
                      >
                        <div className="col-span-1 flex justify-center">
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        </div>
                        <div className="col-span-4">
                          <Input
                            value={row.sub_item_name}
                            onChange={(e) => handleUpdateRow(row.id, 'sub_item_name', e.target.value)}
                            placeholder="Sub-item name"
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            value={row.description}
                            onChange={(e) => handleUpdateRow(row.id, 'description', e.target.value)}
                            placeholder="Description"
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-1">
                          <CurrencyInput
                            value={row.default_qty}
                            onChange={(val) => handleUpdateRow(row.id, 'default_qty', val)}
                            decimals={2}
                            className="h-9 text-center"
                          />
                        </div>
                        <div className="col-span-2">
                          <CurrencyInput
                            value={row.default_price}
                            onChange={(val) => handleUpdateRow(row.id, 'default_price', val)}
                            className="h-9"
                          />
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveRow(row.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Total */}
              {formRows.length > 0 && (
                <div className="flex justify-end items-center gap-3 pt-2 border-t">
                  <span className="text-sm font-medium">Template Total:</span>
                  <span className="font-semibold text-primary tabular-nums">
                    {formatCurrency(calculateTotal(formRows))}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formItemName.trim() || isCreating || isUpdating}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This template will be permanently deleted. This action cannot be undone.
              <br /><br />
              <strong>Note:</strong> Costing data applied from this template in previous invoices will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
