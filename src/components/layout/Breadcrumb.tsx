import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const routeLabels: Record<string, string> = {
  '': 'Dashboard',
  'customers': 'Customers',
  'invoices': 'Invoices',
  'quotations': 'Quotations',
  'delivery-challans': 'Delivery Challans',
  'price-calculation': 'Price Calculations',
  'vendors': 'Vendors',
  'expenses': 'Expenses',
  'employees': 'Employees',
  'attendance': 'Attendance',
  'leave': 'Leave Management',
  'salary': 'Payroll',
  'performance': 'Performance',
  'tasks': 'Tasks',
  'reports': 'Reports',
  'settings': 'Settings',
  'user-roles': 'Role Management',
  'new': 'New',
  'edit': 'Edit',
};

export const Breadcrumb = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Don't show breadcrumb on dashboard
  if (pathSegments.length === 0) {
    return null;
  }

  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const isLast = index === pathSegments.length - 1;
    
    // Check if segment is a UUID (detail page)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
    const label = isUuid ? 'Details' : (routeLabels[segment] || segment);

    return { path, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1 text-sm">
      <Link 
        to="/" 
        className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.path} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link 
              to={crumb.path}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
};
