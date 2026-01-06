import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface OrgOption {
  id: string;
  name: string;
  slug: string;
  role: string;
}

const ACTIVE_ORG_STORAGE_KEY = 'printosaas_active_organization_id';

export function OrganizationSwitcher() {
  const { user } = useAuth();
  const { organization, refetchOrganization } = useOrganization();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchOrgs = async () => {
      if (!user) {
        setOrgs([]);
        setLoading(false);
        return;
      }

      const { data: memberships, error } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .limit(25);

      if (error || !memberships || memberships.length === 0) {
        setOrgs([]);
        setLoading(false);
        return;
      }

      const orgIds = memberships.map((m) => m.organization_id);
      const roleMap = new Map(memberships.map((m) => [m.organization_id, m.role]));

      const { data: orgsData } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .in('id', orgIds);

      if (orgsData) {
        setOrgs(
          orgsData.map((o) => ({
            id: o.id,
            name: o.name,
            slug: o.slug,
            role: roleMap.get(o.id) || 'staff',
          }))
        );
      }
      setLoading(false);
    };

    fetchOrgs();
  }, [user]);

  const handleSelect = async (orgId: string) => {
    if (orgId === organization?.id) {
      setOpen(false);
      return;
    }

    try {
      localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, orgId);
    } catch {
      // localStorage might be unavailable
    }

    await refetchOrganization();
    setOpen(false);
  };

  // Hide switcher if single org or no orgs
  if (loading) {
    return (
      <div className="px-3 py-2">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  if (orgs.length <= 1) {
    return null;
  }

  const currentOrg = orgs.find((o) => o.id === organization?.id) || orgs[0];

  const trigger = (
    <PopoverTrigger asChild>
      <Button
        variant="ghost"
        role="combobox"
        aria-expanded={open}
        className={cn(
          "w-full justify-between text-left font-normal h-10 px-3 transition-all duration-200",
          "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent hover:border-slate-700 rounded-lg",
          collapsed && "justify-center p-0 w-10 h-10"
        )}
      >
        {collapsed ? (
          <Building2 className="h-4 w-4" />
        ) : (
          <>
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className="truncate">{currentOrg.name}</span>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </>
        )}
      </Button>
    </PopoverTrigger>
  );

  return (
    <div className="px-2 py-2">
      <Popover open={open} onOpenChange={setOpen}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent side="right">
              Switch Organization
            </TooltipContent>
          </Tooltip>
        ) : (
          trigger
        )}
        <PopoverContent className="w-64 p-1" align="start" side={collapsed ? 'right' : 'bottom'}>
          <div className="max-h-64 overflow-auto">
            {orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => handleSelect(org.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  "hover:bg-muted text-left",
                  org.id === organization?.id && "bg-muted font-medium"
                )}
              >
                <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{org.name}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">{org.role}</div>
                </div>
                {org.id === organization?.id && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
