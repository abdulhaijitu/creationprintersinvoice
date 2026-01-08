import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { 
  Search, 
  RefreshCw, 
  History, 
  ChevronLeft, 
  ChevronRight,
  User,
  Bot,
  Eye,
  FileText,
  CreditCard,
  Users,
  Package,
  Settings,
  Download,
  Upload,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuditLog {
  id: string;
  timestamp: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  actor_type: string;
  action_type: string;
  action_label: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  source: string;
  metadata: Record<string, unknown> | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
}

const ACTION_TYPE_COLORS: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
  update: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  access: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  export: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
  import: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300',
  login: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  logout: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  invoice: <FileText className="h-4 w-4" />,
  payment: <CreditCard className="h-4 w-4" />,
  customer: <Users className="h-4 w-4" />,
  quotation: <Package className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  export: <Download className="h-4 w-4" />,
  import: <Upload className="h-4 w-4" />,
};

const ITEMS_PER_PAGE = 20;

export const OrgAuditLogViewer: React.FC = () => {
  const { organization, isOrgAdmin } = useOrganization();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Detail view
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('enhanced_audit_logs')
        .select('*', { count: 'exact' })
        .eq('organization_id', organization.id)
        .order('timestamp', { ascending: false });

      // Apply filters
      if (actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter as 'login' | 'logout' | 'login_failed' | 'create' | 'update' | 'delete' | 'access' | 'suspend' | 'activate' | 'configure' | 'export' | 'import');
      }
      if (entityFilter !== 'all') {
        query = query.eq('entity_type', entityFilter);
      }
      if (dateFrom) {
        query = query.gte('timestamp', dateFrom);
      }
      if (dateTo) {
        query = query.lte('timestamp', dateTo + 'T23:59:59');
      }
      if (searchQuery) {
        query = query.or(`action_label.ilike.%${searchQuery}%,entity_name.ilike.%${searchQuery}%,actor_email.ilike.%${searchQuery}%`);
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      setLogs((data || []) as AuditLog[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [organization?.id, actionFilter, entityFilter, dateFrom, dateTo, searchQuery, currentPage]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const clearFilters = () => {
    setSearchQuery('');
    setActionFilter('all');
    setEntityFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || actionFilter !== 'all' || entityFilter !== 'all' || dateFrom || dateTo;

  if (!isOrgAdmin) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h4 className="font-medium text-muted-foreground">Access Restricted</h4>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Only organization admins can view audit logs
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Activity Log</h3>
                  <p className="text-sm text-muted-foreground">
                    {totalCount.toLocaleString()} events recorded
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={fetchLogs}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search actions..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-10"
                />
              </div>
              
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="export">Export</SelectItem>
                  <SelectItem value="import">Import</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                placeholder="From"
              />

              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                placeholder="To"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h4 className="font-medium text-muted-foreground">No activity found</h4>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {hasActiveFilters ? 'Try adjusting your filters' : 'Activity will appear here'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-[160px]">Time</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow 
                        key={log.id} 
                        className="group cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSelectedLog(log); setDetailOpen(true); }}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs font-medium', ACTION_TYPE_COLORS[log.action_type] || 'bg-muted')}>
                            {log.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {ENTITY_ICONS[log.entity_type] || <FileText className="h-4 w-4 text-muted-foreground" />}
                            <span className="text-sm truncate max-w-[250px]">{log.action_label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {log.actor_type === 'system' ? (
                              <Bot className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm truncate max-w-[150px]">
                              {log.actor_email || 'System'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); setSelectedLog(log); setDetailOpen(true); }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm px-2">{currentPage} / {totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Event Details
            </SheetTitle>
            <SheetDescription>
              {selectedLog && format(new Date(selectedLog.timestamp), 'MMMM d, yyyy \'at\' HH:mm:ss')}
            </SheetDescription>
          </SheetHeader>

          {selectedLog && (
            <div className="mt-6 space-y-6">
              {/* Action Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Action</h4>
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <Badge className={cn('text-xs', ACTION_TYPE_COLORS[selectedLog.action_type])}>
                    {selectedLog.action_type}
                  </Badge>
                  <p className="text-sm">{selectedLog.action_label}</p>
                </div>
              </div>

              <Separator />

              {/* Actor Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Performed By</h4>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-background">
                      {selectedLog.actor_type === 'system' ? (
                        <Bot className="h-5 w-5" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{selectedLog.actor_email || 'System'}</p>
                      {selectedLog.actor_role && (
                        <p className="text-sm text-muted-foreground capitalize">{selectedLog.actor_role}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Entity Info */}
              {selectedLog.entity_name && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Entity</h4>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm capitalize">{selectedLog.entity_type}</p>
                      <p className="font-medium">{selectedLog.entity_name}</p>
                      {selectedLog.entity_id && (
                        <p className="text-xs text-muted-foreground font-mono mt-1">{selectedLog.entity_id}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Metadata */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Additional Data</h4>
                    <pre className="p-4 rounded-lg bg-muted/50 text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
