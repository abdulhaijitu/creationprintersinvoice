import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  FileStack, 
  Save, 
  Download, 
  Trash2, 
  Calendar,
  LayoutTemplate,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CostingItem, LoadMode } from './InvoiceCostingSection';
import { Json } from '@/integrations/supabase/types';
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
import { Replace, ListPlus } from 'lucide-react';

interface CostingTemplate {
  id: string;
  name: string;
  description: string | null;
  items: CostingItem[];
  created_at: string;
}

interface CostingTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentItems: CostingItem[];
  onLoadTemplate: (items: CostingItem[], mode: LoadMode) => void;
  hasExistingItems?: boolean;
}

export function CostingTemplateDialog({
  open,
  onOpenChange,
  currentItems,
  onLoadTemplate,
  hasExistingItems = false,
}: CostingTemplateDialogProps) {
  const { organization } = useOrganization();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<CostingTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('load');
  
  // Load mode selection state
  const [showLoadModeDialog, setShowLoadModeDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CostingTemplate | null>(null);
  
  // Save form state
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const fetchTemplates = useCallback(async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('costing_templates')
        .select('id, name, description, items, created_at')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Parse items from JSON
      const parsed = (data || []).map(t => ({
        ...t,
        items: (t.items as unknown as CostingItem[]) || [],
      }));
      
      setTemplates(parsed);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('টেমপ্লেট লোড করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      // Reset form when opening
      setNewTemplateName('');
      setNewTemplateDescription('');
    }
  }, [open, fetchTemplates]);

  const handleSaveTemplate = async () => {
    if (!organization?.id || !user?.id) return;
    if (!newTemplateName.trim()) {
      toast.error('টেমপ্লেটের নাম দিন');
      return;
    }
    if (currentItems.length === 0 || (currentItems.length === 1 && currentItems[0].line_total === 0)) {
      toast.error('সেভ করার জন্য অন্তত একটি costing item থাকতে হবে');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('costing_templates')
        .insert({
          organization_id: organization.id,
          name: newTemplateName.trim(),
          description: newTemplateDescription.trim() || null,
          items: currentItems as unknown as Json,
          created_by: user.id,
        });

      if (error) throw error;

      toast.success('টেমপ্লেট সেভ হয়েছে');
      setNewTemplateName('');
      setNewTemplateDescription('');
      fetchTemplates();
      setActiveTab('load');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('টেমপ্লেট সেভ করতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadClick = (template: CostingTemplate) => {
    // Check if there are existing items (non-empty)
    const hasExisting = currentItems.length > 0 && 
      !(currentItems.length === 1 && !currentItems[0].item_type && currentItems[0].line_total === 0);
    
    if (hasExisting || hasExistingItems) {
      // Show mode selection dialog
      setSelectedTemplate(template);
      setShowLoadModeDialog(true);
    } else {
      // No existing items, just replace
      confirmLoad(template, 'replace');
    }
  };

  const confirmLoad = (template: CostingTemplate, mode: LoadMode) => {
    // Generate new IDs for items to avoid conflicts
    const itemsWithNewIds = template.items.map(item => ({
      ...item,
      id: crypto.randomUUID(),
    }));
    onLoadTemplate(itemsWithNewIds, mode);
    setShowLoadModeDialog(false);
    setSelectedTemplate(null);
    onOpenChange(false);
    toast.success(`"${template.name}" টেমপ্লেট ${mode === 'replace' ? 'লোড' : 'যোগ'} হয়েছে`);
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`"${templateName}" টেমপ্লেট মুছে ফেলতে চান?`)) return;

    try {
      const { error } = await supabase
        .from('costing_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast.success('টেমপ্লেট মুছে ফেলা হয়েছে');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('টেমপ্লেট মুছতে সমস্যা হয়েছে');
    }
  };

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateTemplateTotal = (items: CostingItem[]) => {
    return items.reduce((sum, item) => sum + (item.line_total || 0), 0);
  };

  // Check if current items can be saved
  const canSave = currentItems.length > 0 && 
    !(currentItems.length === 1 && !currentItems[0].item_type && currentItems[0].line_total === 0);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            Costing Templates
          </DialogTitle>
          <DialogDescription>
            বারবার ব্যবহৃত costing items সেভ করে রিইউজ করুন
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="load" className="gap-2">
              <Download className="h-4 w-4" />
              Load Template
            </TabsTrigger>
            <TabsTrigger value="save" className="gap-2" disabled={!canSave}>
              <Save className="h-4 w-4" />
              Save as Template
            </TabsTrigger>
          </TabsList>

          {/* Load Tab */}
          <TabsContent value="load" className="flex-1 flex flex-col min-h-0 mt-4">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="টেমপ্লেট সার্চ করুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Template List */}
            <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
              <div className="space-y-2 py-2">
                {loading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 border rounded-lg space-y-2">
                        <Skeleton className="h-5 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                        <div className="flex gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                      </div>
                    ))}
                  </>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileStack className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>কোনো টেমপ্লেট পাওয়া যায়নি</p>
                    <p className="text-sm mt-1">
                      নতুন টেমপ্লেট তৈরি করতে "Save as Template" ট্যাবে যান
                    </p>
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 hover:border-primary/30 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">
                            {template.name}
                          </h4>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {template.description}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {template.items.length} items
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {formatCurrency(calculateTemplateTotal(template.items))}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(template.created_at), 'dd/MM/yyyy')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLoadClick(template)}
                            className="gap-1"
                          >
                            <Download className="h-4 w-4" />
                            Load
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTemplate(template.id, template.name)}
                            className="text-destructive hover:text-destructive h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Save Tab */}
          <TabsContent value="save" className="flex-1 flex flex-col min-h-0 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">টেমপ্লেটের নাম *</Label>
                <Input
                  id="template-name"
                  placeholder="যেমন: Business Card Costing"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="template-desc">বিবরণ (ঐচ্ছিক)</Label>
                <Textarea
                  id="template-desc"
                  placeholder="এই টেমপ্লেট সম্পর্কে কিছু লিখুন..."
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Preview current items */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <FileStack className="h-4 w-4" />
                  সংরক্ষিত হবে ({currentItems.filter(i => i.item_type || i.line_total > 0).length} items)
                </h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {currentItems.filter(i => i.item_type || i.line_total > 0).map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {idx + 1}. {item.item_type || 'Unknown'} - {item.description || 'No description'}
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(item.line_total)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                  <span className="text-sm font-medium">মোট:</span>
                  <span className="font-semibold text-primary tabular-nums">
                    {formatCurrency(calculateTemplateTotal(currentItems))}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            বাতিল করুন
          </Button>
          {activeTab === 'save' && (
            <Button 
              onClick={handleSaveTemplate} 
              disabled={saving || !newTemplateName.trim()}
              className="gap-2"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  টেমপ্লেট সেভ করুন
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    {/* Load Mode Selection Dialog */}
    <AlertDialog open={showLoadModeDialog} onOpenChange={setShowLoadModeDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>টেমপ্লেট কিভাবে লোড করবেন?</AlertDialogTitle>
          <AlertDialogDescription>
            আপনার বর্তমান costing items আছে। টেমপ্লেট দিয়ে Replace করতে চান নাকি শেষে Append করতে চান?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          <Button
            variant="outline"
            className="h-auto flex-col items-center gap-2 py-4"
            onClick={() => selectedTemplate && confirmLoad(selectedTemplate, 'replace')}
          >
            <Replace className="h-6 w-6 text-primary" />
            <div className="text-center">
              <p className="font-medium">Replace</p>
              <p className="text-xs text-muted-foreground">বর্তমান items মুছে যাবে</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col items-center gap-2 py-4"
            onClick={() => selectedTemplate && confirmLoad(selectedTemplate, 'append')}
          >
            <ListPlus className="h-6 w-6 text-primary" />
            <div className="text-center">
              <p className="font-medium">Append</p>
              <p className="text-xs text-muted-foreground">বর্তমান items এর পরে যোগ হবে</p>
            </div>
          </Button>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setSelectedTemplate(null)}>
            বাতিল করুন
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
