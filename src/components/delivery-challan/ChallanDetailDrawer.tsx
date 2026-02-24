import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { 
  Printer, 
  Download, 
  Share2, 
  Mail, 
  MessageCircle, 
  ExternalLink, 
  Truck, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  Lock,
  Package,
  Calendar,
  Hash,
  ClipboardList
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ContentSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { DeliveryChallan, DeliveryChallanItem } from '@/hooks/useDeliveryChallans';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { openPrintPage } from '@/lib/pdfUtils';

interface ChallanDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challanId: string | null;
  onStatusChange?: (id: string, status: DeliveryChallan['status']) => void;
}

export function ChallanDetailDrawer({
  open,
  onOpenChange,
  challanId,
  onStatusChange,
}: ChallanDetailDrawerProps) {
  const navigate = useNavigate();
  const [challan, setChallan] = useState<DeliveryChallan | null>(null);
  const [items, setItems] = useState<DeliveryChallanItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (challanId && open) {
      fetchChallanDetails();
    }
  }, [challanId, open]);

  const fetchChallanDetails = async () => {
    if (!challanId) return;
    setLoading(true);
    try {
      const { data: challanData, error: challanError } = await supabase
        .from('delivery_challans')
        .select(`
          *,
          invoice:invoices(invoice_number, customer_id, customers(name, address, phone)),
          customers(name, address, phone)
        `)
        .eq('id', challanId)
        .single();

      if (challanError) throw challanError;
      
      // Type assertion to handle the nested customer phone
      const typedData = challanData as any;
      setChallan(typedData as DeliveryChallan);

      const { data: itemsData, error: itemsError } = await supabase
        .from('delivery_challan_items')
        .select('*')
        .eq('challan_id', challanId);

      if (itemsError) throw itemsError;
      setItems(itemsData as DeliveryChallanItem[]);
    } catch (error) {
      console.error('Error fetching challan details:', error);
    } finally {
      setLoading(false);
    }
  };

  const isLocked = challan?.status === 'delivered' || challan?.status === 'cancelled';
  const canPrint = challan?.status !== 'cancelled';
  const canShare = challan?.status !== 'cancelled';

  const handlePrint = () => {
    if (!canPrint || !challan) return;
    openPrintPage(`/delivery-challans/${challanId}/print`, 'challan', challan.challan_number);
  };

  const handleShare = (method: 'whatsapp' | 'email') => {
    if (!canShare) return;
    const challanUrl = `${window.location.origin}/delivery-challans/${challanId}`;
    const message = `Delivery Challan: ${challan?.challan_number}\nView: ${challanUrl}`;

    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      window.open(`mailto:?subject=Delivery Challan ${challan?.challan_number}&body=${encodeURIComponent(message)}`);
    }
  };

  const challanData = challan as any;
  const customerName = challanData?.customers?.name || challanData?.invoice?.customers?.name || 'N/A';
  const customerAddress = challanData?.delivery_address || challanData?.customers?.address || challanData?.invoice?.customers?.address || 'N/A';
  const customerPhone = challanData?.customers?.phone || challanData?.invoice?.customers?.phone || '';
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity), 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        {/* Premium Header */}
        <div className="sticky top-0 z-10 bg-background border-b">
          <SheetHeader className="p-4 md:p-6 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <SheetTitle className="text-base md:text-lg font-semibold truncate">
                    {loading ? 'Loading...' : 'Delivery Challan'}
                  </SheetTitle>
                  {!loading && challan && (
                    <p className="text-sm text-muted-foreground font-mono">
                      {challan.challan_number}
                    </p>
                  )}
                </div>
              </div>
              {!loading && challan && (
                <div className="flex items-center gap-2 shrink-0">
                  {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                  <StatusBadge status={challan.status} />
                </div>
              )}
            </div>
          </SheetHeader>

          {/* Quick Actions Bar */}
          {!loading && challan && (
            <div className="px-4 md:px-6 pb-4 flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint}
                disabled={!canPrint}
                className={cn("h-9", !canPrint && 'opacity-50 cursor-not-allowed')}
              >
                <Printer className="h-4 w-4 mr-1.5" />
                Print
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint}
                disabled={!canPrint}
                className={cn("h-9", !canPrint && 'opacity-50 cursor-not-allowed')}
              >
                <Download className="h-4 w-4 mr-1.5" />
                PDF
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={!canShare}
                    className={cn("h-9", !canShare && 'opacity-50 cursor-not-allowed')}
                  >
                    <Share2 className="h-4 w-4 mr-1.5" />
                    Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('email')}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-4 md:p-6">
            <ContentSkeleton />
          </div>
        ) : challan ? (
          <div className="p-4 md:p-6 space-y-6">
            {/* Info Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wide">Date</span>
                </div>
                <p className="font-semibold text-sm">
                  {format(new Date(challan.challan_date), 'dd MMM yyyy')}
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Hash className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium uppercase tracking-wide">Invoice</span>
                </div>
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold text-sm text-primary"
                  onClick={() => navigate(`/invoices/${challan.invoice_id}`)}
                >
                  {challan.invoice?.invoice_number}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>

            {/* Customer Card */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 border-b">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Customer Information
                </h4>
              </div>
              <div className="p-4 space-y-3">
                <p className="font-semibold text-base">{customerName}</p>
                {customerAddress && customerAddress !== 'N/A' && (
                  <p className="text-sm text-muted-foreground flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/70" />
                    <span>{customerAddress}</span>
                  </p>
                )}
                {customerPhone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground/70" />
                    {customerPhone}
                  </p>
                )}
              </div>
            </div>

            {/* Transport Details Card */}
            {(challan.vehicle_info || challan.driver_name) && (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="bg-muted/30 px-4 py-3 border-b">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    Transport Details
                  </h4>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  {challan.vehicle_info && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Vehicle</p>
                      <p className="text-sm font-medium">{challan.vehicle_info}</p>
                    </div>
                  )}
                  {challan.driver_name && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Driver</p>
                      <p className="text-sm font-medium">{challan.driver_name}</p>
                    </div>
                  )}
                  {challan.driver_phone && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Driver Phone</p>
                      <p className="text-sm font-medium">{challan.driver_phone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Items Card */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="bg-muted/30 px-4 py-3 border-b flex items-center justify-between">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Items
                </h4>
                <Badge variant="secondary" className="font-mono">
                  {items.length} items
                </Badge>
              </div>
              <div className="divide-y">
                {items.map((item, index) => (
                  <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs text-muted-foreground w-5 shrink-0">
                        {index + 1}.
                      </span>
                      <span className="text-sm font-medium truncate">{item.description}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-semibold text-sm">{item.quantity}</span>
                      <span className="text-xs text-muted-foreground ml-1">{item.unit || 'pcs'}</span>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
                  <span className="font-semibold text-sm">Total Quantity</span>
                  <span className="font-bold text-primary">{totalQuantity}</span>
                </div>
              </div>
            </div>

            {/* Notes Card */}
            {challan.notes && (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="bg-muted/30 px-4 py-3 border-b">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    Notes
                  </h4>
                </div>
                <div className="p-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {challan.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Status Actions */}
            {!isLocked && onStatusChange && (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="bg-muted/30 px-4 py-3 border-b">
                  <h4 className="font-semibold text-sm">Update Status</h4>
                </div>
                <div className="p-4 flex flex-col sm:flex-row gap-2">
                  {challan.status === 'draft' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => onStatusChange(challan.id, 'dispatched')}
                        className="h-10 flex-1"
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Mark as Dispatched
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onStatusChange(challan.id, 'cancelled')}
                        className="h-10 flex-1"
                      >
                        Cancel Challan
                      </Button>
                    </>
                  )}
                  {challan.status === 'dispatched' && (
                    <Button
                      size="sm"
                      className="h-10 w-full bg-success hover:bg-success/90 text-success-foreground"
                      onClick={() => onStatusChange(challan.id, 'delivered')}
                    >
                      ✓ Mark as Delivered
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Locked state indicator */}
            {isLocked && (
              <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground flex items-center gap-3">
                <Lock className="h-4 w-4 shrink-0" />
                <span>
                  {challan.status === 'delivered' 
                    ? 'This challan has been delivered and cannot be modified.'
                    : 'This challan has been cancelled and cannot be modified.'}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 md:p-6">
            <EmptyState
              icon={FileText}
              title="Challan not found"
              description="The requested delivery challan could not be found."
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
