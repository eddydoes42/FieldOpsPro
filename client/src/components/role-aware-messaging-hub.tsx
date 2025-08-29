import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Users, 
  Hash, 
  Lock, 
  Globe,
  Paperclip,
  Search,
  Filter,
  Archive,
  Pin,
  Reply,
  Edit,
  Trash2,
  Circle,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MessagingChannel {
  id: string;
  name: string;
  description: string;
  channelType: string;
  companyId?: string;
  workOrderId?: string;
  projectId?: string;
  allowedRoles: string[];
  createdById: string;
  isArchived: boolean;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    firstName: string;
    lastName: string;
  };
  messageCount?: number;
  unreadCount?: number;
}

interface ChannelMessage {
  id: string;
  channelId: string;
  senderId: string;
  message: string;
  messageType: string;
  attachments: string[];
  mentions: string[];
  isEdited: boolean;
  editedAt?: string;
  replyToId?: string;
  priority: string;
  isSystemMessage: boolean;
  createdAt: string;
  updatedAt: string;
  sender?: {
    firstName: string;
    lastName: string;
    role: string;
  };
  replyTo?: ChannelMessage;
}

interface RoleAwareMessagingHubProps {
  userRole?: string;
  companyId?: string;
  userId?: string;
  workOrderId?: string;
  projectId?: string;
  viewMode?: 'workspace' | 'project' | 'work_order';
}

export default function RoleAwareMessagingHub({ 
  userRole, 
  companyId, 
  userId,
  workOrderId,
  projectId,
  viewMode = 'workspace' 
}: RoleAwareMessagingHubProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [replyToMessage, setReplyToMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Channel creation form
  const [channelForm, setChannelForm] = useState({
    name: "",
    description: "",
    channelType: "company_wide",
    allowedRoles: [] as string[],
  });

  const availableRoles = [
    "operations_director",
    "administrator", 
    "manager",
    "dispatcher",
    "field_engineer",
    "field_agent",
  ];

  // Fetch channels
  const { data: channels, isLoading: channelsLoading } = useQuery({
    queryKey: ['/api/messaging/channels', { companyId, workOrderId, projectId, viewMode }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (workOrderId) params.append('workOrderId', workOrderId);
      if (projectId) params.append('projectId', projectId);
      if (viewMode) params.append('viewMode', viewMode);
      
      const response = await fetch(`/api/messaging/channels?${params}`);
      if (!response.ok) throw new Error('Failed to fetch channels');
      return response.json();
    },
  });

  // Fetch messages for selected channel
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/messaging/messages', selectedChannelId],
    queryFn: async () => {
      if (!selectedChannelId) return [];
      const response = await fetch(`/api/messaging/channels/${selectedChannelId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: !!selectedChannelId,
    refetchInterval: 5000, // Poll for new messages every 5 seconds
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: async (channelData: any) => {
      return apiRequest("POST", "/api/messaging/channels", {
        ...channelData,
        companyId,
        workOrderId,
        projectId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Channel Created",
        description: "New messaging channel has been created."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/channels'] });
      setIsCreateChannelOpen(false);
      resetChannelForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create channel",
        description: error.message || "Could not create channel",
        variant: "destructive",
      });
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      return apiRequest("POST", `/api/messaging/channels/${selectedChannelId}/messages`, messageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/messages', selectedChannelId] });
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/channels'] });
      setNewMessage("");
      setReplyToMessage(null);
      scrollToBottom();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Could not send message",
        variant: "destructive",
      });
    }
  });

  // Archive channel mutation
  const archiveChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      return apiRequest("PUT", `/api/messaging/channels/${channelId}/archive`, {});
    },
    onSuccess: () => {
      toast({
        title: "Channel Archived",
        description: "Channel has been archived successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/messaging/channels'] });
      if (selectedChannelId) {
        setSelectedChannelId(null);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to archive channel",
        description: error.message || "Could not archive channel",
        variant: "destructive",
      });
    }
  });

  const resetChannelForm = () => {
    setChannelForm({
      name: "",
      description: "",
      channelType: "company_wide",
      allowedRoles: [],
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedChannelId) {
      return;
    }

    const messageData = {
      message: newMessage.trim(),
      messageType: 'text',
      replyToId: replyToMessage,
      priority: 'normal',
    };

    sendMessageMutation.mutate(messageData);
  };

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!channelForm.name.trim()) {
      toast({
        title: "Channel name required",
        description: "Please provide a name for the channel",
        variant: "destructive",
      });
      return;
    }

    createChannelMutation.mutate(channelForm);
  };

  const getChannelIcon = (channelType: string) => {
    switch (channelType) {
      case 'company_wide': return <Hash className="w-4 h-4" />;
      case 'project_specific': return <Users className="w-4 h-4" />;
      case 'role_based': return <Lock className="w-4 h-4" />;
      case 'direct': return <MessageCircle className="w-4 h-4" />;
      default: return <Hash className="w-4 h-4" />;
    }
  };

  const getChannelTypeColor = (channelType: string) => {
    switch (channelType) {
      case 'company_wide': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'project_specific': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'role_based': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'direct': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-gray-500';
      case 'normal': return 'text-gray-700 dark:text-gray-300';
      case 'high': return 'text-orange-600';
      case 'urgent': return 'text-red-600';
      default: return 'text-gray-700 dark:text-gray-300';
    }
  };

  const canCreateChannels = userRole && ['operations_director', 'administrator', 'manager'].includes(userRole);
  const canArchiveChannels = userRole && ['operations_director', 'administrator', 'manager'].includes(userRole);

  const filteredChannels = channels?.filter((channel: MessagingChannel) =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (channelsLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-96 flex border rounded-lg overflow-hidden bg-white dark:bg-gray-800" data-testid="messaging-hub">
      {/* Channels Sidebar */}
      <div className="w-80 border-r bg-gray-50 dark:bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-lg">Channels</h3>
            {canCreateChannels && (
              <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-create-channel">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Channel</DialogTitle>
                  </DialogHeader>

                  <form onSubmit={handleCreateChannel} className="space-y-4">
                    <div>
                      <Label htmlFor="channelName">Channel Name *</Label>
                      <Input
                        id="channelName"
                        value={channelForm.name}
                        onChange={(e) => setChannelForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="general-discussion"
                        required
                        data-testid="input-channel-name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="channelDescription">Description</Label>
                      <Textarea
                        id="channelDescription"
                        value={channelForm.description}
                        onChange={(e) => setChannelForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Channel description..."
                        rows={2}
                        data-testid="textarea-channel-description"
                      />
                    </div>

                    <div>
                      <Label htmlFor="channelType">Channel Type</Label>
                      <Select 
                        value={channelForm.channelType} 
                        onValueChange={(value) => setChannelForm(prev => ({ ...prev, channelType: value }))}
                      >
                        <SelectTrigger data-testid="select-channel-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="company_wide">Company Wide</SelectItem>
                          <SelectItem value="project_specific">Project Specific</SelectItem>
                          <SelectItem value="role_based">Role Based</SelectItem>
                          <SelectItem value="direct">Direct Message</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {channelForm.channelType === 'role_based' && (
                      <div>
                        <Label>Allowed Roles</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {availableRoles.map((role) => (
                            <label key={role} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={channelForm.allowedRoles.includes(role)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setChannelForm(prev => ({
                                      ...prev,
                                      allowedRoles: [...prev.allowedRoles, role]
                                    }));
                                  } else {
                                    setChannelForm(prev => ({
                                      ...prev,
                                      allowedRoles: prev.allowedRoles.filter(r => r !== role)
                                    }));
                                  }
                                }}
                                data-testid={`checkbox-role-${role}`}
                              />
                              <span className="text-sm capitalize">{role.replace('_', ' ')}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateChannelOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createChannelMutation.isPending} data-testid="button-submit-channel">
                        {createChannelMutation.isPending ? "Creating..." : "Create Channel"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-channels"
            />
          </div>
        </div>

        {/* Channels List */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredChannels?.map((channel: MessagingChannel) => (
              <div
                key={channel.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedChannelId === channel.id
                    ? 'bg-blue-100 dark:bg-blue-900'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => setSelectedChannelId(channel.id)}
                data-testid={`channel-item-${channel.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {getChannelIcon(channel.channelType)}
                    <span className="font-medium truncate">{channel.name}</span>
                    {channel.unreadCount && channel.unreadCount > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {channel.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <Badge className={getChannelTypeColor(channel.channelType)} variant="outline">
                    {channel.channelType.replace('_', ' ')}
                  </Badge>
                  {channel.lastActivityAt && (
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(channel.lastActivityAt))} ago
                    </span>
                  )}
                </div>

                {channel.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                    {channel.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannelId ? (
          <>
            {/* Channel Header */}
            <div className="p-4 border-b bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getChannelIcon(channels?.find((c: MessagingChannel) => c.id === selectedChannelId)?.channelType || '')}
                  <div>
                    <h4 className="font-semibold">
                      {channels?.find((c: MessagingChannel) => c.id === selectedChannelId)?.name}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {channels?.find((c: MessagingChannel) => c.id === selectedChannelId)?.description}
                    </p>
                  </div>
                </div>

                {canArchiveChannels && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => archiveChannelMutation.mutate(selectedChannelId)}
                    disabled={archiveChannelMutation.isPending}
                    data-testid="button-archive-channel"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messagesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : messages?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages?.map((message: ChannelMessage) => (
                    <div key={message.id} className="group" data-testid={`message-${message.id}`}>
                      {message.replyTo && (
                        <div className="ml-8 mb-1 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded border-l-2 border-gray-300">
                          <span className="font-medium">
                            Replying to {message.replyTo.sender?.firstName} {message.replyTo.sender?.lastName}:
                          </span>
                          <p className="truncate">{message.replyTo.message}</p>
                        </div>
                      )}

                      <div className="flex space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {message.sender?.firstName?.[0]}{message.sender?.lastName?.[0]}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {message.sender?.firstName} {message.sender?.lastName}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {message.sender?.role?.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(message.createdAt))} ago
                            </span>
                            {message.isEdited && (
                              <span className="text-xs text-gray-400">(edited)</span>
                            )}
                          </div>

                          <div className={`mt-1 ${getPriorityColor(message.priority)}`}>
                            {message.isSystemMessage ? (
                              <div className="flex items-center space-x-2 text-sm italic">
                                <Circle className="w-3 h-3 fill-current" />
                                <span>{message.message}</span>
                              </div>
                            ) : (
                              <p className="text-sm">{message.message}</p>
                            )}
                          </div>

                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {message.attachments.map((attachment, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  <Paperclip className="w-3 h-3 mr-1" />
                                  {attachment}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Message actions (shown on hover) */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setReplyToMessage(message.id)}
                              className="h-6 px-2 text-xs"
                              data-testid={`button-reply-${message.id}`}
                            >
                              <Reply className="w-3 h-3 mr-1" />
                              Reply
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-white dark:bg-gray-800">
              {replyToMessage && (
                <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Replying to message
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setReplyToMessage(null)}
                      className="h-4 w-4 p-0"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1"
                  data-testid="input-new-message"
                />
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Select a Channel
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a channel from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}