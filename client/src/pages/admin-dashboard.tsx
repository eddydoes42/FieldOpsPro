import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { hasRole, isOperationsDirector } from "../../../shared/schema";
import Navigation from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Get testing role from localStorage for role tester functionality
  const testingRole = localStorage.getItem('testingRole') || undefined;

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
    enabled: !!user && hasRole(user as any, 'administrator'),
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
      const response = await apiRequest(`/api/users/${userId}`, 'DELETE', {});
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

  // Check if user has administrator role OR is Operations Director testing this role
  const isOpsDirectorTesting = isOperationsDirector(user as any) && localStorage.getItem('testingRole') === 'administrator';
  const hasAdminAccess = hasRole(user as any, 'administrator') || isOpsDirectorTesting;
  
  if (!hasAdminAccess) {
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
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Dashboard Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Administrator Dashboard</h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setLocation('/team')}>
            <CardContent className="p-3 overflow-hidden">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                  <i className="fas fa-users text-blue-600 dark:text-blue-400 text-sm"></i>
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground truncate">Total Users</p>
                  <p className="text-lg font-bold text-foreground truncate">
                    {statsLoading ? '...' : (stats as any)?.totalUsers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setLocation('/work-orders?status=in_progress')}>
            <CardContent className="p-3 overflow-hidden">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                  <i className="fas fa-clipboard-check text-green-600 dark:text-green-400 text-sm"></i>
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground truncate">Active Work Orders</p>
                  <p className="text-lg font-bold text-foreground truncate">
                    {statsLoading ? '...' : (stats as any)?.activeOrders || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setLocation('/work-orders?status=completed')}>
            <CardContent className="p-3 overflow-hidden">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex-shrink-0">
                  <i className="fas fa-check-circle text-yellow-600 dark:text-yellow-400 text-sm"></i>
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground truncate">Completed Orders</p>
                  <p className="text-lg font-bold text-foreground truncate">
                    {statsLoading ? '...' : (stats as any)?.completedOrders || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-3 overflow-hidden">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                  <i className="fas fa-percentage text-purple-600 dark:text-purple-400 text-sm"></i>
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground truncate">Completion Rate</p>
                  <p className="text-lg font-bold text-foreground truncate">
                    {statsLoading ? '...' : (stats as any)?.totalOrders > 0 ? Math.round(((stats as any)?.completedOrders / (stats as any)?.totalOrders) * 100) + '%' : '0%'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Overview */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Team Overview</h3>
              <div className="space-y-4">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md p-2 transition-colors"
                  onClick={() => setLocation('/team?role=administrator')}
                >
                  <span className="text-sm font-medium text-muted-foreground">Administrators</span>
                  <span className="bg-purple-900/30 text-purple-300 text-xs font-medium px-2 py-1 rounded border border-purple-800/50">
                    {(stats as any)?.adminCount || 0}
                  </span>
                </div>
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md p-2 transition-colors"
                  onClick={() => setLocation('/team?role=manager')}
                >
                  <span className="text-sm font-medium text-muted-foreground">Managers</span>
                  <span className="bg-blue-900/30 text-blue-300 text-xs font-medium px-2 py-1 rounded border border-blue-800/50">
                    {(stats as any)?.managerCount || 0}
                  </span>
                </div>
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md p-2 transition-colors"
                  onClick={() => setLocation('/team?role=dispatcher')}
                >
                  <span className="text-sm font-medium text-muted-foreground">Dispatchers</span>
                  <span className="bg-orange-900/30 text-orange-300 text-xs font-medium px-2 py-1 rounded border border-orange-800/50">
                    {(stats as any)?.dispatcherCount || 0}
                  </span>
                </div>
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md p-2 transition-colors"
                  onClick={() => setLocation('/team?role=field_agent')}
                >
                  <span className="text-sm font-medium text-muted-foreground">Field Agents (FA)</span>
                  <span className="bg-green-900/30 text-green-300 text-xs font-medium px-2 py-1 rounded border border-green-800/50">
                    {(stats as any)?.agentCount || 0}
                  </span>
                </div>
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md p-2 transition-colors"
                  onClick={() => setLocation('/team?role=client')}
                >
                  <span className="text-sm font-medium text-muted-foreground">Clients</span>
                  <span className="bg-pink-900/30 text-pink-300 text-xs font-medium px-2 py-1 rounded border border-pink-800/50">
                    {(stats as any)?.clientCount || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
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
