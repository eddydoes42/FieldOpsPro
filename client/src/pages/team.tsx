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
import { Trash2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TeamPage() {
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

  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: !!user && ((user as any).role === 'manager' || (user as any).role === 'administrator'),
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

  if ((user as any).role !== 'manager' && (user as any).role !== 'administrator') {
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation((user as any).role === 'administrator' ? '/admin' : '/manager')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
            <p className="text-muted-foreground mt-2">Manage your team members and their accounts</p>
          </div>
        </div>

        {/* Team Members Section */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Team Members</h3>
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
                {allUsers && (allUsers as any[]).map((userData: any) => (
                  <div key={userData.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 overflow-hidden">
                    <div className="flex items-center space-x-4 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-user text-primary"></i>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-foreground truncate">
                          {userData.firstName && userData.lastName 
                            ? `${userData.firstName} ${userData.lastName}`
                            : userData.email || 'Unknown User'
                          }
                        </h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {userData.email || 'No email'}
                        </p>
                        <div className="flex items-center space-x-2 mt-1 flex-wrap">
                          <Badge 
                            variant="secondary" 
                            className={`${
                              userData.role === 'administrator' 
                                ? 'bg-purple-900/30 text-purple-300 border-purple-800/50'
                                : userData.role === 'manager'
                                ? 'bg-blue-900/30 text-blue-300 border-blue-800/50'
                                : 'bg-green-900/30 text-green-300 border-green-800/50'
                            } flex-shrink-0`}
                          >
                            {userData.role === 'field_agent' ? 'Field_agent' : 
                             userData.role?.charAt(0).toUpperCase() + userData.role?.slice(1) || 'Unknown'}
                          </Badge>
                          <p className="text-xs text-muted-foreground truncate">
                            Created: {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {userData.id !== (user as any)?.id && userData.role !== 'administrator' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 whitespace-nowrap"
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
                      {userData.role === 'administrator' && (user as any).role !== 'administrator' && (
                        <Badge variant="outline" className="text-xs bg-purple-900/20 text-purple-300">
                          Administrator (Cannot Delete)
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {(!allUsers || (allUsers as any[]).length === 0) && (
                  <div className="text-center py-8">
                    <i className="fas fa-users text-4xl text-muted-foreground mb-4"></i>
                    <p className="text-muted-foreground">No team members found</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}