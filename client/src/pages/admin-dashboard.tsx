import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

export default function AdminDashboard() {
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

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user && (user as any).role === 'administrator',
  });

  const { data: workOrders, isLoading: workOrdersLoading } = useQuery({
    queryKey: ["/api/work-orders"],
    enabled: !!user,
  });

  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: !!user && (user as any).role === 'administrator',
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('DELETE', `/api/users/${userId}`, {});
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: any) => {
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
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if ((user as any).role !== 'administrator') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
              <p className="text-muted-foreground">You do not have permission to access this page.</p>
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
        {/* Dashboard Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Administrator Dashboard</h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-100">
                  <i className="fas fa-users text-blue-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? '...' : (stats as any)?.totalUsers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-100">
                  <i className="fas fa-clipboard-check text-green-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Active Work Orders</p>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? '...' : (stats as any)?.activeOrders || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-yellow-100">
                  <i className="fas fa-check-circle text-yellow-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Completed Orders</p>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? '...' : (stats as any)?.completedOrders || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-100">
                  <i className="fas fa-percentage text-purple-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? '...' : (stats as any)?.totalOrders > 0 ? Math.round(((stats as any)?.completedOrders / (stats as any)?.totalOrders) * 100) + '%' : '0%'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Work Orders */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-foreground">Recent Work Orders</h3>
                  <Button variant="outline" size="sm">View All</Button>
                </div>
                
                <div className="space-y-4">
                  {workOrdersLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : workOrders && (workOrders as any).length > 0 ? (
                    (workOrders as any).slice(0, 5).map((order: any) => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg overflow-hidden">
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <i className={`fas ${getPriorityIcon(order.priority)} text-blue-600 dark:text-blue-400`}></i>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground truncate">{order.title}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {order.assigneeId ? `Assigned to: ${order.assigneeId}` : 'Unassigned'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1 whitespace-nowrap">
                            {order.dueDate ? new Date(order.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No work orders found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Team Overview */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button className="w-full justify-center">
                    <i className="fas fa-user-plus mr-2"></i>Add New User
                  </Button>
                  <Button className="w-full bg-green-600 hover:bg-green-700 justify-center">
                    <i className="fas fa-plus mr-2"></i>Create Work Order
                  </Button>
                  <Button variant="secondary" className="w-full justify-center">
                    <i className="fas fa-download mr-2"></i>Export Reports
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Team Overview */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Team Overview</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Administrators</span>
                    <span className="bg-purple-900/30 text-purple-300 text-xs font-medium px-2 py-1 rounded border border-purple-800/50">
                      {(stats as any)?.adminCount || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Managers</span>
                    <span className="bg-blue-900/30 text-blue-300 text-xs font-medium px-2 py-1 rounded border border-blue-800/50">
                      {(stats as any)?.managerCount || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Field Agents (FA)</span>
                    <span className="bg-green-900/30 text-green-300 text-xs font-medium px-2 py-1 rounded border border-green-800/50">
                      {(stats as any)?.agentCount || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* User Management Section */}
        <div className="mt-8">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">User Management</h3>
              {usersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {allUsers && (allUsers as any[]).map((userData) => (
                    <div key={userData.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <i className="fas fa-user text-primary"></i>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              variant="secondary" 
                              className={
                                userData.role === 'administrator' 
                                  ? 'bg-purple-900/30 text-purple-300 border-purple-800/50'
                                  : userData.role === 'manager'
                                  ? 'bg-blue-900/30 text-blue-300 border-blue-800/50'
                                  : 'bg-green-900/30 text-green-300 border-green-800/50'
                              }
                            >
                              {userData.role === 'field_agent' ? 'FA' : 
                               userData.role === 'administrator' ? 'Admin' :
                               userData.role === 'manager' ? 'Manager' : 'Unknown'}
                            </Badge>
                            <h4 className="font-medium text-foreground">
                              {userData.firstName && userData.lastName 
                                ? `${userData.firstName} ${userData.lastName}`
                                : userData.email || 'Unknown User'
                              }
                            </h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {userData.email || 'No email'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created: {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {userData.id !== (user as any)?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={deleteUserMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete User
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the account for{' '}
                                  <strong>
                                    {userData.firstName && userData.lastName 
                                      ? `${userData.firstName} ${userData.lastName}`
                                      : userData.email || 'this user'
                                    }
                                  </strong>
                                  ? This action is <strong>irreversible</strong> and will permanently remove:
                                  <br /><br />
                                  • User account and profile information
                                  <br />
                                  • Work order assignments (reassigned to unassigned)
                                  <br />
                                  • Time tracking history
                                  <br />
                                  • Message history
                                  <br /><br />
                                  <strong>This cannot be undone.</strong>
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUserMutation.mutate(userData.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete Account
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {userData.id === (user as any)?.id && (
                          <Badge variant="outline" className="text-xs">
                            Current User
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!allUsers || (allUsers as any[]).length === 0) && (
                    <div className="text-center py-8">
                      <i className="fas fa-users text-4xl text-muted-foreground mb-4"></i>
                      <p className="text-muted-foreground">No users found</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getPriorityIcon(priority: string) {
  switch (priority) {
    case 'urgent': return 'fa-exclamation-triangle';
    case 'high': return 'fa-arrow-up';
    case 'medium': return 'fa-minus';
    case 'low': return 'fa-arrow-down';
    default: return 'fa-tasks';
  }
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
