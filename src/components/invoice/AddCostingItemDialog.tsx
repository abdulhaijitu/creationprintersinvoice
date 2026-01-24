/**
 * Dialog for adding a new custom costing item type
 * Opens when user clicks "+ Add New Item" in the costing item dropdown
 */

import { useState, useCallback } from 'react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

// Validation schema
const newItemSchema = z.object({
  itemName: z.string()
    .trim()
    .min(1, 'Item name is required')
    .max(50, 'Item name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Only letters, numbers, spaces, hyphens and underscores allowed'),
  description: z.string()
    .trim()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
});

interface AddCostingItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
  existingItems: string[];
  onSave: (itemValue: string, itemLabel: string, description?: string) => void;
}

export function AddCostingItemDialog({
  open,
  onOpenChange,
  initialQuery = '',
  existingItems,
  onSave,
}: AddCostingItemDialogProps) {
  const [itemName, setItemName] = useState(initialQuery);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ itemName?: string; description?: string }>({});

  // Reset form when dialog opens/closes
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (newOpen) {
      setItemName(initialQuery);
      setDescription('');
      setErrors({});
    }
    onOpenChange(newOpen);
  }, [initialQuery, onOpenChange]);

  // Validate and save
  const handleSave = useCallback(() => {
    // Clear previous errors
    setErrors({});

    // Validate
    const result = newItemSchema.safeParse({ itemName, description });
    
    if (!result.success) {
      const fieldErrors: { itemName?: string; description?: string } = {};
      result.error.errors.forEach(err => {
        if (err.path[0] === 'itemName') {
          fieldErrors.itemName = err.message;
        }
        if (err.path[0] === 'description') {
          fieldErrors.description = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Check for duplicates
    const normalizedValue = itemName.trim().toLowerCase().replace(/\s+/g, '_');
    if (existingItems.includes(normalizedValue)) {
      setErrors({ itemName: 'This item already exists' });
      return;
    }

    // Create item value and label
    const itemValue = normalizedValue;
    const itemLabel = itemName.trim();

    onSave(itemValue, itemLabel, description.trim() || undefined);
    handleOpenChange(false);
  }, [itemName, description, existingItems, onSave, handleOpenChange]);

  const handleCancel = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Add New Item
          </DialogTitle>
          <DialogDescription>
            নতুন costing item টাইপ যোগ করুন
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item Name */}
          <div className="space-y-2">
            <Label htmlFor="item-name" className="text-sm font-medium">
              Item Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="item-name"
              value={itemName}
              onChange={(e) => {
                setItemName(e.target.value);
                if (errors.itemName) setErrors(prev => ({ ...prev, itemName: undefined }));
              }}
              placeholder="e.g., Spot UV, Embossing"
              className={errors.itemName ? 'border-destructive' : ''}
              autoFocus
            />
            {errors.itemName && (
              <p className="text-xs text-destructive">{errors.itemName}</p>
            )}
          </div>

          {/* Description (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="item-description" className="text-sm font-medium">
              Description <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="item-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors(prev => ({ ...prev, description: undefined }));
              }}
              placeholder="এই item সম্পর্কে সংক্ষেপে লিখুন..."
              rows={2}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!itemName.trim()}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
