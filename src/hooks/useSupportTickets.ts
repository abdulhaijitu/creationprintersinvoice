import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  organization_id: string | null;
  user_id: string;
  subject: string;
  status: 'open' | 'pending' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  closed_by: string | null;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  message: string;
  attachment_url: string | null;
  attachment_name: string | null;
  is_read: boolean;
  created_at: string;
}

export function useSupportTickets() {
  const { user, isSuperAdmin } = useAuth();
  const { organization } = useOrganization();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchTickets = useCallback(async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('updated_at', { ascending: false });

      // Super admin sees all tickets, users see only their own
      if (!isSuperAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      setTickets((data || []) as SupportTicket[]);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isSuperAdmin]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      // Get unread messages count
      const { count, error } = await supabase
        .from('support_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .neq('sender_id', user.id);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user]);

  const createTicket = async (subject: string, message: string) => {
    if (!user) return null;

    try {
      // Generate ticket number
      const { data: ticketNumber, error: numError } = await supabase.rpc('generate_ticket_number');
      if (numError) throw numError;

      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          ticket_number: ticketNumber,
          user_id: user.id,
          organization_id: organization?.id,
          subject,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Create first message
      const { error: msgError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          sender_type: 'user',
          message,
        });

      if (msgError) throw msgError;

      toast.success('Support ticket created');
      await fetchTickets();
      return ticket;
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
      return null;
    }
  };

  const updateTicketStatus = async (ticketId: string, status: SupportTicket['status']) => {
    try {
      const updateData: Partial<SupportTicket> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'closed') {
        updateData.closed_at = new Date().toISOString();
        updateData.closed_by = user?.id;
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      toast.success(`Ticket ${status}`);
      await fetchTickets();
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket');
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchUnreadCount();
  }, [fetchTickets, fetchUnreadCount]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel: RealtimeChannel = supabase
      .channel('support-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          fetchTickets();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
        },
        (payload) => {
          if (payload.new && (payload.new as SupportMessage).sender_id !== user.id) {
            fetchUnreadCount();
            toast.info('New message received');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchTickets, fetchUnreadCount]);

  return {
    tickets,
    loading,
    unreadCount,
    createTicket,
    updateTicketStatus,
    refetch: fetchTickets,
  };
}

export function useTicketMessages(ticketId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!ticketId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as SupportMessage[]);

      // Mark messages as read
      if (user) {
        await supabase
          .from('support_messages')
          .update({ is_read: true })
          .eq('ticket_id', ticketId)
          .neq('sender_id', user.id);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }, [ticketId, user]);

  const sendMessage = async (message: string, attachmentUrl?: string, attachmentName?: string) => {
    if (!ticketId || !user) return false;

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          sender_type: user ? 'user' : 'admin',
          message,
          attachment_url: attachmentUrl || null,
          attachment_name: attachmentName || null,
        });

      if (error) throw error;

      // Update ticket timestamp
      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      await fetchMessages();
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return false;
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, fetchMessages]);

  return {
    messages,
    loading,
    sendMessage,
    refetch: fetchMessages,
  };
}
