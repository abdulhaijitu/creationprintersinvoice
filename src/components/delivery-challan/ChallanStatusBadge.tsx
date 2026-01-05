import { StatusBadge } from '@/components/shared/StatusBadge';

type ChallanStatus = 'draft' | 'dispatched' | 'delivered' | 'cancelled';

interface ChallanStatusBadgeProps {
  status: ChallanStatus | string;
}

/**
 * @deprecated Use StatusBadge from '@/components/shared/StatusBadge' directly
 */
export function ChallanStatusBadge({ status }: ChallanStatusBadgeProps) {
  return <StatusBadge status={status} />;
}
