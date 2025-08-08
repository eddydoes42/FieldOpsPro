import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
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

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!user && (user as any).role === 'administrator',
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setLocation('/team')}>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <i className="fas fa-users text-blue-600 dark:text-blue-400 text-sm"></i>
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-muted-foreground">Total Users</p>
                  <p className="text-lg font-bold text-foreground">
                    {statsLoading ? '...' : (stats as any)?.totalUsers || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setLocation('/work-orders')}>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <i className="fas fa-clipboard-check text-green-600 dark:text-green-400 text-sm"></i>
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-muted-foreground">Active Work Orders</p>
                  <p className="text-lg font-bold text-foreground">
                    {statsLoading ? '...' : (stats as any)?.activeOrders || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setLocation('/work-orders')}>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <i className="fas fa-check-circle text-yellow-600 dark:text-yellow-400 text-sm"></i>
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-muted-foreground">Completed Orders</p>
                  <p className="text-lg font-bold text-foreground">
                    {statsLoading ? '...' : (stats as any)?.completedOrders || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <i className="fas fa-percentage text-purple-600 dark:text-purple-400 text-sm"></i>
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-muted-foreground">Completion Rate</p>
                  <p className="text-lg font-bold text-foreground">
                    {statsLoading ? '...' : (stats as any)?.totalOrders > 0 ? Math.round(((stats as any)?.completedOrders / (stats as any)?.totalOrders) * 100) + '%' : '0%'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
