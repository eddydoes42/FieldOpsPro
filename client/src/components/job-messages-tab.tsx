import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Send, Pin, PinOff, Flag, Clock, Edit, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { JobMessage } from '@shared/schema';

interface JobMessagesTabProps {
  workOrderId: string;
  currentUserId?: string;
  isAdmin?: boolean;
}

interface JobMessageWithSender extends JobMessage {
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: string[];
    companyId: string;
    profileImageUrl?: string;
  };
}

export default function JobMessagesTab({ workOrderId, currentUserId, isAdmin }: JobMessagesTabProps) {
  const [newMessage, setNewMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch job messages
  const { data: messages = [], isLoading, error } = useQuery<JobMessageWithSender[]>({
    queryKey: ['/api/job-messages', workOrderId],
    queryFn: async () => {
      const response = await apiRequest(`/api/job-messages?workOrderId=${workOrderId}`);
      return Array.isArray(response) ? response : [];
    },
    enabled: !!workOrderId,
  });

  // Send new message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { workOrderId: string; message: string; isImportant: boolean }) => {
      return await fetch('/api/job-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-messages', workOrderId] });
      setNewMessage('');
      setIsImportant(false);
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update message mutation
  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, message, isImportant }: { id: string; message: string; isImportant: boolean }) => {
      return await fetch(`/api/job-messages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, isImportant }),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-messages', workOrderId] });
      setEditingMessageId(null);
      setEditingText('');
      toast({
        title: "Message updated",
        description: "Your message has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Pin/unpin message mutation
  const pinMessageMutation = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      return await fetch(`/api/job-messages/${id}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned }),
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-messages', workOrderId] });
      toast({
        title: "Message updated",
        description: "Message pin status updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update message pin status.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    sendMessageMutation.mutate({
      workOrderId,
      message: newMessage.trim(),
      isImportant,
    });
  };

  const handleEditMessage = (message: JobMessageWithSender) => {
    setEditingMessageId(message.id);
    setEditingText(message.message);
  };

  const handleSaveEdit = (messageId: string, important: boolean) => {
    if (!editingText.trim()) return;
    
    updateMessageMutation.mutate({
      id: messageId,
      message: editingText.trim(),
      isImportant: important,
    });
  };

  const handlePinToggle = (messageId: string, currentPinStatus: boolean) => {
    pinMessageMutation.mutate({
      id: messageId,
      isPinned: !currentPinStatus,
    });
  };

  const getRoleColor = (roles: string[]) => {
    if (roles.includes('administrator')) return 'bg-red-100 text-red-800';
    if (roles.includes('manager')) return 'bg-blue-100 text-blue-800';
    if (roles.includes('dispatcher')) return 'bg-green-100 text-green-800';
    if (roles.includes('field_engineer')) return 'bg-emerald-100 text-emerald-800';
    if (roles.includes('field_agent')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getDisplayRole = (roles: string[]) => {
    if (roles.includes('administrator')) return 'Admin';
    if (roles.includes('manager')) return 'Manager';
    if (roles.includes('dispatcher')) return 'Dispatcher';
    if (roles.includes('field_engineer')) return 'Field Engineer';
    if (roles.includes('field_agent')) return 'Field Agent';
    return 'User';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Failed to load messages</p>
        <Button 
          variant="outline" 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/job-messages', workOrderId] })}
          className="mt-2"
        >
          Try Again
        </Button>
      </div>
    );
  }

  const sortedMessages = [...messages].sort((a, b) => {
    // Pinned messages first, then by date (newest first)
    const aPinned = a.isPinned || false;
    const bPinned = b.isPinned || false;
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    const aDate = a.sentAt ? new Date(a.sentAt).getTime() : 0;
    const bDate = b.sentAt ? new Date(b.sentAt).getTime() : 0;
    return bDate - aDate;
  });

  return (
    <div className="space-y-4" data-testid="job-messages-tab">
      {/* Message compose area */}
      <Card>
        <CardHeader className="pb-3">
          <h3 className="text-lg font-semibold">Send Message</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Type your message here..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="min-h-20"
            data-testid="input-new-message"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="important-flag"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                className="rounded"
                data-testid="checkbox-important-flag"
              />
              <label htmlFor="important-flag" className="text-sm flex items-center gap-1">
                <Flag className="w-4 h-4" />
                Mark as important
              </label>
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              className="flex items-center gap-2"
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
              {sendMessageMutation.isPending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Messages list */}
      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {sortedMessages.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
              </CardContent>
            </Card>
          ) : (
            sortedMessages.map((message: JobMessageWithSender, index: number) => (
              <Card key={message.id} className={`${message.isPinned || false ? 'border-primary' : ''}`}>
                <CardContent className="pt-4">
                  {message.isPinned && (
                    <div className="flex items-center gap-1 text-primary text-sm font-medium mb-2">
                      <Pin className="w-4 h-4" />
                      Pinned
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {message.sender?.firstName?.[0]}{message.sender?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">
                          {message.sender?.firstName} {message.sender?.lastName}
                        </span>
                        <Badge className={getRoleColor(message.sender?.roles || [])}>
                          {getDisplayRole(message.sender?.roles || [])}
                        </Badge>
                        {message.isImportant && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <Flag className="w-3 h-3" />
                            Important
                          </Badge>
                        )}
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {message.sentAt ? formatDistanceToNow(new Date(message.sentAt), { addSuffix: true }) : 'Just now'}
                        </span>
                        {message.editedAt && (
                          <span className="text-muted-foreground text-xs">(edited)</span>
                        )}
                      </div>
                      
                      {editingMessageId === message.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="min-h-20"
                            data-testid={`textarea-edit-message-${message.id}`}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(message.id, message.isImportant)}
                              disabled={updateMessageMutation.isPending}
                              data-testid={`button-save-edit-${message.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingMessageId(null)}
                              data-testid={`button-cancel-edit-${message.id}`}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm whitespace-pre-wrap">{message.message}</div>
                      )}
                      
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Attachments:</span>
                          {message.attachments.map((attachment, i) => (
                            <div key={i} className="text-xs text-primary underline cursor-pointer">
                              {attachment}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      {currentUserId === message.senderId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditMessage(message)}
                          className="h-8 w-8 p-0"
                          data-testid={`button-edit-message-${message.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePinToggle(message.id, message.isPinned || false)}
                          className="h-8 w-8 p-0"
                          data-testid={`button-pin-message-${message.id}`}
                        >
                          {message.isPinned ? (
                            <PinOff className="w-4 h-4" />
                          ) : (
                            <Pin className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
                
                {index < sortedMessages.length - 1 && <Separator className="mt-4" />}
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}