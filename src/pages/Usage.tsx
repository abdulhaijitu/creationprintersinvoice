import React from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { UsageDashboard } from '@/components/usage/UsageDashboard';
import { OrgContextGuard } from '@/components/guards/RouteGuard';

const Usage: React.FC = () => {
  return (
    <OrgContextGuard>
      <div className="space-y-6">
        <PageHeader
          title="Usage & Limits"
          description="Monitor your plan usage and manage your subscription limits"
        />
        <UsageDashboard />
      </div>
    </OrgContextGuard>
  );
};

export default Usage;
