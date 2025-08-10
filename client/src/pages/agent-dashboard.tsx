import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import TimeTracker from "@/components/time-tracker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { hasRole, isOperationsDirector } from "../../../shared/schema";

export default function AgentDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();

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

  const { data: workOrders, isLoading: workOrdersLoading } = useQuery({
    queryKey: ["/api/work-orders"],
    enabled: !!user,
  });

  const { data: activeTimeEntry } = useQuery({
    queryKey: ["/api/time-entries/active"],
    enabled: !!user,
  });

  const updateWorkOrderStatusMutation = useMutation({
    mutationFn: async ({ id, workStatus }: { id: string; workStatus: string }) => {
      await apiRequest("PATCH", `/api/work-orders/${id}/status`, { workStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders/assigned"] });
      toast({
        title: "Success",
        description: "Work order updated successfully.",
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
        description: "Failed to update work order.",
        variant: "destructive",
      });
    },
  });

  const startWorkOrder = (orderId: string) => {
    updateWorkOrderStatusMutation.mutate({
      id: orderId,
      workStatus: 'in_progress'
    });
  };

  const completeWorkOrder = (orderId: string) => {
    updateWorkOrderStatusMutation.mutate({
      id: orderId,
      workStatus: 'completed'
    });
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user can access field agent dashboard (either actual field agent or operations director testing)
  const testingRole = localStorage.getItem('testingRole');
  const canAccessAgentDashboard = hasRole(user as any, 'field_agent') || 
    (isOperationsDirector(user as any) && testingRole === 'field_agent') ||
    testingRole === 'field_agent';

  if (!canAccessAgentDashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
              <p className="text-muted-foreground">You don't have permission to access this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const todayOrders = (workOrders as any)?.filter((order: any) => {
    const today = new Date().toDateString();
    const orderDate = new Date(order.createdAt).toDateString();
    return orderDate === today || order.status === 'in_progress';
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Field Agent Dashboard</h1>
        </div>

        {/* Time Tracking Card */}
        <TimeTracker activeTimeEntry={activeTimeEntry} />

        {/* Today's Assignments */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Today's Assignments</h3>
              <span className="bg-blue-900/30 text-blue-300 text-sm font-medium px-3 py-1 rounded-full border border-blue-800/50">
                {todayOrders.length}
              </span>
            </div>
            
            <div className="space-y-4">
              {workOrdersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : todayOrders.length > 0 ? (
                todayOrders.map((order: any) => (
                  <div key={order.id} className="border border-border rounded-lg p-4 bg-card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{order.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{order.description}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${getStatusColor(order.status)}`}>
                        {order.status?.replace('_', ' ').replace(/\b\w/g, (l: any) => l.toUpperCase())}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <i className="fas fa-map-marker-alt mr-2 text-muted-foreground/70"></i>
                        <span>{order.location}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <i className="fas fa-clock mr-2 text-muted-foreground/70"></i>
                        <span>Est. {order.estimatedHours || 'TBD'} hours</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <i className="fas fa-exclamation-circle mr-2 text-muted-foreground/70"></i>
                        <span>{order.priority} Priority</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <i className="fas fa-calendar mr-2 text-muted-foreground/70"></i>
                        <span>Due: {order.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'No due date'}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-3">
                      {order.status === 'pending' ? (
                        <Button 
                          onClick={() => startWorkOrder(order.id)}
                          disabled={updateWorkOrderStatusMutation.isPending}
                          className="flex-1 text-sm"
                        >
                          <i className="fas fa-play mr-2"></i>Start Work
                        </Button>
                      ) : order.status === 'in_progress' ? (
                        <Button 
                          onClick={() => completeWorkOrder(order.id)}
                          disabled={updateWorkOrderStatusMutation.isPending}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
                        >
                          <i className="fas fa-check mr-2"></i>Complete
                        </Button>
                      ) : (
                        <Button variant="outline" disabled className="flex-1 text-sm">
                          <i className="fas fa-check-circle mr-2"></i>Completed
                        </Button>
                      )}
                      <Button variant="secondary" className="flex-1 text-sm">
                        <i className="fas fa-comment mr-2"></i>Message Team
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No assignments scheduled for today
                </div>
              )}
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'scheduled': return 'bg-purple-900/30 text-purple-300 border border-purple-800/50';
    case 'confirmed': return 'bg-blue-900/30 text-blue-300 border border-blue-800/50';
    case 'in_progress': return 'bg-orange-900/30 text-orange-300 border border-orange-800/50';
    case 'pending': return 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50';
    case 'completed': return 'bg-green-900/30 text-green-300 border border-green-800/50';
    case 'cancelled': return 'bg-red-900/30 text-red-300 border border-red-800/50';
    default: return 'bg-secondary/30 text-muted-foreground border border-border';
  }
}
