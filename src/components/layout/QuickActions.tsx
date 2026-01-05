import { Plus, FileText, Users, FileCheck, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission } from '@/lib/permissions';

export const QuickActions = () => {
  const navigate = useNavigate();
  const { role } = useAuth();

  const actions = [
    {
      label: 'New Invoice',
      icon: FileText,
      onClick: () => navigate('/invoices/new'),
      permission: hasPermission(role, 'invoices', 'create'),
    },
    {
      label: 'New Customer',
      icon: Users,
      onClick: () => navigate('/customers'),
      permission: hasPermission(role, 'customers', 'create'),
    },
    {
      label: 'New Quotation',
      icon: FileCheck,
      onClick: () => navigate('/quotations/new'),
      permission: hasPermission(role, 'quotations', 'create'),
    },
    {
      label: 'Add Expense',
      icon: Wallet,
      onClick: () => navigate('/expenses'),
      permission: hasPermission(role, 'expenses', 'create'),
    },
  ].filter(action => action.permission);

  if (actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="hidden sm:flex gap-1.5">
          <Plus className="h-4 w-4" />
          Quick Create
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Create New</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action) => (
          <DropdownMenuItem key={action.label} onClick={action.onClick}>
            <action.icon className="h-4 w-4 mr-2" />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
