import { useState } from 'react';
import { useSupportTickets, useTicketMessages, SupportTicket } from '@/hooks/useSupportTickets';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MessageCircle,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Paperclip,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const statusConfig = {
  open: { label: 'Open', icon: AlertCircle, color: 'bg-warning/10 text-warning' },
  pending: { label: 'Pending', icon: Clock, color: 'bg-info/10 text-info' },
  closed: { label: 'Closed', icon: CheckCircle2, color: 'bg-success/10 text-success' },
};

const priorityConfig = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-primary/10 text-primary',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive',
};

export function SupportChatButton() {
  const { tickets, unreadCount, createTicket, updateTicketStatus, loading } = useSupportTickets();
  const { isSuperAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setCreating(true);
    const ticket = await createTicket(newSubject, newMessage);
    setCreating(false);

    if (ticket) {
      setIsNewTicketOpen(false);
      setNewSubject('');
      setNewMessage('');
      setSelectedTicket(ticket as SupportTicket);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <MessageCircle className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
          {selectedTicket ? (
            <TicketDetail
              ticket={selectedTicket}
              onBack={() => setSelectedTicket(null)}
              onStatusChange={updateTicketStatus}
              isSuperAdmin={isSuperAdmin}
            />
          ) : (
            <>
              <SheetHeader className="p-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <SheetTitle>Support</SheetTitle>
                  <Button size="sm" className="gap-1.5" onClick={() => setIsNewTicketOpen(true)}>
                    <Plus className="h-4 w-4" />
                    New Ticket
                  </Button>
                </div>
              </SheetHeader>
              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-muted/30 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-medium text-foreground mb-1">No tickets yet</h3>
                    <p className="text-sm text-muted-foreground text-center">
                      Create a new ticket to get help from our support team
                    </p>
                  </div>
                ) : (
                  <div className="p-2">
                    {tickets.map((ticket) => {
                      const StatusIcon = statusConfig[ticket.status].icon;
                      return (
                        <button
                          key={ticket.id}
                          className="w-full p-3 rounded-lg hover:bg-muted/50 text-left transition-colors"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="font-medium text-sm text-foreground line-clamp-1">
                              {ticket.subject}
                            </span>
                            <Badge className={cn('text-[10px] shrink-0', statusConfig[ticket.status].color)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[ticket.status].label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>#{ticket.ticket_number}</span>
                            <span>•</span>
                            <span>{format(new Date(ticket.updated_at), 'MMM d, h:mm a')}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Support Ticket</DialogTitle>
            <DialogDescription>
              Describe your issue and our team will get back to you as soon as possible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="Subject"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Textarea
                placeholder="Describe your issue..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewTicketOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTicket} disabled={creating}>
              {creating ? 'Creating...' : 'Create Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TicketDetail({
  ticket,
  onBack,
  onStatusChange,
  isSuperAdmin,
}: {
  ticket: SupportTicket;
  onBack: () => void;
  onStatusChange: (id: string, status: SupportTicket['status']) => void;
  isSuperAdmin: boolean;
}) {
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useTicketMessages(ticket.id);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    const success = await sendMessage(newMessage);
    setSending(false);

    if (success) {
      setNewMessage('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('branding')
        .upload(`support/${fileName}`, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('branding')
        .getPublicUrl(`support/${fileName}`);

      await sendMessage(`Attachment: ${file.name}`, urlData.publicUrl, file.name);
      toast.success('File uploaded');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const StatusIcon = statusConfig[ticket.status].icon;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">#{ticket.ticket_number}</span>
          <Badge className={cn('text-[10px] ml-auto', statusConfig[ticket.status].color)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig[ticket.status].label}
          </Badge>
        </div>
        <h3 className="font-medium text-foreground">{ticket.subject}</h3>
        {(isSuperAdmin || ticket.status !== 'closed') && (
          <div className="flex gap-2 mt-3">
            {ticket.status !== 'closed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(ticket.id, 'closed')}
              >
                Close Ticket
              </Button>
            )}
            {isSuperAdmin && ticket.status === 'open' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(ticket.id, 'pending')}
              >
                Mark Pending
              </Button>
            )}
            {ticket.status === 'closed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange(ticket.id, 'open')}
              >
                Reopen
              </Button>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'max-w-[85%] p-3 rounded-lg',
                    isOwn
                      ? 'ml-auto bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {msg.attachment_url ? (
                    <a
                      href={msg.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm underline"
                    >
                      <Paperclip className="h-4 w-4" />
                      {msg.attachment_name || 'Attachment'}
                    </a>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  )}
                  <span
                    className={cn(
                      'text-[10px] mt-1 block',
                      isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}
                  >
                    {format(new Date(msg.created_at), 'h:mm a')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {ticket.status !== 'closed' && (
        <div className="p-4 border-t border-border/50">
          <div className="flex gap-2">
            <label className="shrink-0">
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
                accept="image/*,.pdf,.doc,.docx"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                disabled={uploading}
                asChild
              >
                <span>
                  <Paperclip className="h-4 w-4" />
                </span>
              </Button>
            </label>
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={sending}
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
