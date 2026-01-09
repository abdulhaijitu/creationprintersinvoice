import { User, Settings, LogOut, ChevronDown, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ORG_ROLE_DISPLAY } from '@/lib/permissions/constants';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const UserDropdown = () => {
  const { user, signOut, isSuperAdmin } = useAuth();
  const { membership, isOrgOwner, isOrgAdmin, isOrgManager } = useOrganization();
  const navigate = useNavigate();

  // Get the display role - prioritize organization membership role
  const getDisplayRole = (): string => {
    // Super admin takes precedence
    if (isSuperAdmin) return 'Super Admin';
    
    // Use organization membership role
    if (membership?.role) {
      return ORG_ROLE_DISPLAY[membership.role as keyof typeof ORG_ROLE_DISPLAY] || 'Member';
    }
    
    // Fallback based on organization context flags
    if (isOrgOwner) return 'Owner';
    if (isOrgAdmin) return 'Admin';
    if (isOrgManager) return 'Manager';
    
    return 'Member';
  };

  const displayRole = getDisplayRole();

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-8 gap-2 px-2 hover:bg-muted/50 transition-all duration-200"
        >
          <Avatar className="h-7 w-7 ring-1 ring-border/50 hover:ring-primary/30 transition-all duration-200">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
              {user?.email ? getInitials(user.email) : <User className="h-3 w-3" />}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col items-start text-left leading-tight">
            <span className="text-sm font-medium">
              {user?.email?.split('@')[0]}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {displayRole}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.email?.split('@')[0]}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        {(isSuperAdmin || isOrgOwner || isOrgAdmin) && (
          <DropdownMenuItem onClick={() => navigate('/user-roles')} className="cursor-pointer">
            <Shield className="mr-2 h-4 w-4" />
            <span>Role Management</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={signOut} 
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
