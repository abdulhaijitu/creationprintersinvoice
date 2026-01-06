import { useOrganization } from '@/contexts/OrganizationContext';

// Hook to get the current organization ID for queries
export const useOrganizationId = () => {
  const { organization } = useOrganization();
  return organization?.id || null;
};

// Hook to get organization data for inserting records
export const useOrganizationData = () => {
  const { organization, orgRole, isOrgAdmin, isOrgOwner, subscription } = useOrganization();
  
  return {
    organizationId: organization?.id || null,
    organization,
    orgRole,
    isOrgAdmin,
    isOrgOwner,
    subscription,
    // Helper to add organization_id to insert data
    withOrgId: <T extends Record<string, any>>(data: T): T & { organization_id: string | null } => ({
      ...data,
      organization_id: organization?.id || null,
    }),
  };
};
