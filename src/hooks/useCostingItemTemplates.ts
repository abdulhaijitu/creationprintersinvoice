/**
 * Hook for managing Costing Item Templates
 * 
 * Item templates are predefined costing structures for common items like
 * Plate, Print, Lamination, etc. When a user selects an item type in the
 * costing section, the template's rows auto-populate.
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface TemplateRow {
  id: string;
  sub_item_name: string;
  description: string | null;
  default_qty: number;
  default_price: number;
  sort_order: number;
}

export interface CostingItemTemplate {
  id: string;
  organization_id: string;
  item_name: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  rows: TemplateRow[];
}

interface CreateTemplateInput {
  item_name: string;
  description?: string;
  rows: Omit<TemplateRow, 'id'>[];
}

interface UpdateTemplateInput {
  id: string;
  item_name?: string;
  description?: string;
  is_active?: boolean;
  rows?: Omit<TemplateRow, 'id'>[];
}

export function useCostingItemTemplates() {
  const { organization } = useOrganization();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Fetch all templates with their rows
  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['costing-item-templates', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('costing_item_templates' as any)
        .select('*')
        .eq('organization_id', organization.id)
        .order('item_name', { ascending: true });

      if (templatesError) throw templatesError;
      if (!templatesData || templatesData.length === 0) return [];

      // Fetch all rows for these templates
      const templateIds = templatesData.map((t: any) => t.id);
      const { data: rowsData, error: rowsError } = await supabase
        .from('costing_item_template_rows' as any)
        .select('*')
        .in('template_id', templateIds)
        .order('sort_order', { ascending: true });

      if (rowsError) throw rowsError;

      // Map rows to templates
      const templates: CostingItemTemplate[] = templatesData.map((t: any) => ({
        ...t,
        rows: (rowsData || [])
          .filter((r: any) => r.template_id === t.id)
          .map((r: any) => ({
            id: r.id,
            sub_item_name: r.sub_item_name,
            description: r.description,
            default_qty: Number(r.default_qty),
            default_price: Number(r.default_price),
            sort_order: r.sort_order,
          })),
      }));

      return templates;
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get template by item name
  const getTemplateByItemName = useCallback((itemName: string): CostingItemTemplate | null => {
    if (!itemName) return null;
    const normalizedName = itemName.toLowerCase().replace(/\s+/g, '_');
    return templates.find(t => 
      t.item_name.toLowerCase().replace(/\s+/g, '_') === normalizedName ||
      t.item_name.toLowerCase() === itemName.toLowerCase()
    ) || null;
  }, [templates]);

  // Check if template exists for item
  const hasTemplateForItem = useCallback((itemName: string): boolean => {
    return getTemplateByItemName(itemName) !== null;
  }, [getTemplateByItemName]);

  // Create template
  const createTemplate = useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      if (!organization?.id) throw new Error('No organization');

      setLoading(true);
      
      // Create template
      const { data: templateData, error: templateError } = await supabase
        .from('costing_item_templates' as any)
        .insert({
          organization_id: organization.id,
          item_name: input.item_name.trim(),
          description: input.description?.trim() || null,
          is_active: true,
        })
        .select('id')
        .single();

      if (templateError) throw templateError;
      const template = templateData as unknown as { id: string };

      // Create rows
      if (input.rows.length > 0) {
        const rowsToInsert = input.rows.map((row, index) => ({
          template_id: template.id,
          sub_item_name: row.sub_item_name,
          description: row.description || null,
          default_qty: row.default_qty,
          default_price: row.default_price,
          sort_order: row.sort_order ?? index,
        }));

        const { error: rowsError } = await supabase
          .from('costing_item_template_rows' as any)
          .insert(rowsToInsert);

        if (rowsError) throw rowsError;
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costing-item-templates'] });
      toast.success('টেমপ্লেট তৈরি হয়েছে');
    },
    onError: (error: any) => {
      console.error('Error creating template:', error);
      if (error.message?.includes('unique_item_template_per_org')) {
        toast.error('এই আইটেমের জন্য আগে থেকেই টেমপ্লেট আছে');
      } else {
        toast.error('টেমপ্লেট তৈরিতে সমস্যা হয়েছে');
      }
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  // Update template
  const updateTemplate = useMutation({
    mutationFn: async (input: UpdateTemplateInput) => {
      setLoading(true);

      // Update template metadata
      const updateData: any = {};
      if (input.item_name !== undefined) updateData.item_name = input.item_name.trim();
      if (input.description !== undefined) updateData.description = input.description?.trim() || null;
      if (input.is_active !== undefined) updateData.is_active = input.is_active;

      if (Object.keys(updateData).length > 0) {
        const { error: templateError } = await supabase
          .from('costing_item_templates' as any)
          .update(updateData)
          .eq('id', input.id);

        if (templateError) throw templateError;
      }

      // Update rows if provided
      if (input.rows !== undefined) {
        // Delete existing rows
        await supabase
          .from('costing_item_template_rows' as any)
          .delete()
          .eq('template_id', input.id);

        // Insert new rows
        if (input.rows.length > 0) {
          const rowsToInsert = input.rows.map((row, index) => ({
            template_id: input.id,
            sub_item_name: row.sub_item_name,
            description: row.description || null,
            default_qty: row.default_qty,
            default_price: row.default_price,
            sort_order: row.sort_order ?? index,
          }));

          const { error: rowsError } = await supabase
            .from('costing_item_template_rows' as any)
            .insert(rowsToInsert);

          if (rowsError) throw rowsError;
        }
      }

      return input.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costing-item-templates'] });
      toast.success('টেমপ্লেট আপডেট হয়েছে');
    },
    onError: (error: any) => {
      console.error('Error updating template:', error);
      toast.error('টেমপ্লেট আপডেট করতে সমস্যা হয়েছে');
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  // Delete template
  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      setLoading(true);
      
      const { error } = await supabase
        .from('costing_item_templates' as any)
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costing-item-templates'] });
      toast.success('টেমপ্লেট মুছে ফেলা হয়েছে');
    },
    onError: (error: any) => {
      console.error('Error deleting template:', error);
      toast.error('টেমপ্লেট মুছতে সমস্যা হয়েছে');
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  // Get items that have templates (for UI hints)
  const itemsWithTemplates = useMemo(() => {
    return templates
      .filter(t => t.is_active)
      .map(t => t.item_name.toLowerCase().replace(/\s+/g, '_'));
  }, [templates]);

  return {
    templates,
    isLoading: isLoading || loading,
    refetch,
    getTemplateByItemName,
    hasTemplateForItem,
    itemsWithTemplates,
    createTemplate: createTemplate.mutateAsync,
    updateTemplate: updateTemplate.mutateAsync,
    deleteTemplate: deleteTemplate.mutateAsync,
    isCreating: createTemplate.isPending,
    isUpdating: updateTemplate.isPending,
    isDeleting: deleteTemplate.isPending,
  };
}
