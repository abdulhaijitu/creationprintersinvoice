/**
 * Shared formatting utilities for consistent data display across the app
 */

/**
 * Format a number as BDT currency
 */
export function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

/**
 * Format a large number for charts (e.g., 1000 -> 1K, 1000000 -> 1M)
 */
export function formatChartCurrency(value: number): string {
  if (value >= 1000000) {
    return `৳${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `৳${(value / 1000).toFixed(0)}K`;
  }
  return `৳${value}`;
}

/**
 * Get initials from a name (e.g., "John Doe" -> "JD")
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format a phone number for display
 */
export function formatPhone(phone: string | null): string {
  if (!phone) return '';
  // Simple formatting for BD phone numbers
  return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
}
