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

export default function ManagerDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWorkOrderForm, setShowWorkOrderForm] = useState(false);

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

  const getAgentName = (assigneeId: string | null) => {
    if (!assigneeId) return 'Unassigned';
    const agent = (fieldAgents as any)?.find((a: any) => a.id === assigneeId);
    return agent ? `${agent.firstName} ${agent.lastName}` : assigneeId;
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
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
              <p className="text-gray-600">You don't have permission to access this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userRole={(user as any).role} />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="mt-1 text-gray-600">Manage your team and view work orders</p>
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
            variant="secondary" 
            className="p-6 h-auto text-left"
          >
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg mr-4">
                <i className="fas fa-chart-line text-purple-600 text-xl"></i>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Team Reports</h3>
                <p className="text-gray-600 text-sm">View team performance metrics</p>
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
                <h3 className="text-lg font-semibold text-gray-900">Priority Tasks</h3>
                <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">
                  {(workOrders as any)?.filter((order: any) => order.priority === 'high' && (order.status === 'pending' || order.status === 'in_progress')).length || 0}
                </span>
              </div>
              <div className="space-y-4">
                {workOrdersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : workOrders && (workOrders as any).length > 0 ? (
                  (workOrders as any)
                    .filter((order: any) => order.priority === 'high' && (order.status === 'pending' || order.status === 'in_progress'))
                    .slice(0, 4)
                    .map((order: any) => (
                      <div key={order.id} className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{order.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{order.location || 'No location'}</p>
                            <div className="flex items-center mt-2 space-x-4">
                              <span className="text-xs text-gray-500">
                                <i className="fas fa-user mr-1"></i>
                                {getAgentName(order.assigneeId) || 'Unassigned'}
                              </span>
                              <span className="text-xs text-gray-500">
                                <i className="fas fa-clock mr-1"></i>
                                {order.estimatedHours || 'TBD'} hrs
                              </span>
                            </div>
                          </div>
                          <div className="ml-4 flex flex-col items-end">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              HIGH
                            </span>
                            {order.dueDate && (
                              <span className="text-xs text-gray-500 mt-1">
                                Due: {new Date(order.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No high priority tasks
                  </div>
                )}
                
                <Button variant="outline" className="w-full mt-4" onClick={() => window.location.href = "/work-orders"}>
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  View All Priority Tasks
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Issues/Problems */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Active Issues</h3>
                <span className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full">
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
                      <div key={order.id} className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded-r-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{order.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{order.description}</p>
                            <div className="flex items-center mt-2 space-x-4">
                              <span className="text-xs text-gray-500">
                                <i className="fas fa-map-marker-alt mr-1"></i>
                                {order.location || 'No location'}
                              </span>
                              <span className="text-xs text-gray-500">
                                <i className="fas fa-user mr-1"></i>
                                {getAgentName(order.assigneeId) || 'Unassigned'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4 flex flex-col items-end">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                              {order.priority.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">
                              {order.status === 'in_progress' ? 'Working' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
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
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'in_progress': return 'bg-blue-100 text-blue-800';
    case 'completed': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}


