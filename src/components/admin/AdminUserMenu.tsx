import { useState } from 'react';
import { LogOut, KeyRound, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAdminRole, getAdminRoleDisplayName } from '@/lib/adminPermissions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminUserMenuProps {
  collapsed?: boolean;
  onSignOut: () => void;
}

export const AdminUserMenu = ({ collapsed = false, onSignOut }: AdminUserMenuProps) => {
  const { user, role } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const isMobile = useIsMobile();

  const adminRole = getAdminRole(role);
  const roleDisplayName = getAdminRoleDisplayName(adminRole);
  
  const adminInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'SA';

  const MenuContent = (
    <>
      <DropdownMenuLabel className="font-normal">
        <div className="flex flex-col space-y-1">
          <p className="text-sm font-medium leading-none">{roleDisplayName}</p>
          <p className="text-xs leading-none text-muted-foreground truncate max-w-[180px]">
            {user?.email || 'admin@printosaas.com'}
          </p>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem 
        onClick={() => setChangePasswordOpen(true)}
        className="cursor-pointer gap-2"
      >
        <KeyRound className="h-4 w-4" />
        <span>Change Password</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem 
        onClick={onSignOut}
        className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
      >
        <LogOut className="h-4 w-4" />
        <span>Sign Out</span>
      </DropdownMenuItem>
    </>
  );

  return (
    <>
      <DropdownMenu>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'h-10 w-10 rounded-full p-0 hover:bg-sidebar-accent',
                  !collapsed && 'w-full justify-start gap-3 px-2'
                )}
                aria-label="User menu"
              >
                <Avatar className="h-8 w-8 border border-sidebar-border shrink-0">
                  <AvatarFallback className="bg-sidebar-primary/20 text-sm font-medium text-sidebar-primary">
                    {adminInitials}
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-xs font-medium text-sidebar-foreground truncate">
                      {roleDisplayName}
                    </span>
                    <span className="text-[10px] text-sidebar-muted truncate max-w-[140px]">
                      {user?.email?.split('@')[0]}
                    </span>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" sideOffset={10}>
              <div>
                <p className="font-medium">{roleDisplayName}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </TooltipContent>
          )}
        </Tooltip>
        <DropdownMenuContent 
          align={collapsed ? "center" : "start"}
          side={isMobile ? "top" : "right"}
          sideOffset={8}
          className="w-56 bg-popover z-50"
        >
          {MenuContent}
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </>
  );
};
