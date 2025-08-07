import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import { useEffect, useState } from "react";

interface Message {
  id: string;
  senderId: string;
  recipientId: string | null;
  workOrderId: string | null;
  subject: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface WorkOrder {
  id: string;
  title: string;
}

interface NewMessageData {
  recipientId: string;
  workOrderId: string;
  subject: string;
  content: string;
}

export default function Messages() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState<NewMessageData>({
    recipientId: "",
    workOrderId: "",
    subject: "",
    content: ""
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: messages, isLoading: messagesLoading, error: messagesError } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    retry: false,
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    retry: false,
  });

  const { data: workOrders, isLoading: ordersLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
    retry: false,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: NewMessageData) => {
      const messageData = {
        ...data,
        id: `msg-${Date.now()}`,
        fromUserId: (user as any)?.id,
        createdAt: new Date(),
        isRead: false,
      };
      
      const response = await apiRequest('POST', '/api/messages', messageData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Message sent successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      setIsComposeDialogOpen(false);
      setNewMessage({
        recipientId: "",
        workOrderId: "",
        subject: "",
        content: ""
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await apiRequest('PATCH', `/api/messages/${messageId}/read`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    },
  });

  if (messagesError && isUnauthorizedError(messagesError as Error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  if (isLoading || messagesLoading || usersLoading || ordersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Navigation userRole={(user as any)?.role || 'manager'} />
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const getUserName = (userId: string) => {
    const foundUser = users?.find(u => u.id === userId);
    return foundUser ? `${foundUser.firstName} ${foundUser.lastName}` : 'Unknown User';
  };

  const getWorkOrderTitle = (workOrderId: string | null) => {
    if (!workOrderId) return 'General';
    const workOrder = workOrders?.find(w => w.id === workOrderId);
    return workOrder ? workOrder.title : 'Unknown Work Order';
  };

  const currentUserId = (user as any)?.id;
  const userMessages = messages?.filter(msg => 
    msg.senderId === currentUserId || msg.recipientId === currentUserId
  ) || [];

  const unreadCount = userMessages.filter(msg => 
    !msg.isRead && msg.recipientId === currentUserId
  ).length;

  const handleInputChange = (field: keyof NewMessageData, value: string) => {
    setNewMessage(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.recipientId || !newMessage.subject || !newMessage.content) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    sendMessageMutation.mutate(newMessage);
  };

  const viewMessage = (message: Message) => {
    setSelectedMessage(message);
    setIsViewDialogOpen(true);
    
    if (!message.isRead && message.recipientId === currentUserId) {
      markAsReadMutation.mutate(message.id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userRole={(user as any)?.role || 'manager'} />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              Messages
              {unreadCount > 0 && (
                <Badge className="ml-3 bg-red-100 text-red-800">
                  {unreadCount} unread
                </Badge>
              )}
            </h1>
            <p className="text-gray-600">Team communication and work order discussions</p>
          </div>
          <Dialog open={isComposeDialogOpen} onOpenChange={setIsComposeDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <i className="fas fa-plus mr-2"></i>
                Compose Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Compose New Message</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipientId">Send To *</Label>
                    <Select value={newMessage.recipientId} onValueChange={(value) => handleInputChange('recipientId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipient" />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.filter(u => u.id !== currentUserId).map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workOrderId">Related Work Order</Label>
                    <Select value={newMessage.workOrderId} onValueChange={(value) => handleInputChange('workOrderId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select work order (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No work order</SelectItem>
                        {workOrders?.map(order => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={newMessage.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    placeholder="Message subject"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Message *</Label>
                  <Textarea
                    id="content"
                    value={newMessage.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    placeholder="Type your message here..."
                    rows={6}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsComposeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={sendMessageMutation.isPending}>
                    {sendMessageMutation.isPending ? (
                      <div className="flex items-center">
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Sending...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <i className="fas fa-paper-plane mr-2"></i>
                        Send Message
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Messages List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inbox */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-inbox mr-2 text-blue-600"></i>
                Inbox
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userMessages
                  .filter(msg => msg.recipientId === currentUserId)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 10)
                  .map((message) => (
                    <div 
                      key={message.id}
                      className={`p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 ${
                        !message.isRead ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => viewMessage(message)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {getUserName(message.senderId)}
                          </span>
                          {!message.isRead && (
                            <Badge className="bg-blue-100 text-blue-800 text-xs">New</Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{message.subject}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{message.content}</p>
                      {message.workOrderId && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            <i className="fas fa-clipboard-list mr-1"></i>
                            {getWorkOrderTitle(message.workOrderId)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                {userMessages.filter(msg => msg.recipientId === currentUserId).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-inbox text-4xl mb-4"></i>
                    <p>No messages in your inbox</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sent */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <i className="fas fa-paper-plane mr-2 text-green-600"></i>
                Sent Messages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userMessages
                  .filter(msg => msg.senderId === currentUserId)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 10)
                  .map((message) => (
                    <div 
                      key={message.id}
                      className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                      onClick={() => viewMessage(message)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-gray-900">
                          To: {message.recipientId ? getUserName(message.recipientId) : 'All'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{message.subject}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{message.content}</p>
                      {message.workOrderId && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            <i className="fas fa-clipboard-list mr-1"></i>
                            {getWorkOrderTitle(message.workOrderId)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                {userMessages.filter(msg => msg.senderId === currentUserId).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-paper-plane text-4xl mb-4"></i>
                    <p>No sent messages</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Message Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Message Details</DialogTitle>
            </DialogHeader>
            {selectedMessage && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>From:</Label>
                    <p className="font-medium">{getUserName(selectedMessage.senderId)}</p>
                  </div>
                  <div>
                    <Label>To:</Label>
                    <p className="font-medium">
                      {selectedMessage.recipientId ? getUserName(selectedMessage.recipientId) : 'All'}
                    </p>
                  </div>
                  <div>
                    <Label>Date:</Label>
                    <p>{new Date(selectedMessage.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Work Order:</Label>
                    <p>{getWorkOrderTitle(selectedMessage.workOrderId)}</p>
                  </div>
                </div>
                <div>
                  <Label>Subject:</Label>
                  <h3 className="text-lg font-medium mt-1">{selectedMessage.subject}</h3>
                </div>
                <div>
                  <Label>Message:</Label>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}