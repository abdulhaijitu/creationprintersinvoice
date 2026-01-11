/**
 * Centralized query configuration for optimized data fetching
 * Prevents unnecessary refetches and provides consistent caching behavior
 */

import { QueryClient } from '@tanstack/react-query';

// Stale times for different data types
export const STALE_TIMES = {
  /** Static data that rarely changes */
  STATIC: 1000 * 60 * 30, // 30 minutes
  /** User/organization data */
  USER_DATA: 1000 * 60 * 5, // 5 minutes  
  /** List data (customers, invoices, etc.) */
  LIST_DATA: 1000 * 60 * 2, // 2 minutes
  /** Dashboard/stats data */
  DASHBOARD: 1000 * 60 * 1, // 1 minute
  /** Real-time sensitive data */
  REALTIME: 1000 * 30, // 30 seconds
} as const;

// Cache times (how long to keep data after it becomes unused)
export const CACHE_TIMES = {
  DEFAULT: 1000 * 60 * 10, // 10 minutes
  LONG: 1000 * 60 * 30, // 30 minutes
  SHORT: 1000 * 60 * 2, // 2 minutes
} as const;

/**
 * Creates a configured QueryClient with optimal settings
 * - Prevents unnecessary refetches on window focus when data is fresh
 * - Provides consistent retry behavior
 * - Optimizes for perceived performance
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Only refetch on window focus if data is stale
        refetchOnWindowFocus: false,
        // Don't refetch when component remounts with fresh data
        refetchOnMount: false,
        // Retry failed requests once
        retry: 1,
        retryDelay: 1000,
        // Keep data fresh for 2 minutes by default
        staleTime: STALE_TIMES.LIST_DATA,
        // Keep unused data in cache for 10 minutes
        gcTime: CACHE_TIMES.DEFAULT,
        // Show stale data while refetching
        placeholderData: (previousData: unknown) => previousData,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// Query keys factory for consistent key management
export const queryKeys = {
  // Organization data
  organization: (orgId: string) => ['organization', orgId] as const,
  organizationMembers: (orgId: string) => ['organization-members', orgId] as const,
  
  // Business data
  customers: (orgId: string) => ['customers', orgId] as const,
  customer: (orgId: string, customerId: string) => ['customer', orgId, customerId] as const,
  
  invoices: (orgId: string) => ['invoices', orgId] as const,
  invoice: (orgId: string, invoiceId: string) => ['invoice', orgId, invoiceId] as const,
  
  quotations: (orgId: string) => ['quotations', orgId] as const,
  quotation: (orgId: string, quotationId: string) => ['quotation', orgId, quotationId] as const,
  
  expenses: (orgId: string) => ['expenses', orgId] as const,
  vendors: (orgId: string) => ['vendors', orgId] as const,
  
  // HR data
  employees: (orgId: string) => ['employees', orgId] as const,
  attendance: (orgId: string, date?: string) => ['attendance', orgId, date] as const,
  leave: (orgId: string) => ['leave', orgId] as const,
  salary: (orgId: string, month?: string) => ['salary', orgId, month] as const,
  
  // Tasks
  tasks: (orgId: string) => ['tasks', orgId] as const,
  
  // Team
  teamMembers: (orgId: string) => ['team-members', orgId] as const,
  teamInvites: (orgId: string) => ['team-invites', orgId] as const,
  
  // Dashboard
  dashboardStats: (orgId: string) => ['dashboard-stats', orgId] as const,
  
  // Delivery
  challans: (orgId: string) => ['challans', orgId] as const,
} as const;
