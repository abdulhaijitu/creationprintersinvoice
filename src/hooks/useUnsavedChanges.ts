import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface UseUnsavedChangesOptions {
  /** Initial form values to compare against */
  initialValues?: Record<string, unknown>;
  /** Current form values */
  currentValues?: Record<string, unknown>;
  /** Whether unsaved changes guard is enabled (disable for read-only mode) */
  enabled?: boolean;
  /** Custom comparison function */
  compareValues?: (initial: Record<string, unknown>, current: Record<string, unknown>) => boolean;
}

export interface UseUnsavedChangesReturn {
  /** Whether the form has unsaved changes */
  isDirty: boolean;
  /** Set dirty state manually */
  setIsDirty: (dirty: boolean) => void;
  /** Mark form as clean (after save) */
  markAsClean: () => void;
  /** Mark form as dirty (on change) */
  markAsDirty: () => void;
  /** Whether tab switch warning should be shown */
  showTabSwitchWarning: boolean;
  /** Pending tab to switch to */
  pendingTab: string | null;
  /** Request tab switch (shows warning if dirty) */
  requestTabSwitch: (newTab: string) => boolean;
  /** Confirm tab switch */
  confirmTabSwitch: () => void;
  /** Cancel tab switch */
  cancelTabSwitch: () => void;
}

/**
 * Hook for managing unsaved changes with navigation blocking
 * 
 * Features:
 * - Tracks dirty state of form
 * - Warns before browser tab close when dirty
 * - Provides tab switch warning for multi-tab forms
 * 
 * Note: Uses beforeunload for browser navigation warning (back/forward/close)
 * For in-app route changes, components should check isDirty before navigating
 */
export const useUnsavedChanges = (options: UseUnsavedChangesOptions = {}): UseUnsavedChangesReturn => {
  const { 
    initialValues, 
    currentValues, 
    enabled = true,
    compareValues,
  } = options;

  const [isDirty, setIsDirty] = useState(false);
  const [showTabSwitchWarning, setShowTabSwitchWarning] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  
  // Store initial values for comparison
  const initialValuesRef = useRef<Record<string, unknown> | undefined>(initialValues);

  // Auto-detect dirty state from value comparison
  useEffect(() => {
    if (!enabled || !initialValuesRef.current || !currentValues) return;

    const hasChanges = compareValues 
      ? !compareValues(initialValuesRef.current, currentValues)
      : JSON.stringify(initialValuesRef.current) !== JSON.stringify(currentValues);
    
    setIsDirty(hasChanges);
  }, [currentValues, compareValues, enabled]);

  // Update initial values ref when they change
  useEffect(() => {
    if (initialValues) {
      initialValuesRef.current = initialValues;
    }
  }, [initialValues]);

  // Browser tab close/refresh warning
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        // Modern browsers require returnValue to be set
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, enabled]);

  // Tab switch handling
  const requestTabSwitch = useCallback((newTab: string): boolean => {
    if (!enabled || !isDirty) {
      return true; // Allow switch
    }
    
    // Show warning
    setPendingTab(newTab);
    setShowTabSwitchWarning(true);
    return false; // Block switch until confirmed
  }, [isDirty, enabled]);

  const confirmTabSwitch = useCallback(() => {
    setShowTabSwitchWarning(false);
    setPendingTab(null);
    setIsDirty(false);
  }, []);

  const cancelTabSwitch = useCallback(() => {
    setShowTabSwitchWarning(false);
    setPendingTab(null);
  }, []);

  // Mark as clean (after successful save)
  const markAsClean = useCallback(() => {
    setIsDirty(false);
    initialValuesRef.current = currentValues ? { ...currentValues } : undefined;
  }, [currentValues]);

  // Mark as dirty (on change)
  const markAsDirty = useCallback(() => {
    if (enabled) {
      setIsDirty(true);
    }
  }, [enabled]);

  return {
    isDirty,
    setIsDirty,
    markAsClean,
    markAsDirty,
    showTabSwitchWarning,
    pendingTab,
    requestTabSwitch,
    confirmTabSwitch,
    cancelTabSwitch,
  };
};
