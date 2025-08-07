import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/navigation";
import UserOnboardingForm from "@/components/user-onboarding-form";
import WorkOrderForm from "@/components/work-order-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function ManagerDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWorkOrderForm, setShowWorkOrderForm] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [, setLocation] = useLocation();

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

  const { data: fieldAgents } = useQuery({
    queryKey: ["/api/users/role/field_agent"],
    enabled: !!user && ((user as any).role === 'manager' || (user as any).role === 'administrator'),
  });

  const { data: allIssues } = useQuery({
    queryKey: ["/api/issues"],
    enabled: !!user && ((user as any).role === 'manager' || (user as any).role === 'administrator'),
  });

  const getAgentName = (assigneeId: string | null) => {
    if (!assigneeId) return 'Unassigned';
    const agent = (fieldAgents as any)?.find((a: any) => a.id === assigneeId);
    return agent ? `${agent.firstName} ${agent.lastName}` : assigneeId;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-300';
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if ((user as any).role !== 'manager' && (user as any).role !== 'administrator') {
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={(user as any).role} />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Manager Dashboard</h1>
        </div>

        {/* Action Buttons Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Button 
            onClick={() => window.location.href = "/team"}
            className="bg-primary hover:bg-blue-700 text-white p-6 h-auto text-left"
          >
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg mr-4">
                <i className="fas fa-users text-blue-600 text-xl"></i>
              </div>
              <div>
                <h3 className="font-semibold text-lg">My Team</h3>
                <p className="text-blue-100 text-sm">View and manage your team members</p>
              </div>
            </div>
          </Button>
          
          <Button 
            onClick={() => window.location.href = "/work-orders"}
            className="bg-green-600 hover:bg-green-700 text-white p-6 h-auto text-left"
          >
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg mr-4">
                <i className="fas fa-clipboard-list text-green-600 text-xl"></i>
              </div>
              <div>
                <h3 className="font-semibold text-lg">View Work Orders</h3>
                <p className="text-green-100 text-sm">Manage and track all work orders</p>
              </div>
            </div>
          </Button>
          
          <Button 
            onClick={() => window.location.href = "/reports/team"}
            className="bg-purple-600 hover:bg-purple-700 text-white p-6 h-auto text-left"
          >
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg mr-4">
                <i className="fas fa-chart-line text-purple-600 text-xl"></i>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Team Reports</h3>
                <p className="text-purple-100 text-sm">View team performance metrics</p>
              </div>
            </div>
          </Button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Priority Tasks */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Priority Tasks</h3>
                <span className="bg-red-900/30 text-red-300 text-sm font-medium px-3 py-1 rounded-full border border-red-800/50">
                  {(() => {
                    const highPriorityCount = (workOrders as any)?.filter((order: any) => order.priority === 'high' && (order.status === 'pending' || order.status === 'in_progress')).length || 0;
                    const workOrdersWithIssues = (allIssues as any)?.filter((issue: any) => issue.status === 'open').map((issue: any) => issue.workOrderId) || [];
                    const uniqueWorkOrdersWithIssues = Array.from(new Set(workOrdersWithIssues));
                    const issueWorkOrders = (workOrders as any)?.filter((order: any) => uniqueWorkOrdersWithIssues.includes(order.id) && (order.status === 'pending' || order.status === 'in_progress')) || [];
                    const combinedCount = highPriorityCount + issueWorkOrders.filter((order: any) => order.priority !== 'high').length;
                    return combinedCount;
                  })()}
                </span>
              </div>
              <div className="space-y-4">
                {workOrdersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : workOrders && (workOrders as any).length > 0 ? (
                  (() => {
                    const highPriorityOrders = (workOrders as any)?.filter((order: any) => order.priority === 'high' && (order.status === 'pending' || order.status === 'in_progress')) || [];
                    const workOrdersWithIssues = (allIssues as any)?.filter((issue: any) => issue.status === 'open').map((issue: any) => issue.workOrderId) || [];
                    const uniqueWorkOrdersWithIssues = Array.from(new Set(workOrdersWithIssues));
                    const issueWorkOrders = (workOrders as any)?.filter((order: any) => uniqueWorkOrdersWithIssues.includes(order.id) && (order.status === 'pending' || order.status === 'in_progress') && order.priority !== 'high') || [];
                    return [...highPriorityOrders, ...issueWorkOrders].slice(0, 4);
                  })()
                    .map((order: any) => (
                      <div 
                        key={order.id} 
                        className="border-l-4 border-red-500 bg-red-900/20 p-4 rounded-r-lg border border-red-800/30 cursor-pointer hover:bg-red-900/30 transition-colors"
                        onClick={() => {
                          setSelectedWorkOrder(order);
                          setIsViewDialogOpen(true);
                        }}
                      >
                        <div className="flex items-start justify-between overflow-hidden">
                          <div className="flex-1 min-w-0 pr-3">
                            <h4 className="font-medium text-foreground hover:text-red-300 truncate">{order.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1 truncate">{order.location || 'No location'}</p>
                            <div className="flex items-center mt-2 space-x-4">
                              <span className="text-xs text-muted-foreground truncate">
                                👤 {getAgentName(order.assigneeId) || 'Unassigned'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                🕐 {order.estimatedHours || 'TBD'} hrs
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0 flex flex-col items-end">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-300 border border-red-800/50 whitespace-nowrap mb-1">
                              {order.priority.toUpperCase()}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(order.status)}`}>
                              {order.status?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </span>
                            {order.dueDate && (
                              <span className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                                {new Date(order.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No high priority tasks
                  </div>
                )}
                
                <Button variant="outline" className="w-full mt-4" onClick={() => setLocation('/work-orders')}>
                  📋 View All Work Orders
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Issues/Problems */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">Active Issues</h3>
                <span className="bg-orange-900/30 text-orange-300 text-sm font-medium px-3 py-1 rounded-full border border-orange-800/50">
                  {(workOrders as any)?.filter((order: any) => (order.status === 'in_progress' || order.status === 'pending') && (order.title.toLowerCase().includes('issue') || order.title.toLowerCase().includes('problem') || order.title.toLowerCase().includes('outage') || order.title.toLowerCase().includes('down') || order.title.toLowerCase().includes('failure'))).length || 0}
                </span>
              </div>
              
              <div className="space-y-4">
                {workOrdersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : workOrders && (workOrders as any).length > 0 ? (
                  (workOrders as any)
                    .filter((order: any) => (order.status === 'in_progress' || order.status === 'pending') && 
                      (order.title.toLowerCase().includes('issue') || 
                       order.title.toLowerCase().includes('problem') || 
                       order.title.toLowerCase().includes('outage') || 
                       order.title.toLowerCase().includes('down') || 
                       order.title.toLowerCase().includes('failure') ||
                       order.title.toLowerCase().includes('repair') ||
                       order.title.toLowerCase().includes('fix')))
                    .slice(0, 4)
                    .map((order: any) => (
                      <div key={order.id} className="border-l-4 border-orange-500 bg-orange-900/20 p-4 rounded-r-lg border border-orange-800/30">
                        <div className="flex items-start justify-between overflow-hidden">
                          <div className="flex-1 min-w-0 pr-3">
                            <h4 className="font-medium text-foreground truncate">{order.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1 truncate">{order.description}</p>
                            <div className="flex items-center mt-2 space-x-4">
                              <span className="text-xs text-muted-foreground truncate">
                                <i className="fas fa-map-marker-alt mr-1"></i>
                                {order.location || 'No location'}
                              </span>
                              <span className="text-xs text-muted-foreground truncate">
                                <i className="fas fa-user mr-1"></i>
                                {getAgentName(order.assigneeId) || 'Unassigned'}
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0 flex flex-col items-end">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap mb-1 ${getPriorityColor(order.priority)}`}>
                              {order.priority.toUpperCase()}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(order.status)}`}>
                              {order.status?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </span>
                            {order.dueDate && (
                              <span className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                                {new Date(order.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No active issues reported
                  </div>
                )}
                
                <Button variant="outline" className="w-full mt-4" onClick={() => window.location.href = "/work-orders"}>
                  <i className="fas fa-exclamation-circle mr-2"></i>
                  View All Issues
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      {showOnboarding && (
        <UserOnboardingForm 
          onClose={() => setShowOnboarding(false)}
          onSuccess={() => {
            setShowOnboarding(false);
            toast({
              title: "Success",
              description: "New user has been onboarded successfully.",
            });
          }}
        />
      )}

      {showWorkOrderForm && (
        <WorkOrderForm 
          onClose={() => setShowWorkOrderForm(false)}
          onSuccess={() => {
            setShowWorkOrderForm(false);
            toast({
              title: "Success",
              description: "Work order has been created successfully.",
            });
          }}
        />
      )}

      {/* Work Order Detail Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📋 Work Order Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedWorkOrder && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{(selectedWorkOrder as any).title}</h2>
                  <p className="text-sm text-muted-foreground">ID: {(selectedWorkOrder as any).id}</p>
                </div>
                <div className="flex gap-2">
                  <Badge className={getStatusColor((selectedWorkOrder as any).status)}>
                    {(selectedWorkOrder as any).status.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge className={getPriorityColor((selectedWorkOrder as any).priority)}>
                    {(selectedWorkOrder as any).priority.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="mt-1 text-foreground">{(selectedWorkOrder as any).description || 'No description provided'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Location</label>
                    <p className="mt-1 text-foreground">{(selectedWorkOrder as any).location || 'No location specified'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Assigned Agent</label>
                    <p className="mt-1 text-foreground">{getAgentName((selectedWorkOrder as any).assigneeId)}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Estimated Hours</label>
                    <p className="mt-1 text-foreground">{(selectedWorkOrder as any).estimatedHours ? `${(selectedWorkOrder as any).estimatedHours} hours` : 'Not specified'}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                    <p className="mt-1 text-foreground">
                      {(selectedWorkOrder as any).dueDate 
                        ? new Date((selectedWorkOrder as any).dueDate).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : 'No due date set'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <p className="mt-1 text-foreground">
                      {(selectedWorkOrder as any).createdAt 
                        ? new Date((selectedWorkOrder as any).createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Unknown'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setIsViewDialogOpen(false);
                  setLocation('/work-orders');
                }}>
                  📋 View All Work Orders
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return 'bg-yellow-900/30 text-yellow-300 border-yellow-800/50';
    case 'in_progress': return 'bg-blue-900/30 text-blue-300 border-blue-800/50';
    case 'completed': return 'bg-green-900/30 text-green-300 border-green-800/50';
    case 'cancelled': return 'bg-red-900/30 text-red-300 border-red-800/50';
    default: return 'bg-gray-900/30 text-gray-300 border-gray-800/50';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high': return 'bg-red-900/30 text-red-300 border-red-800/50';
    case 'medium': return 'bg-yellow-900/30 text-yellow-300 border-yellow-800/50';
    case 'low': return 'bg-green-900/30 text-green-300 border-green-800/50';
    default: return 'bg-gray-900/30 text-gray-300 border-gray-800/50';
  }
}


