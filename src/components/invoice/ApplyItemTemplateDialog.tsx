/**
 * Dialog that prompts user to apply a costing template when selecting an item type
 */

import { useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { LayoutTemplate, FileStack } from 'lucide-react';
import type { CostingItemTemplate, TemplateRow } from '@/hooks/useCostingItemTemplates';

interface ApplyItemTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: CostingItemTemplate | null;
  onApply: (rows: TemplateRow[]) => void;
  onSkip: () => void;
  hasExistingItems: boolean;
}

export function ApplyItemTemplateDialog({
  open,
  onOpenChange,
  template,
  onApply,
  onSkip,
  hasExistingItems,
}: ApplyItemTemplateDialogProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const templateTotal = useMemo(() => {
    if (!template) return 0;
    return template.rows.reduce(
      (sum, row) => sum + (row.default_qty * row.default_price),
      0
    );
  }, [template]);

  if (!template) return null;

  const handleApply = () => {
    onApply(template.rows);
    onOpenChange(false);
  };

  const handleSkip = () => {
    onSkip();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            Apply Costing Template?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                A template exists for <strong>"{template.item_name}"</strong>. 
                Would you like to apply it?
              </p>
              
              {/* Template Preview */}
              <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileStack className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">{template.item_name}</span>
                  </div>
                  <Badge variant="secondary">{template.rows.length} items</Badge>
                </div>
                
                {template.description && (
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                )}
                
                {/* Rows preview */}
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {template.rows.map((row, idx) => (
                    <div key={row.id || idx} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate flex-1">
                        {row.sub_item_name}
                      </span>
                      <span className="tabular-nums text-foreground">
                        {formatCurrency(row.default_qty * row.default_price)}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium text-foreground">Total:</span>
                  <span className="font-semibold text-primary tabular-nums">
                    {formatCurrency(templateTotal)}
                  </span>
                </div>
              </div>
              
              {hasExistingItems && (
                <p className="text-sm text-warning">
                  ⚠️ Existing costing items will be replaced.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleSkip}>
            Skip
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleApply}>
            Apply Template
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
