import {
  LayoutDashboard,
  FileText,
  FileCheck,
  Calculator,
  Wallet,
  Users,
  CalendarCheck,
  Receipt,
  ClipboardList,
  Award,
  ListTodo,
  Building2,
  LogOut,
  ChevronDown,
  User,
  BarChart3,
  Settings,
  UserCog,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, getRoleDisplayName } from '@/lib/permissions';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItemProps {
  item: { title: string; url: string; icon: React.ElementType };
  isActive: boolean;
}

const NavItem = ({ item, isActive }: NavItemProps) => {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <NavLink to={item.url} className="flex items-center gap-3">
          <item.icon className="h-4 w-4" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

interface NavGroupProps {
  label: string;
  items: { title: string; url: string; icon: React.ElementType }[];
  defaultOpen?: boolean;
}

const NavGroup = ({ label, items, defaultOpen = false }: NavGroupProps) => {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const isGroupActive = items.some((item) => location.pathname === item.url);

  if (items.length === 0) return null;

  if (collapsed) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <NavItem
                key={item.url}
                item={item}
                isActive={location.pathname === item.url}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <Collapsible defaultOpen={defaultOpen || isGroupActive} className="group/collapsible">
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent rounded-md px-2 py-1.5 flex items-center justify-between">
            {label}
            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <NavItem
                  key={item.url}
                  item={item}
                  isActive={location.pathname === item.url}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
};

export function AppSidebar() {
  const location = useLocation();
  const { user, signOut, role } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  // Build navigation items based on permissions
  const mainNavItems = [
    { title: 'ড্যাশবোর্ড', url: '/', icon: LayoutDashboard },
    ...(hasPermission(role, 'reports', 'view') ? [{ title: 'রিপোর্ট', url: '/reports', icon: BarChart3 }] : []),
    ...(hasPermission(role, 'settings', 'view') ? [{ title: 'সেটিংস', url: '/settings', icon: Settings }] : []),
    ...(hasPermission(role, 'user_roles', 'view') ? [{ title: 'রোল ম্যানেজমেন্ট', url: '/user-roles', icon: UserCog }] : []),
  ];

  const invoicingItems = [
    ...(hasPermission(role, 'customers', 'view') ? [{ title: 'গ্রাহক তালিকা', url: '/customers', icon: Users }] : []),
    ...(hasPermission(role, 'invoices', 'view') ? [{ title: 'ইনভয়েস', url: '/invoices', icon: FileText }] : []),
    ...(hasPermission(role, 'quotations', 'view') ? [{ title: 'কোটেশন', url: '/quotations', icon: FileCheck }] : []),
    ...(hasPermission(role, 'price_calculations', 'view') ? [{ title: 'মূল্য হিসাব', url: '/price-calculation', icon: Calculator }] : []),
  ];

  const expenseItems = [
    ...(hasPermission(role, 'expenses', 'view') ? [{ title: 'দৈনিক খরচ', url: '/expenses', icon: Wallet }] : []),
    ...(hasPermission(role, 'vendors', 'view') ? [{ title: 'ভেন্ডর', url: '/vendors', icon: Building2 }] : []),
  ];

  const hrItems = [
    ...(hasPermission(role, 'employees', 'view') ? [{ title: 'কর্মচারী', url: '/employees', icon: Users }] : []),
    ...(hasPermission(role, 'attendance', 'view') ? [{ title: 'উপস্থিতি', url: '/attendance', icon: CalendarCheck }] : []),
    ...(hasPermission(role, 'salary', 'view') ? [{ title: 'বেতন', url: '/salary', icon: Receipt }] : []),
    ...(hasPermission(role, 'leave', 'view') ? [{ title: 'ছুটি', url: '/leave', icon: ClipboardList }] : []),
    ...(hasPermission(role, 'performance', 'view') ? [{ title: 'পারফরম্যান্স', url: '/performance', icon: Award }] : []),
    ...(hasPermission(role, 'tasks', 'view') ? [{ title: 'টাস্ক', url: '/tasks', icon: ListTodo }] : []),
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow shrink-0">
            <span className="text-primary-foreground font-bold text-lg">C</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">Creation Printers</span>
              <span className="text-xs text-sidebar-foreground/60">
                {role ? getRoleDisplayName(role) : 'লোড হচ্ছে...'}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <NavItem
                  key={item.url}
                  item={item}
                  isActive={location.pathname === item.url}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {invoicingItems.length > 0 && <NavGroup label="ইনভয়েসিং" items={invoicingItems} defaultOpen />}
        {expenseItems.length > 0 && <NavGroup label="খরচ" items={expenseItems} />}
        {hrItems.length > 0 && <NavGroup label="এইচআর" items={hrItems} />}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {user?.email ? getInitials(user.email) : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.email}
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent"
            title="লগআউট"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
