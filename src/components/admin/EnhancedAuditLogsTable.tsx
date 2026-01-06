import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getAdminRole } from '@/lib/adminPermissions';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { 
  Search, 
  RefreshCw, 
  History, 
  ChevronLeft, 
  ChevronRight,
  User,
  Bot,
  Globe,
  Calendar,
  Filter,
  Eye,
  ArrowUpDown,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedAuditLog {
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
  organization_id: string | null;
  organization_name: string | null;
  source: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_TYPE_COLORS: Record<string, string> = {
  login: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
  logout: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  login_failed: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  create: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  update: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  access: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
  suspend: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  activate: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  configure: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
  export: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
  import: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300',
};

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  ui: <User className="h-3.5 w-3.5" />,
  api: <Globe className="h-3.5 w-3.5" />,
  system: <Bot className="h-3.5 w-3.5" />,
  edge_function: <Bot className="h-3.5 w-3.5" />,
  webhook: <Globe className="h-3.5 w-3.5" />,
};

const ITEMS_PER_PAGE = 25;

export const EnhancedAuditLogsTable = () => {
  const { role } = useAuth();
  const adminRole = getAdminRole(role);
  
  const [logs, setLogs] = useState<EnhancedAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Detail view
  const [selectedLog, setSelectedLog] = useState<EnhancedAuditLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('enhanced_audit_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false });

      // Apply filters
      if (actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter as 'login' | 'logout' | 'login_failed' | 'create' | 'update' | 'delete' | 'access' | 'suspend' | 'activate' | 'configure' | 'export' | 'import');
      }
      if (entityFilter !== 'all') {
        query = query.eq('entity_type', entityFilter);
      }
      if (sourceFilter !== 'all') {
        query = query.eq('source', sourceFilter as 'ui' | 'api' | 'system' | 'edge_function' | 'webhook');
      }
      if (dateFrom) {
        query = query.gte('timestamp', dateFrom);
      }
      if (dateTo) {
        query = query.lte('timestamp', dateTo + 'T23:59:59');
      }
      if (searchQuery) {
        query = query.or(`action_label.ilike.%${searchQuery}%,entity_name.ilike.%${searchQuery}%,actor_email.ilike.%${searchQuery}%,entity_id.ilike.%${searchQuery}%`);
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      setLogs((data || []) as EnhancedAuditLog[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter, sourceFilter, dateFrom, dateTo, searchQuery, currentPage]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const clearFilters = () => {
    setSearchQuery('');
    setActionFilter('all');
    setEntityFilter('all');
    setSourceFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || actionFilter !== 'all' || entityFilter !== 'all' || sourceFilter !== 'all' || dateFrom || dateTo;

  const handleViewDetails = (log: EnhancedAuditLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  const getActorDisplay = (log: EnhancedAuditLog) => {
    if (log.actor_type === 'system') {
      return (
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">System</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        <span className="text-sm font-medium">{log.actor_email || 'Unknown'}</span>
        {log.actor_role && (
          <span className="text-xs text-muted-foreground capitalize">{log.actor_role.replace('_', ' ')}</span>
        )}
      </div>
    );
  };

  const uniqueActionTypes = Array.from(new Set(logs.map(l => l.action_type))).filter(Boolean);
  const uniqueEntityTypes = Array.from(new Set(logs.map(l => l.entity_type))).filter(Boolean);

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
                  <h3 className="font-semibold text-lg">Audit Logs</h3>
                  <p className="text-sm text-muted-foreground">
                    {totalCount.toLocaleString()} total events
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={fetchLogs}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by action, entity, or actor..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-10"
                />
              </div>
              
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Action Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {['login', 'logout', 'login_failed', 'create', 'update', 'delete', 'access', 'suspend', 'activate', 'configure', 'export', 'import'].map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setCurrentPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Entity Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {['organization', 'subscription', 'billing', 'user_role', 'whitelabel', 'configuration', 'authentication'].map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {entity.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                placeholder="From date"
              />

              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                placeholder="To date"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h4 className="font-medium text-muted-foreground">No audit logs found</h4>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {hasActiveFilters ? 'Try adjusting your filters' : 'Audit events will appear here'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead className="w-[80px]">Source</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow 
                        key={log.id} 
                        className="group cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => handleViewDetails(log)}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs font-medium', ACTION_TYPE_COLORS[log.action_type] || 'bg-muted')}>
                            {log.action_type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <span className="text-sm truncate block">{log.action_label}</span>
                        </TableCell>
                        <TableCell>{getActorDisplay(log)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm capitalize">{log.entity_type.replace(/_/g, ' ')}</span>
                            {log.entity_name && (
                              <span className="text-xs text-muted-foreground truncate max-w-[150px]">{log.entity_name}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            {SOURCE_ICONS[log.source] || <Globe className="h-3.5 w-3.5" />}
                            <span className="text-xs capitalize">{log.source.replace(/_/g, ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); handleViewDetails(log); }}
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
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1 px-2">
                      <span className="text-sm font-medium">{currentPage}</span>
                      <span className="text-sm text-muted-foreground">of {totalPages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
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
              Audit Log Details
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
                  <div className="flex items-center gap-2">
                    <Badge className={cn('text-xs', ACTION_TYPE_COLORS[selectedLog.action_type])}>
                      {selectedLog.action_type.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {selectedLog.source}
                    </Badge>
                  </div>
                  <p className="text-sm">{selectedLog.action_label}</p>
                </div>
              </div>

              <Separator />

              {/* Actor Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Actor</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <span className="text-sm font-medium capitalize">{selectedLog.actor_type}</span>
                  </div>
                  {selectedLog.actor_email && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Email</span>
                      <span className="text-sm font-medium">{selectedLog.actor_email}</span>
                    </div>
                  )}
                  {selectedLog.actor_role && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Role</span>
                      <span className="text-sm font-medium capitalize">{selectedLog.actor_role.replace('_', ' ')}</span>
                    </div>
                  )}
                  {selectedLog.ip_address && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">IP Address</span>
                      <span className="text-sm font-mono">{selectedLog.ip_address}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Entity Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Entity</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <span className="text-sm font-medium capitalize">{selectedLog.entity_type.replace(/_/g, ' ')}</span>
                  </div>
                  {selectedLog.entity_name && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Name</span>
                      <span className="text-sm font-medium">{selectedLog.entity_name}</span>
                    </div>
                  )}
                  {selectedLog.entity_id && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">ID</span>
                      <span className="text-sm font-mono text-xs">{selectedLog.entity_id}</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedLog.organization_name && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Organization</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Name</span>
                        <span className="text-sm font-medium">{selectedLog.organization_name}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Before/After States */}
              {(selectedLog.before_state || selectedLog.after_state) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Changes</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedLog.before_state && (
                        <div className="space-y-2">
                          <span className="text-xs font-medium text-muted-foreground">Before</span>
                          <pre className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-xs overflow-auto max-h-40">
                            {JSON.stringify(selectedLog.before_state, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedLog.after_state && (
                        <div className="space-y-2">
                          <span className="text-xs font-medium text-muted-foreground">After</span>
                          <pre className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-xs overflow-auto max-h-40">
                            {JSON.stringify(selectedLog.after_state, null, 2)}
                          </pre>
                        </div>
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
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Metadata</h4>
                    <pre className="p-3 rounded-lg bg-muted text-xs overflow-auto max-h-40">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </>
              )}

              {/* User Agent */}
              {selectedLog.user_agent && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">User Agent</h4>
                    <p className="text-xs text-muted-foreground break-all">{selectedLog.user_agent}</p>
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

export default EnhancedAuditLogsTable;
