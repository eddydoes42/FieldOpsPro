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
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

interface Message {
  id: string;
  senderId: string;
  recipientId: string | null;
  workOrderId: string | null;
  subject: string;
  content: string;
  priority: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
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
  priority: string;
}

export default function Messages() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState<NewMessageData>({
    recipientId: "",
    workOrderId: "",
    subject: "",
    content: "",
    priority: "normal"
  });
  
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "read" | "sent">("all");

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
        recipientId: data.recipientId || null,
        workOrderId: data.workOrderId === 'none' ? null : data.workOrderId,
        subject: data.subject,
        content: data.content,
        priority: data.priority,
        messageType: data.recipientId ? 'direct' : 'broadcast',
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
        content: "",
        priority: "normal"
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
      <div className="min-h-screen bg-white dark:bg-gray-900 p-6">
        <Navigation userRole={(user as any)?.roles || ['manager']} />
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
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

  const formatRole = (role: string) => {
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navigation />
      <div className="max-w-7xl mx-auto p-6">
        {/* Back to Dashboard Button */}
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/dashboard')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Button>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Messages
          </h1>
        </div>

        <Dialog open={isComposeDialogOpen} onOpenChange={setIsComposeDialogOpen}>
          <DialogContent className="max-w-2xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-white">Compose New Message</DialogTitle>
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
                            {user.firstName} {user.lastName} ({formatRole(user.role)})
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
                        <SelectItem value="none">General message</SelectItem>
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
                  <Label htmlFor="priority">Priority Level</Label>
                  <Select value={newMessage.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => setIsComposeDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={sendMessageMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
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

        {/* Message Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === "all"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              All Messages
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`px-4 py-2 rounded-md transition-colors flex items-center ${
                activeTab === "unread"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <Badge className="ml-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab("read")}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === "read"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Read
            </button>
            <button
              onClick={() => setActiveTab("sent")}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === "sent"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Sent
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inbox */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
                <div className="flex items-center">
                  <i className={`mr-2 ${activeTab === "sent" ? "fas fa-paper-plane text-green-600 dark:text-green-400" : "fas fa-inbox text-blue-600 dark:text-blue-400"}`}></i>
                  {activeTab === "sent" ? "Sent Messages" : "Inbox"}
                  {activeTab === "unread" && unreadCount > 0 && (
                    <Badge className="ml-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                      {unreadCount} unread
                    </Badge>
                  )}
                </div>
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                  onClick={() => setIsComposeDialogOpen(true)}
                >
                  <i className="fas fa-plus"></i>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userMessages
                  .filter(msg => {
                    if (activeTab === "sent") {
                      return msg.senderId === currentUserId;
                    }
                    
                    const isRecipient = msg.recipientId === currentUserId;
                    if (!isRecipient) return false;
                    
                    if (activeTab === "unread") return !msg.isRead;
                    if (activeTab === "read") return msg.isRead;
                    return true; // "all" tab
                  })
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 10)
                  .map((message) => {
                    const getPriorityColor = (priority: string) => {
                      switch (priority) {
                        case 'urgent': return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
                        case 'high': return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700';
                        default: return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
                      }
                    };

                    return (
                    <div 
                      key={message.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        !message.isRead 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30' 
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      onClick={() => viewMessage(message)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {activeTab === "sent" ? `To: ${message.recipientId ? getUserName(message.recipientId) : 'All'}` : getUserName(message.senderId)}
                          </span>
                          {activeTab === "sent" ? (
                            message.isRead && message.readAt && (
                              <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                                <i className="fas fa-check-double mr-1"></i>
                                Read
                              </div>
                            )
                          ) : (
                            !message.isRead && (
                              <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs">New</Badge>
                            )
                          )}
                          {message.priority && message.priority !== 'normal' && (
                            <Badge className={`text-xs ${getPriorityColor(message.priority)}`}>
                              {message.priority === 'urgent' ? '🚨 URGENT' : '⚠️ HIGH'}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          {activeTab === "sent" && message.isRead && message.readAt && (
                            <div className="text-xs text-green-600 dark:text-green-400 mb-1">
                              Read {new Date(message.readAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(message.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">{message.subject}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{message.content}</p>
                      {message.workOrderId && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            <i className="fas fa-clipboard-list mr-1"></i>
                            {getWorkOrderTitle(message.workOrderId)}
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
                {userMessages.filter(msg => {
                  if (activeTab === "sent") {
                    return msg.senderId === currentUserId;
                  }
                  
                  const isRecipient = msg.recipientId === currentUserId;
                  if (!isRecipient) return false;
                  
                  if (activeTab === "unread") return !msg.isRead;
                  if (activeTab === "read") return msg.isRead;
                  return true;
                }).length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <i className={`${activeTab === "sent" ? "fas fa-paper-plane" : "fas fa-inbox"} text-4xl mb-4`}></i>
                    <p>{activeTab === "sent" ? "No sent messages" : "No messages in your inbox"}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sent */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900 dark:text-white">
                <i className="fas fa-paper-plane mr-2 text-green-600 dark:text-green-400"></i>
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
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => viewMessage(message)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            To: {message.recipientId ? getUserName(message.recipientId) : 'All'}
                          </span>
                          {message.priority && message.priority !== 'normal' && (
                            <Badge className={`text-xs ${
                              message.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                              message.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200' :
                              'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            }`}>
                              {message.priority === 'urgent' ? '🚨 URGENT' : '⚠️ HIGH'}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {message.isRead && message.readAt && (
                            <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                              <i className="fas fa-check-double mr-1"></i>
                              Read {new Date(message.readAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(message.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">{message.subject}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{message.content}</p>
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
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
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
          <DialogContent className="max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-gray-900 dark:text-white">Message Details</DialogTitle>
            </DialogHeader>
            {selectedMessage && (
              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">From:</Label>
                    <p className="font-medium text-gray-900 dark:text-white">{getUserName(selectedMessage.senderId)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">To:</Label>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedMessage.recipientId ? getUserName(selectedMessage.recipientId) : 'All'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Date:</Label>
                    <p className="text-gray-900 dark:text-white">{new Date(selectedMessage.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Work Order:</Label>
                    <p className="text-gray-900 dark:text-white">{getWorkOrderTitle(selectedMessage.workOrderId)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Priority:</Label>
                    <div className="flex items-center mt-1">
                      <Badge className={`text-xs ${
                        selectedMessage.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                        selectedMessage.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200' :
                        'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      }`}>
                        {selectedMessage.priority === 'urgent' ? '🚨 URGENT' : 
                         selectedMessage.priority === 'high' ? '⚠️ HIGH' : '📝 NORMAL'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Read Status:</Label>
                    <div className="flex items-center mt-1">
                      {selectedMessage.isRead ? (
                        <div className="flex items-center text-green-600 dark:text-green-400">
                          <i className="fas fa-check-double mr-2"></i>
                          <span className="text-sm">
                            Read {selectedMessage.readAt ? 
                              new Date(selectedMessage.readAt).toLocaleString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }) : 'recently'
                            }
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                          <i className="fas fa-envelope mr-2"></i>
                          <span className="text-sm">Unread</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-700 dark:text-gray-300 text-base font-medium">Subject:</Label>
                  <h3 className="text-xl font-semibold mt-2 text-gray-900 dark:text-white">{selectedMessage.subject}</h3>
                </div>
                <div>
                  <Label className="text-gray-700 dark:text-gray-300 text-base font-medium">Message:</Label>
                  <div className="mt-3 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 min-h-[120px]">
                    <p className="whitespace-pre-wrap text-gray-900 dark:text-white text-base leading-relaxed">{selectedMessage.content}</p>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-600">
                  <Button 
                    variant="outline" 
                    className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    onClick={() => setIsViewDialogOpen(false)}
                  >
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