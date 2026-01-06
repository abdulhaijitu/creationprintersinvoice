import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  CreditCard,
  Palette,
  Bell,
  ScrollText,
  Clock,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAdminRole, canAccessSection } from "@/lib/adminPermissions";

interface AdminCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

interface CommandItemData {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  page: string;
  keywords: string[];
}

const allNavigationCommands: CommandItemData[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Overview metrics and stats",
    icon: LayoutDashboard,
    page: "dashboard",
    keywords: ["home", "overview", "metrics", "stats"],
  },
  {
    id: "organizations",
    label: "Organizations",
    description: "Manage all organizations",
    icon: Building2,
    page: "organizations",
    keywords: ["tenants", "companies", "accounts", "customers"],
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Platform analytics and insights",
    icon: BarChart3,
    page: "analytics",
    keywords: ["reports", "charts", "data", "insights"],
  },
  {
    id: "billing",
    label: "Billing",
    description: "Invoices and payments",
    icon: CreditCard,
    page: "billing",
    keywords: ["invoices", "payments", "subscriptions", "revenue"],
  },
  {
    id: "whitelabel",
    label: "White-Label",
    description: "Branding and customization",
    icon: Palette,
    page: "whitelabel",
    keywords: ["branding", "customization", "themes", "domains"],
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Notification logs and settings",
    icon: Bell,
    page: "notifications",
    keywords: ["alerts", "messages", "logs", "email", "sms"],
  },
  {
    id: "audit",
    label: "Audit Logs",
    description: "Activity and security logs",
    icon: ScrollText,
    page: "audit",
    keywords: ["logs", "activity", "security", "history", "tracking"],
  },
  {
    id: "investor",
    label: "Investor Metrics",
    description: "SaaS metrics for investors",
    icon: BarChart3,
    page: "investor",
    keywords: ["mrr", "arr", "churn", "saas", "revenue", "metrics"],
  },
];

const RECENT_COMMANDS_KEY = "admin-recent-commands";
const MAX_RECENT_COMMANDS = 3;

export function AdminCommandPalette({
  open,
  onOpenChange,
  onNavigate,
  currentPage,
}: AdminCommandPaletteProps) {
  const navigate = useNavigate();
  const { role } = useAuth();
  const adminRole = getAdminRole(role);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);

  // Filter navigation commands based on role
  const navigationCommands = useMemo(() => {
    return allNavigationCommands.filter(cmd => canAccessSection(adminRole, cmd.page));
  }, [adminRole]);

  // Load recent commands from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
    if (stored) {
      try {
        setRecentCommands(JSON.parse(stored));
      } catch {
        setRecentCommands([]);
      }
    }
  }, []);

  const saveRecentCommand = useCallback((commandId: string) => {
    setRecentCommands((prev) => {
      const filtered = prev.filter((id) => id !== commandId);
      const updated = [commandId, ...filtered].slice(0, MAX_RECENT_COMMANDS);
      localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleSelect = useCallback(
    (command: CommandItemData) => {
      saveRecentCommand(command.id);
      onNavigate(command.page);
      onOpenChange(false);
    },
    [saveRecentCommand, onNavigate, onOpenChange]
  );

  const recentCommandItems = recentCommands
    .map((id) => navigationCommands.find((cmd) => cmd.id === id))
    .filter((cmd): cmd is CommandItemData => cmd !== undefined);

  const otherCommands = navigationCommands.filter(
    (cmd) => !recentCommands.includes(cmd.id)
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search admin pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {recentCommandItems.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentCommandItems.map((command) => (
                <CommandItem
                  key={command.id}
                  value={`${command.label} ${command.keywords.join(" ")}`}
                  onSelect={() => handleSelect(command)}
                  className="group cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50 group-data-[selected=true]:bg-primary/10">
                      <command.icon className="h-4 w-4 text-muted-foreground group-data-[selected=true]:text-primary" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm">{command.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {command.description}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground/50" />
                    {currentPage === command.page && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Current
                      </span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-data-[selected=true]:opacity-100 transition-opacity" />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Navigation">
          {otherCommands.map((command) => (
            <CommandItem
              key={command.id}
              value={`${command.label} ${command.keywords.join(" ")}`}
              onSelect={() => handleSelect(command)}
              className="group cursor-pointer"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50 group-data-[selected=true]:bg-primary/10">
                  <command.icon className="h-4 w-4 text-muted-foreground group-data-[selected=true]:text-primary" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">{command.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {command.description}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentPage === command.page && (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Current
                  </span>
                )}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-data-[selected=true]:opacity-100 transition-opacity" />
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>

      <div className="border-t border-border/50 px-3 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">esc</kbd>
            close
          </span>
        </div>
      </div>
    </CommandDialog>
  );
}
