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
    enabled: !!user && (user.role === 'manager' || user.role === 'administrator'),
  });

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user.role !== 'manager' && user.role !== 'administrator') {
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
      <Navigation userRole={user.role} />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="mt-1 text-gray-600">Manage your team and create work orders</p>
        </div>

        {/* Action Buttons Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Button 
            onClick={() => setShowOnboarding(true)}
            className="bg-primary hover:bg-blue-700 text-white p-6 h-auto text-left"
          >
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg mr-4">
                <i className="fas fa-user-plus text-blue-600 text-xl"></i>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Onboard New Agent</h3>
                <p className="text-blue-100 text-sm">Add a new field agent to your team</p>
              </div>
            </div>
          </Button>
          
          <Button 
            onClick={() => setShowWorkOrderForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white p-6 h-auto text-left"
          >
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg mr-4">
                <i className="fas fa-plus text-green-600 text-xl"></i>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Create Work Order</h3>
                <p className="text-green-100 text-sm">Assign new tasks to field agents</p>
              </div>
            </div>
          </Button>
          
          <Button variant="secondary" className="p-6 h-auto text-left">
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
          {/* My Team */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                My Team ({fieldAgents?.length || 0} Agents)
              </h3>
              <div className="space-y-4">
                {fieldAgents && fieldAgents.length > 0 ? (
                  fieldAgents.slice(0, 5).map((agent: any) => (
                    <div key={agent.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {agent.profileImageUrl ? (
                          <img className="h-10 w-10 rounded-full object-cover" src={agent.profileImageUrl} alt="Team Member" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <i className="fas fa-user text-gray-600"></i>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{agent.firstName} {agent.lastName}</p>
                          <p className="text-sm text-gray-600">Field Technician</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <i className="fas fa-circle text-xs mr-1"></i>Active
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No team members found
                  </div>
                )}
                
                {fieldAgents && fieldAgents.length > 5 && (
                  <Button variant="outline" className="w-full mt-4">
                    View All Team Members
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Work Orders */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Active Work Orders</h3>
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                  {workOrders?.filter((order: any) => order.status === 'pending' || order.status === 'in_progress').length || 0}
                </span>
              </div>
              
              <div className="space-y-4">
                {workOrdersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : workOrders && workOrders.length > 0 ? (
                  workOrders
                    .filter((order: any) => order.status === 'pending' || order.status === 'in_progress')
                    .slice(0, 3)
                    .map((order: any) => (
                      <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{order.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {order.assigneeId ? `Assigned to ${order.assigneeId}` : 'Unassigned'}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              Created: {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="ml-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center text-xs text-gray-500">
                            <i className="fas fa-map-marker-alt mr-1"></i>
                            <span>{order.location}</span>
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <i className="fas fa-clock mr-1"></i>
                            <span>Est. {order.estimatedHours || 'TBD'} hours</span>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No active work orders
                  </div>
                )}
                
                <Button variant="outline" className="w-full mt-4">
                  View All Work Orders
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
