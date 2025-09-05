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
import { ThingsToApproveCard } from "@/components/things-to-approve-card";
import { EKGWaveform } from "@/components/ui/ekg-waveform";

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

  // Helper functions for heartbeat monitor
  const calculateAverageBPM = () => {
    if (!workOrders || !Array.isArray(workOrders) || workOrders.length === 0) return 75; // Baseline BPM
    
    // Get active work orders and projects for this company
    const activeOrders = workOrders.filter((order: any) => 
      order.status === 'in_progress' || order.status === 'scheduled' || order.status === 'confirmed'
    );
    
    if (activeOrders.length === 0) return 75; // Baseline BPM
    
    // Calculate average BPM from active work orders
    const totalBPM = activeOrders.reduce((sum: number, order: any) => {
      // Calculate BPM based on order urgency, status, and health
      let orderBPM = 75; // Base BPM
      
      if (order.priority === 'urgent') orderBPM += 25;
      else if (order.priority === 'high') orderBPM += 15;
      else if (order.priority === 'low') orderBPM -= 10;
      
      if (order.status === 'in_progress') orderBPM += 10;
      if (order.escalationCount > 0) orderBPM += (order.escalationCount * 5);
      
      return sum + orderBPM;
    }, 0);
    
    return Math.round(totalBPM / activeOrders.length);
  };
  
  const getCompanyHealthStatus = () => {
    if (!workOrders || !Array.isArray(workOrders) || workOrders.length === 0) return 'normal';
    
    const activeOrders = workOrders.filter((order: any) => 
      order.status === 'in_progress' || order.status === 'scheduled' || order.status === 'confirmed'
    );
    
    if (activeOrders.length === 0) return 'normal';
    
    const urgentOrders = activeOrders.filter((order: any) => order.priority === 'urgent').length;
    const escalatedOrders = activeOrders.filter((order: any) => order.escalationCount > 0).length;
    
    if (urgentOrders > 2 || escalatedOrders > 3) return 'critical';
    if (urgentOrders > 1 || escalatedOrders > 1) return 'at_risk';
    return 'normal';
  };
  
  const getHeartbeatDescription = () => {
    const avgBPM = calculateAverageBPM();
    const status = getCompanyHealthStatus();
    
    if (status === 'critical') {
      return `High stress detected (${avgBPM} BPM) - Multiple urgent work orders require immediate attention`;
    } else if (status === 'at_risk') {
      return `Elevated activity (${avgBPM} BPM) - Some work orders need monitoring`;
    } else {
      return `Normal operations (${avgBPM} BPM) - All work orders and projects running smoothly`;
    }
  };

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
          
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setLocation('/projects?status=active')}>
            <CardContent className="p-3 overflow-hidden">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                  <i className="fas fa-project-diagram text-purple-600 dark:text-purple-400 text-sm"></i>
                </div>
                <div className="ml-3 min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground truncate">Active Projects</p>
                  <p className="text-lg font-bold text-foreground truncate">
                    {statsLoading ? '...' : (stats as any)?.activeProjects || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <ThingsToApproveCard 
            userRole={(user as any)?.role || testingRole || 'administrator'}
            companyType="service"
          />
        </div>

        {/* Heartbeat Monitor for Administrator */}
        <div className="mt-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Company Heartbeat Monitor</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">Average BPM:</span>
                  <span className="text-lg font-bold text-foreground">
                    {workOrdersLoading ? '...' : calculateAverageBPM()}
                  </span>
                </div>
              </div>
              <div className="bg-black rounded-lg p-4 border border-gray-700">
                <EKGWaveform
                  bpm={workOrdersLoading ? 75 : calculateAverageBPM()}
                  status={getCompanyHealthStatus()}
                  severity="none"
                  frequency="occasional"
                  width={600}
                  height={120}
                  className="w-full"
                />
              </div>
              <div className="mt-3 text-sm text-muted-foreground text-center">
                {getHeartbeatDescription()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 sm:hidden">
          <div className="flex justify-around items-center max-w-md mx-auto">
            <Button variant="ghost" size="sm" onClick={() => setLocation('/admin-dashboard')} className="flex flex-col items-center space-y-1">
              <i className="fas fa-home text-lg"></i>
              <span className="text-xs">Home</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex flex-col items-center space-y-1 relative">
              <i className="fas fa-clipboard-check text-lg"></i>
              <span className="text-xs">Approve</span>
              {/* Badge for pending approvals */}
              {(stats as any)?.pendingApprovals > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs px-1 min-w-[16px] h-4 flex items-center justify-center">
                  {(stats as any)?.pendingApprovals}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation('/approved-payments')} className="flex flex-col items-center space-y-1">
              <i className="fas fa-dollar-sign text-lg"></i>
              <span className="text-xs">Payments</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation('/settings')} className="flex flex-col items-center space-y-1">
              <i className="fas fa-cog text-lg"></i>
              <span className="text-xs">Settings</span>
            </Button>
          </div>
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
