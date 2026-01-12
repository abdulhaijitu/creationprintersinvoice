import { useState, useRef, useEffect, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Send, Loader2, Trash2, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTaskComments, TaskComment, TeamMember } from '@/hooks/useTaskComments';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgRolePermissions } from '@/hooks/useOrgRolePermissions';

interface TaskCommentsProps {
  taskId: string | null;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function highlightMentions(text: string): React.ReactNode {
  const parts = text.split(/(@\S+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={index} className="text-primary font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const { user, isSuperAdmin } = useAuth();
  const { hasPermission } = useOrgRolePermissions();
  const { comments, loading, submitting, teamMembers, addComment, deleteComment } = useTaskComments(taskId);
  
  const [newComment, setNewComment] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Permission checks
  const canAddComments = isSuperAdmin || hasPermission('tasks.create') || hasPermission('tasks.manage');

  // Auto-scroll to latest comment
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  // Filter team members for mention suggestions
  const filteredMembers = useMemo(() => {
    if (!mentionFilter) return teamMembers;
    const filter = mentionFilter.toLowerCase();
    return teamMembers.filter(
      (m) => 
        m.name.toLowerCase().includes(filter) || 
        m.email.toLowerCase().includes(filter)
    );
  }, [teamMembers, mentionFilter]);

  // Handle text input for @ detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart || 0;
    setNewComment(value);
    setCursorPosition(position);

    // Check for @ mention trigger
    const textBeforeCursor = value.slice(0, position);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Show mentions if @ is at the end or followed by text without spaces
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setShowMentions(true);
        setMentionFilter(textAfterAt);
        return;
      }
    }
    
    setShowMentions(false);
    setMentionFilter('');
  };

  // Insert mention
  const insertMention = (member: TeamMember) => {
    const textBeforeCursor = newComment.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = newComment.slice(cursorPosition);
    
    const mentionText = member.name.includes(' ') 
      ? member.email 
      : member.name.replace(/\s+/g, '');
    
    const newText = 
      textBeforeCursor.slice(0, lastAtIndex) + 
      `@${mentionText} ` + 
      textAfterCursor;
    
    setNewComment(newText);
    setShowMentions(false);
    setMentionFilter('');
    
    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  // Submit comment
  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    
    const success = await addComment(newComment);
    if (success) {
      setNewComment('');
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Comments List */}
      <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
        <div className="space-y-4 pb-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isOwn={comment.created_by === user?.id}
                onDelete={() => deleteComment(comment.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Comment Input */}
      {canAddComments && (
        <div className="border-t pt-4 mt-4">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={newComment}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment... (@ to mention)"
              className="min-h-[80px] pr-12 resize-none"
              disabled={submitting}
            />
            
            {/* Mention Popover */}
            {showMentions && filteredMembers.length > 0 && (
              <div className="absolute bottom-full left-0 mb-1 w-64 bg-popover border rounded-md shadow-md z-50 max-h-48 overflow-y-auto">
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => insertMention(member)}
                    className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 text-sm"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <Button
              size="icon"
              className="absolute bottom-2 right-2"
              onClick={handleSubmit}
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Ctrl+Enter to send • Use @ to mention team members
          </p>
        </div>
      )}
    </div>
  );
}

// Individual comment item
function CommentItem({ 
  comment, 
  isOwn, 
  onDelete 
}: { 
  comment: TaskComment; 
  isOwn: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-3 group">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {getInitials(comment.created_by_name || comment.created_by_email)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {comment.created_by_name || comment.created_by_email?.split('@')[0] || 'Unknown'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
          {isOwn && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          )}
        </div>
        <p className="text-sm mt-1 whitespace-pre-wrap break-words">
          {highlightMentions(comment.comment_text)}
        </p>
      </div>
    </div>
  );
}
