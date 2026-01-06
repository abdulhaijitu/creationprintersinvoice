import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { UsageDashboard } from '@/components/usage/UsageDashboard';

const Usage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Usage & Limits"
        description="Monitor your plan usage and manage your subscription limits"
      />
      <UsageDashboard />
    </div>
  );
};

export default Usage;
