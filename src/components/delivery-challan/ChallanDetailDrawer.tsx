import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Printer, Download, Share2, Mail, MessageCircle, ExternalLink, Truck, User, Phone, MapPin, FileText, Lock } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
          invoice:invoices(invoice_number, customer_id, customers(name, address)),
          customers(name, address)
        `)
        .eq('id', challanId)
        .single();

      if (challanError) throw challanError;
      setChallan(challanData as unknown as DeliveryChallan);

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

  // Business logic helpers
  const isLocked = challan?.status === 'delivered' || challan?.status === 'cancelled';
  const canPrint = challan?.status !== 'cancelled';
  const canShare = challan?.status !== 'cancelled';

  const handlePrint = () => {
    if (!canPrint) return;
    window.open(`/delivery-challans/${challanId}/print`, '_blank');
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

  const customerName = challan?.customers?.name || challan?.invoice?.customers?.name || 'N/A';
  const customerAddress = challan?.delivery_address || challan?.customers?.address || challan?.invoice?.customers?.address || 'N/A';
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity), 0);

  

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {loading ? 'Loading...' : challan?.challan_number}
            </SheetTitle>
            {!loading && challan && (
              <div className="flex items-center gap-2">
                {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                <StatusBadge status={challan.status} />
              </div>
            )}
          </div>
        </SheetHeader>

        {loading ? (
          <div className="mt-6">
            <ContentSkeleton />
          </div>
        ) : challan ? (
          <div className="space-y-6 mt-6">
            {/* Actions - disabled for cancelled challans */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint}
                disabled={!canPrint}
                className={cn(!canPrint && 'opacity-50 cursor-not-allowed')}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint}
                disabled={!canPrint}
                className={cn(!canPrint && 'opacity-50 cursor-not-allowed')}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={!canShare}
                    className={cn(!canShare && 'opacity-50 cursor-not-allowed')}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
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

            <Separator />

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">
                  {format(new Date(challan.challan_date), 'dd MMM yyyy')}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Invoice</p>
                <Button
                  variant="link"
                  className="p-0 h-auto font-medium"
                  onClick={() => navigate(`/invoices/${challan.invoice_id}`)}
                >
                  {challan.invoice?.invoice_number}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Customer & Delivery Info */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer & Delivery
              </h4>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <p className="font-medium">{customerName}</p>
                <p className="text-muted-foreground flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  {customerAddress}
                </p>
              </div>
            </div>

            {/* Vehicle & Driver */}
            {(challan.vehicle_info || challan.driver_name) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Transport Details
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                    {challan.vehicle_info && (
                      <p>
                        <span className="text-muted-foreground">Vehicle:</span>{' '}
                        {challan.vehicle_info}
                      </p>
                    )}
                    {challan.driver_name && (
                      <p>
                        <span className="text-muted-foreground">Driver:</span>{' '}
                        {challan.driver_name}
                      </p>
                    )}
                    {challan.driver_phone && (
                      <p className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {challan.driver_phone}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Items */}
            <div className="space-y-3">
              <h4 className="font-medium">Items ({items.length})</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-right p-3 font-medium w-24">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3">{item.description}</td>
                        <td className="p-3 text-right">
                          {item.quantity} {item.unit}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t bg-muted/30 font-medium">
                      <td className="p-3">Total</td>
                      <td className="p-3 text-right">{totalQuantity}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {challan.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Notes</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    {challan.notes}
                  </p>
                </div>
              </>
            )}

            <Separator />

            {/* Status Actions - only show if not locked */}
            {!isLocked && onStatusChange && (
              <div className="space-y-3">
                <h4 className="font-medium">Update Status</h4>
                <div className="flex flex-wrap gap-2">
                  {challan.status === 'draft' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => onStatusChange(challan.id, 'dispatched')}
                        className="transition-transform duration-200 active:scale-95"
                      >
                        Mark as Dispatched
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onStatusChange(challan.id, 'cancelled')}
                        className="transition-transform duration-200 active:scale-95"
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  {challan.status === 'dispatched' && (
                    <Button
                      size="sm"
                      className="bg-success hover:bg-success/90 transition-transform duration-200 active:scale-95"
                      onClick={() => onStatusChange(challan.id, 'delivered')}
                    >
                      Mark as Delivered
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Locked state indicator */}
            {isLocked && (
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {challan.status === 'delivered' 
                  ? 'This challan has been delivered and cannot be modified.'
                  : 'This challan has been cancelled and cannot be modified.'}
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="Challan not found"
            description="The requested delivery challan could not be found."
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
