import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { 
  Briefcase, 
  MessageSquare, 
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  MapPin,
  Calendar
} from "lucide-react";

interface WorkOrder {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  clientName?: string;
  location?: string;
  scheduledDate?: string;
  estimatedHours?: number;
  description?: string;
}

interface FieldAgentDashboardProps {
  className?: string;
}

export function FieldAgentDashboard({ className }: FieldAgentDashboardProps) {
  // Queries for field agent specific data
  const { data: workOrders = [], isLoading: workOrdersLoading } = useQuery<WorkOrder[]>({
    queryKey: queryKeys.workOrders(),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 15000,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<any[]>({
    queryKey: queryKeys.messages(),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 8000,
  });

  const { data: activeTimeEntry, isLoading: timeLoading } = useQuery({
    queryKey: queryKeys.activeTimeEntry(),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 3000,
  });

  // Filter work orders for current agent
  const myWorkOrders = workOrders.filter(wo => wo.status === 'in_progress' || wo.status === 'pending');
  const todayWorkOrders = myWorkOrders.filter(wo => {
    if (!wo.scheduledDate) return false;
    const today = new Date().toDateString();
    return new Date(wo.scheduledDate).toDateString() === today;
  });

  const unreadMessages = messages.filter((msg: any) => !msg.read).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
      case 'in_progress': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200';
      case 'pending': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200';
      case 'on_hold': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      default: return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Today's Schedule */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Today's Schedule</span>
            <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
              {todayWorkOrders.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {workOrdersLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : todayWorkOrders.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">No work orders scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayWorkOrders.map((workOrder) => (
                <div 
                  key={workOrder.id} 
                  className="border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                  data-testid={`work-order-${workOrder.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getPriorityIcon(workOrder.priority)}
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {workOrder.title}
                      </h4>
                    </div>
                    <Badge variant="outline" className={getStatusColor(workOrder.status)}>
                      {workOrder.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    {workOrder.clientName && (
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{workOrder.clientName}</span>
                      </div>
                    )}
                    {workOrder.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{workOrder.location}</span>
                      </div>
                    )}
                    {workOrder.estimatedHours && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{workOrder.estimatedHours}h estimated</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Time Entry */}
      {activeTimeEntry && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2 text-green-800 dark:text-green-200">
              <Clock className="h-5 w-5" />
              <span>Currently Working</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-900 dark:text-green-100">
                {activeTimeEntry.workOrderTitle || 'Work Order'}
              </h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700 dark:text-green-300">
                  Started: {new Date(activeTimeEntry.startTime).toLocaleTimeString()}
                </span>
                <Button size="sm" variant="outline" className="border-green-300 text-green-800 hover:bg-green-100">
                  Stop Timer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Work Orders */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <span>My Work Orders</span>
            <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
              {myWorkOrders.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {workOrdersLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : myWorkOrders.length === 0 ? (
            <div className="text-center py-6">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">No active work orders</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myWorkOrders.slice(0, 5).map((workOrder) => (
                <div 
                  key={workOrder.id} 
                  className="border rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                  data-testid={`work-order-card-${workOrder.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getPriorityIcon(workOrder.priority)}
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {workOrder.title}
                      </h4>
                    </div>
                    <Badge variant="outline" className={getStatusColor(workOrder.status)}>
                      {workOrder.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  {workOrder.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {workOrder.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{workOrder.clientName || 'No client assigned'}</span>
                    {workOrder.scheduledDate && (
                      <span>Due: {new Date(workOrder.scheduledDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
              {myWorkOrders.length > 5 && (
                <Button variant="outline" className="w-full">
                  View All {myWorkOrders.length} Work Orders
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages Quick View */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span>Messages</span>
            {unreadMessages > 0 && (
              <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                {unreadMessages} new
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {messagesLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-6">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">No messages</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.slice(0, 3).map((message: any) => (
                <div 
                  key={message.id} 
                  className={cn(
                    "border rounded-lg p-3 cursor-pointer transition-colors",
                    !message.read ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  )}
                  data-testid={`message-${message.id}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {message.senderName || 'Unknown Sender'}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(message.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {message.content || 'No content'}
                  </p>
                </div>
              ))}
              <Button variant="outline" className="w-full">
                View All Messages
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}