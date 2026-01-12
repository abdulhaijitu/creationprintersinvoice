import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgScopedQuery } from '@/hooks/useOrgScopedQuery';

export interface WeeklyHoliday {
  id: string;
  organization_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const WEEKDAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
] as const;

export const useWeeklyHolidays = () => {
  const { organizationId, hasOrgContext } = useOrgScopedQuery();
  const [weeklyHolidays, setWeeklyHolidays] = useState<WeeklyHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchWeeklyHolidays = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch ALL weekly holiday records (not just active ones) so we can toggle them
      const { data, error } = await supabase
        .from('weekly_holidays')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) throw error;
      setWeeklyHolidays(data || []);
    } catch (error) {
      console.error('Error fetching weekly holidays:', error);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (hasOrgContext && organizationId) {
      fetchWeeklyHolidays();
    }
  }, [hasOrgContext, organizationId, fetchWeeklyHolidays]);

  /**
   * Get array of active holiday day numbers (0-6)
   */
  const getHolidayDays = useCallback((): number[] => {
    return weeklyHolidays.filter(h => h.is_active).map(h => h.day_of_week);
  }, [weeklyHolidays]);

  /**
   * Check if a specific date is a weekly holiday
   */
  const isWeeklyHoliday = useCallback((date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return weeklyHolidays.some(h => h.day_of_week === dayOfWeek && h.is_active);
  }, [weeklyHolidays]);

  /**
   * Check if a specific day number (0-6) is configured as a weekly holiday
   */
  const isDayHoliday = useCallback((dayOfWeek: number): boolean => {
    return weeklyHolidays.some(h => h.day_of_week === dayOfWeek && h.is_active);
  }, [weeklyHolidays]);

  /**
   * Toggle a weekday as holiday
   * Returns { success: boolean, wasHoliday: boolean } to indicate the previous state
   */
  const toggleHoliday = useCallback(async (dayOfWeek: number): Promise<{ success: boolean; wasHoliday: boolean }> => {
    if (!organizationId) return { success: false, wasHoliday: false };

    setSaving(true);
    try {
      const existingHoliday = weeklyHolidays.find(h => h.day_of_week === dayOfWeek);
      const wasHoliday = existingHoliday?.is_active ?? false;

      if (existingHoliday) {
        // Toggle existing record
        const { error } = await supabase
          .from('weekly_holidays')
          .update({ is_active: !existingHoliday.is_active })
          .eq('id', existingHoliday.id);

        if (error) throw error;
      } else {
        // Create new record using upsert to handle race conditions
        const { error } = await supabase
          .from('weekly_holidays')
          .upsert({
            organization_id: organizationId,
            day_of_week: dayOfWeek,
            is_active: true,
          }, {
            onConflict: 'organization_id,day_of_week',
          });

        if (error) throw error;
      }

      await fetchWeeklyHolidays();
      return { success: true, wasHoliday };
    } catch (error) {
      console.error('Error toggling weekly holiday:', error);
      return { success: false, wasHoliday: false };
    } finally {
      setSaving(false);
    }
  }, [organizationId, weeklyHolidays, fetchWeeklyHolidays]);

  /**
   * Set multiple days as holidays at once
   */
  const setHolidays = useCallback(async (dayNumbers: number[]): Promise<boolean> => {
    if (!organizationId) return false;

    setSaving(true);
    try {
      // Deactivate all existing holidays first
      await supabase
        .from('weekly_holidays')
        .update({ is_active: false })
        .eq('organization_id', organizationId);

      // Create/activate selected days
      for (const dayOfWeek of dayNumbers) {
        const { error } = await supabase
          .from('weekly_holidays')
          .upsert({
            organization_id: organizationId,
            day_of_week: dayOfWeek,
            is_active: true,
          }, {
            onConflict: 'organization_id,day_of_week',
          });

        if (error) throw error;
      }

      await fetchWeeklyHolidays();
      return true;
    } catch (error) {
      console.error('Error setting weekly holidays:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [organizationId, fetchWeeklyHolidays]);

  /**
   * Get the weekday label for a day number
   */
  const getWeekdayLabel = (dayOfWeek: number): string => {
    return WEEKDAYS.find(w => w.value === dayOfWeek)?.label || '';
  };

  return {
    weeklyHolidays,
    loading,
    saving,
    isWeeklyHoliday,
    isDayHoliday,
    getHolidayDays,
    toggleHoliday,
    setHolidays,
    getWeekdayLabel,
    refetch: fetchWeeklyHolidays,
  };
};
