import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/navigation";
import { useEffect } from "react";

interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  role: string;
  createdAt: string;
}

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  estimatedHours: number | null;
  createdAt: string;
  dueDate: string | null;
}

export default function TeamManagement() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();

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

  // Check if user has permission for role assignment (only administrators)
  const canAssignRoles = user && (user as any).role === 'administrator';

  const { data: teamMembers, isLoading: teamLoading, error: teamError } = useQuery<TeamMember[]>({
    queryKey: ["/api/users/role/field_agent"],
    retry: false,
  });

  const { data: workOrders, isLoading: ordersLoading, error: ordersError } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
    retry: false,
  });

  if (teamError && isUnauthorizedError(teamError as Error)) {
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

  if (isLoading || teamLoading || ordersLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Navigation userRole={(user as any)?.roles || ['manager']} />
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

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

  const getAgentWorkload = () => {
    if (!teamMembers || !workOrders) return [];
    
    return teamMembers.map(member => {
      const assignedOrders = workOrders.filter(order => order.assignedTo === member.id);
      const activeOrders = assignedOrders.filter(order => 
        order.status === 'pending' || order.status === 'in_progress'
      );
      const completedOrders = assignedOrders.filter(order => order.status === 'completed');
      
      return {
        ...member,
        totalAssigned: assignedOrders.length,
        activeOrders: activeOrders.length,
        completedOrders: completedOrders.length,
        completionRate: assignedOrders.length > 0 
          ? ((completedOrders.length / assignedOrders.length) * 100).toFixed(1)
          : '0'
      };
    });
  };

  const agentWorkloads = getAgentWorkload();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation userRole={(user as any)?.roles || ['manager']} />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Management</h1>
        </div>

        {/* Team Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Team Members</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{teamMembers?.length || 0}</p>
                </div>
                <i className="fas fa-users text-2xl text-blue-600 dark:text-blue-400"></i>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Work Orders</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {workOrders?.filter(order => 
                      order.status === 'pending' || order.status === 'in_progress'
                    ).length || 0}
                  </p>
                </div>
                <i className="fas fa-clipboard-list text-2xl text-green-600 dark:text-green-400"></i>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Completion Rate</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {workOrders && workOrders.length > 0 
                      ? ((workOrders.filter(order => order.status === 'completed').length / workOrders.length) * 100).toFixed(1)
                      : '0'
                    }%
                  </p>
                </div>
                <i className="fas fa-chart-line text-2xl text-purple-600 dark:text-purple-400"></i>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Members Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <i className="fas fa-users mr-4 text-blue-600 dark:text-blue-400"></i>
                <span className="text-foreground">Team Members</span>
              </div>
              <Button variant="outline" size="sm" className="text-xs px-3 py-1.5 -mt-1 ml-2 h-7" data-testid="add-user-button">
                <i className="fas fa-user-plus mr-1.5 text-xs"></i>
                Add Member
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>FA (Field Agent)</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Assigned</TableHead>
                    <TableHead>Active Orders</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Completion Rate</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentWorkloads.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {agent.profileImageUrl && (
                            <img 
                              className="h-8 w-8 rounded-full object-cover" 
                              src={agent.profileImageUrl} 
                              alt="Profile"
                            />
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {agent.firstName} {agent.lastName}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-300">{agent.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-foreground">{agent.totalAssigned}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300">{agent.activeOrders}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300">{agent.completedOrders}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-foreground">{agent.completionRate}%</span>
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-green-600 dark:bg-green-500 h-2 rounded-full" 
                              style={{ width: `${agent.completionRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <i className="fas fa-eye mr-1"></i>
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            <i className="fas fa-edit mr-1"></i>
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-clock mr-2 text-green-600 dark:text-green-400"></i>
              <span className="text-foreground">Recent Work Order Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workOrders?.slice(0, 5).map((order) => {
                const assignedAgent = teamMembers?.find(member => member.id === order.assignedTo);
                return (
                  <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{order.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Assigned to: {assignedAgent ? `${assignedAgent.firstName} ${assignedAgent.lastName}` : 'Unassigned'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={getPriorityColor(order.priority)}>
                        {order.priority.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}