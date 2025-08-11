import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Home, ArrowLeft, Clock, CheckCircle, AlertCircle, MessageCircle, MapPin, Calendar, User } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  estimatedHours: number | null;
  createdAt: string;
  dueDate: string | null;
  scopeOfWork: string | null;
  requiredTools: string | null;
  pointOfContact: string | null;
  workStatus: string;
}

export default function FieldAgentWork() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [isWorkOrderDialogOpen, setIsWorkOrderDialogOpen] = useState(false);

  // Fetch work orders assigned to the current field agent
  const { data: workOrders = [], isLoading: workOrdersLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders/assigned"],
    enabled: !!user,
  });

  // Filter work orders assigned to this specific field agent
  const myWorkOrders = workOrders.filter(order => order.assigneeId === (user as any)?.id);

  const updateWorkOrderStatusMutation = useMutation({
    mutationFn: async ({ id, workStatus }: { id: string; workStatus: string }) => {
      await apiRequest("PATCH", `/api/work-orders/${id}/status`, { workStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders/assigned"] });
      toast({
        title: "Success",
        description: "Work order status updated successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
        description: "Failed to update work order status.",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    updateWorkOrderStatusMutation.mutate({ id: orderId, workStatus: newStatus });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'scheduled': { color: 'bg-blue-100 text-blue-800', label: 'Scheduled' },
      'in_progress': { color: 'bg-yellow-100 text-yellow-800', label: 'In Progress' },
      'completed': { color: 'bg-green-100 text-green-800', label: 'Completed' },
      'assigned': { color: 'bg-purple-100 text-purple-800', label: 'Assigned' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-100 text-gray-800', label: status };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getWorkStatusBadge = (workStatus: string) => {
    const statusConfig = {
      'not_started': { color: 'bg-gray-100 text-gray-800', label: 'Not Started', icon: <AlertCircle className="h-3 w-3 mr-1" /> },
      'in_route': { color: 'bg-blue-100 text-blue-800', label: 'In Route', icon: <Clock className="h-3 w-3 mr-1" /> },
      'checked_in': { color: 'bg-yellow-100 text-yellow-800', label: 'Checked In', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      'checked_out': { color: 'bg-purple-100 text-purple-800', label: 'Checked Out', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      'completed': { color: 'bg-green-100 text-green-800', label: 'Completed', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    };
    
    const config = statusConfig[workStatus as keyof typeof statusConfig] || { 
      color: 'bg-gray-100 text-gray-800', 
      label: workStatus, 
      icon: <AlertCircle className="h-3 w-3 mr-1" /> 
    };
    
    return (
      <Badge className={config.color + " flex items-center"}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      'low': { color: 'bg-green-100 text-green-800', label: 'Low' },
      'medium': { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
      'high': { color: 'bg-orange-100 text-orange-800', label: 'High' },
      'urgent': { color: 'bg-red-100 text-red-800', label: 'Urgent' },
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig] || { color: 'bg-gray-100 text-gray-800', label: priority };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Unauthorized</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-1 hover:bg-accent"
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center space-x-1 hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Work</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Work orders assigned to you
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {myWorkOrders.length} Active Orders
              </Badge>
            </div>
          </div>
        </div>

        {/* Work Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myWorkOrders.map((order) => (
            <Card 
              key={order.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedWorkOrder(order);
                setIsWorkOrderDialogOpen(true);
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {order.title}
                  </CardTitle>
                  {getPriorityBadge(order.priority)}
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  {getStatusBadge(order.status)}
                  {getWorkStatusBadge(order.workStatus)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {order.description}
                </p>
                
                {order.dueDate && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Due: {format(new Date(order.dueDate), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
                
                {order.estimatedHours && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      Est. {order.estimatedHours}h
                    </span>
                  </div>
                )}

                {/* Work Status Action Buttons */}
                <div className="flex flex-col space-y-2 mt-4">
                  {order.workStatus === 'not_started' && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate(order.id, 'in_route');
                      }}
                      disabled={updateWorkOrderStatusMutation.isPending}
                    >
                      Start Route
                    </Button>
                  )}
                  
                  {order.workStatus === 'in_route' && (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate(order.id, 'checked_in');
                      }}
                      disabled={updateWorkOrderStatusMutation.isPending}
                    >
                      Check In
                    </Button>
                  )}
                  
                  {order.workStatus === 'checked_in' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate(order.id, 'checked_out');
                      }}
                      disabled={updateWorkOrderStatusMutation.isPending}
                    >
                      Check Out
                    </Button>
                  )}
                  
                  {order.workStatus === 'checked_out' && (
                    <Button
                      size="sm"
                      variant="default"
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate(order.id, 'completed');
                      }}
                      disabled={updateWorkOrderStatusMutation.isPending}
                    >
                      Mark Complete
                    </Button>
                  )}
                  
                  {/* Message Team Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/messages');
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message Team
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {myWorkOrders.length === 0 && !workOrdersLoading && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                <div className="h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Clock className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No work orders assigned</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    You don't have any work orders assigned to you at the moment.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {workOrdersLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Work Order Details Dialog */}
      <Dialog open={isWorkOrderDialogOpen} onOpenChange={setIsWorkOrderDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <span>{selectedWorkOrder?.title}</span>
              {selectedWorkOrder && getPriorityBadge(selectedWorkOrder.priority)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedWorkOrder && (
            <div className="space-y-6">
              {/* Status and Work Status */}
              <div className="flex items-center space-x-4">
                {getStatusBadge(selectedWorkOrder.status)}
                {getWorkStatusBadge(selectedWorkOrder.workStatus)}
              </div>

              {/* Description */}
              <div>
                <h4 className="font-medium text-foreground mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedWorkOrder.description || "No description provided"}
                </p>
              </div>

              {/* Work Details */}
              <div className="grid grid-cols-2 gap-4">
                {selectedWorkOrder.dueDate && (
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Due Date</p>
                      <p className="text-sm font-medium">
                        {format(new Date(selectedWorkOrder.dueDate), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                )}
                
                {selectedWorkOrder.estimatedHours && (
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Estimated Hours</p>
                      <p className="text-sm font-medium">{selectedWorkOrder.estimatedHours}h</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Details */}
              {selectedWorkOrder.scopeOfWork && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Scope of Work</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedWorkOrder.scopeOfWork}
                  </p>
                </div>
              )}

              {selectedWorkOrder.requiredTools && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Required Tools</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedWorkOrder.requiredTools}
                  </p>
                </div>
              )}

              {selectedWorkOrder.pointOfContact && (
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Point of Contact</p>
                    <p className="text-sm font-medium">{selectedWorkOrder.pointOfContact}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/messages')}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message Team
                </Button>
                
                {/* Status Update Button */}
                {selectedWorkOrder.workStatus === 'not_started' && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleStatusUpdate(selectedWorkOrder.id, 'in_route');
                      setIsWorkOrderDialogOpen(false);
                    }}
                    disabled={updateWorkOrderStatusMutation.isPending}
                  >
                    Start Route
                  </Button>
                )}
                
                {selectedWorkOrder.workStatus === 'in_route' && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleStatusUpdate(selectedWorkOrder.id, 'checked_in');
                      setIsWorkOrderDialogOpen(false);
                    }}
                    disabled={updateWorkOrderStatusMutation.isPending}
                  >
                    Check In
                  </Button>
                )}
                
                {selectedWorkOrder.workStatus === 'checked_in' && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      handleStatusUpdate(selectedWorkOrder.id, 'checked_out');
                      setIsWorkOrderDialogOpen(false);
                    }}
                    disabled={updateWorkOrderStatusMutation.isPending}
                  >
                    Check Out
                  </Button>
                )}
                
                {selectedWorkOrder.workStatus === 'checked_out' && (
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      handleStatusUpdate(selectedWorkOrder.id, 'completed');
                      setIsWorkOrderDialogOpen(false);
                    }}
                    disabled={updateWorkOrderStatusMutation.isPending}
                  >
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}