import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, ArrowLeft, Phone, MapPin, Mail, Briefcase, UserX, Edit2, UserPlus, Home } from "lucide-react";
import { useLocation } from "wouter";
import { hasAnyRole, canManageUsers } from "../../../shared/schema";

export default function TeamPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editedUser, setEditedUser] = useState<any>({});
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  // Check URL parameters for initial role, status, and company filters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');
    const statusParam = urlParams.get('status');
    const companyParam = urlParams.get('company');
    
    if (roleParam && ['administrator', 'manager', 'dispatcher', 'field_agent'].includes(roleParam)) {
      setRoleFilter(roleParam);
    }
    
    if (statusParam && ['active', 'inactive'].includes(statusParam)) {
      setStatusFilter(statusParam);
    }
    
    if (companyParam) {
      setCompanyFilter(companyParam);
    }
  }, []);

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
    enabled: !!user && canManageUsers(user as any),
  });

  const { data: companies } = useQuery({
    queryKey: ["/api/companies"],
    enabled: !!user && canManageUsers(user as any),
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

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const response = await apiRequest('PATCH', `/api/users/${userId}`, { isActive });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('PATCH', `/api/users/${userId}`, { isActive: false, isSuspended: true });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User suspended successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to suspend user",
        variant: "destructive",
      });
    },
  });

  const unsuspendUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest('PATCH', `/api/users/${userId}`, { isActive: true, isSuspended: false });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User unsuspended successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to unsuspend user",
        variant: "destructive",
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, roles }: { userId: string; roles: string[] }) => {
      const response = await apiRequest('PATCH', `/api/users/${userId}`, { roles });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const updateUserContactMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: string; userData: any }) => {
      const response = await apiRequest('PATCH', `/api/users/${userId}`, userData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditingContact(false);
      toast({
        title: "Success",
        description: "Contact information updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update contact information",
        variant: "destructive",
      });
    },
  });

  const getNextRole = (currentRole: string) => {
    if (currentRole === 'field_agent') return 'dispatcher';
    if (currentRole === 'dispatcher') return 'manager';
    return currentRole; // Don't change if already manager or administrator
  };

  const getRoleDisplayName = (role: string) => {
    if (role === 'field_agent') return 'Field Agent';
    if (role === 'dispatcher') return 'Dispatcher';
    if (role === 'manager') return 'Manager';
    if (role === 'administrator') return 'Administrator';
    return role;
  };

  const getRoleCount = (role: string) => {
    if (!allUsers) return 0;
    // Filter out users who ONLY have operations_director role (not company team members)
    const filteredUsers = (allUsers as any[]).filter((user: any) => {
      const roles = user.roles || [];
      // Include if user has other roles besides operations_director
      return roles.some((r: string) => r !== 'operations_director');
    });
    if (role === "all") return filteredUsers.length;
    return filteredUsers.filter((user: any) => user.roles?.includes(role)).length;
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canManageUsers(user as any)) {
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
      <Navigation />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const selectedRole = localStorage.getItem('selectedRole');
                if (selectedRole === 'operations_director' || (user as any).roles?.includes('operations_director')) {
                  setLocation('/operations-dashboard');
                } else if ((user as any).roles?.includes('administrator')) {
                  setLocation('/admin-dashboard');
                } else {
                  setLocation('/dashboard');
                }
              }}
              className="flex items-center space-x-1"
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center space-x-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
            <p className="text-muted-foreground mt-2">
              {companyFilter !== "all" && companies ? 
                `Showing team members for ${(companies as any[]).find(c => c.id === companyFilter)?.name || 'Selected Company'}` :
                "Manage your team members and their accounts"
              }
            </p>
            {companyFilter !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCompanyFilter("all");
                  // Update URL to remove company parameter
                  const url = new URL(window.location.href);
                  url.searchParams.delete('company');
                  window.history.pushState({}, '', url.toString());
                }}
                className="mt-2"
              >
                Clear Company Filter
              </Button>
            )}
          </div>
        </div>

        {/* Team Members Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <h3 className="text-lg font-semibold text-foreground">Team Members</h3>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                {/* Add Team Member Button - Show only for administrators */}
                {(user as any).roles?.includes('administrator') && (
                  <Button
                    onClick={() => setLocation('/onboarding')}
                    className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
                    size="sm"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Team Member
                  </Button>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {/* Role Filters */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={roleFilter === "field_agent" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRoleFilter("field_agent")}
                      className={`text-xs ${roleFilter === "field_agent" ? "bg-green-600 hover:bg-green-700 text-white" : "border-green-600 text-green-600 hover:bg-green-600 hover:text-white"}`}
                    >
                      FA ({getRoleCount("field_agent")})
                    </Button>
                    <Button
                      variant={roleFilter === "administrator" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRoleFilter("administrator")}
                      className={`text-xs ${roleFilter === "administrator" ? "bg-purple-600 hover:bg-purple-700 text-white" : "border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white"}`}
                    >
                      <span className="hidden sm:inline">Admin</span><span className="sm:hidden">A</span> ({getRoleCount("administrator")})
                    </Button>
                    <Button
                      variant={roleFilter === "manager" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRoleFilter("manager")}
                      className={`text-xs ${roleFilter === "manager" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"}`}
                    >
                      <span className="hidden sm:inline">Manager</span><span className="sm:hidden">M</span> ({getRoleCount("manager")})
                    </Button>
                    <Button
                      variant={roleFilter === "dispatcher" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRoleFilter("dispatcher")}
                      className={`text-xs ${roleFilter === "dispatcher" ? "bg-orange-600 hover:bg-orange-700 text-white" : "border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white"}`}
                    >
                      <span className="hidden sm:inline">Dispatcher</span><span className="sm:hidden">D</span> ({getRoleCount("dispatcher")})
                    </Button>
                    <Button
                      variant={roleFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRoleFilter("all")}
                      className="text-xs"
                    >
                      All ({getRoleCount("all")})
                    </Button>
                  </div>
                  
                  {/* Status Filters */}
                  <div className="flex flex-wrap gap-2 border-l border-border pl-2 ml-2">
                    <Button
                      variant={statusFilter === "active" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("active")}
                      className="text-xs"
                    >
                      Active
                    </Button>
                    <Button
                      variant={statusFilter === "inactive" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("inactive")}
                      className="text-xs"
                    >
                      Inactive
                    </Button>
                    <Button
                      variant={statusFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter("all")}
                      className="text-xs"
                    >
                      All Status
                    </Button>
                  </div>


                </div>
              </div>
            </div>
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
                {allUsers && (allUsers as any[])
                  .filter((userData: any) => {
                    const roles = userData.roles || [];
                    // Include if user has other roles besides operations_director
                    return roles.some((r: string) => r !== 'operations_director');
                  })
                  .filter((userData: any) => roleFilter === "all" || userData.roles?.includes(roleFilter))
                  .filter((userData: any) => {
                    if (statusFilter === "all") return true;
                    if (statusFilter === "active") return userData.isActive !== false;
                    if (statusFilter === "inactive") return userData.isActive === false;
                    return true;
                  })
                  .filter((userData: any) => {
                    if (companyFilter === "all") return true;
                    return userData.companyId === companyFilter;
                  })
                  .map((userData: any): React.ReactElement => (
                  <div key={userData.id} className="p-4 rounded-lg border border-border bg-card/50 overflow-hidden">
                    <div 
                      className="cursor-pointer hover:bg-accent/50 rounded-md p-2 transition-colors"
                      onClick={() => {
                        setSelectedUser(userData);
                        setIsDialogOpen(true);
                      }}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex flex-col items-center space-y-2 flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <i className="fas fa-user text-primary"></i>
                          </div>
                          <Badge 
                            variant="secondary" 
                            className={`${
                              userData.roles?.includes('administrator') 
                                ? 'bg-purple-900/30 text-purple-300 border-purple-800/50'
                                : userData.roles?.includes('manager')
                                ? 'bg-blue-900/30 text-blue-300 border-blue-800/50'
                                : userData.roles?.includes('dispatcher')
                                ? 'bg-orange-900/30 text-orange-300 border-orange-800/50'
                                : 'bg-green-900/30 text-green-300 border-green-800/50'
                            } text-xs flex-shrink-0`}
                          >
                            {userData.roles?.includes('field_agent') ? 'FA' : 
                             userData.roles?.includes('administrator') ? 'A' :
                             userData.roles?.includes('manager') ? 'M' :
                             userData.roles?.includes('dispatcher') ? 'D' : 
                             userData.roles?.[0]?.charAt(0).toUpperCase() || 'U'}
                          </Badge>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-foreground truncate">
                            {userData.firstName && userData.lastName 
                              ? `${userData.firstName} ${userData.lastName}`
                              : userData.email || 'Unknown User'
                            }
                          </h4>
                          
                          {/* Action buttons below user name */}
                          <div className="flex items-center space-x-2 mt-2">
                            {userData.id !== (user as any)?.id && !userData.roles?.includes('administrator') && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2 py-1 text-xs"
                                    disabled={deleteUserMutation.isPending}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
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
                            {userData.roles?.includes('administrator') && !(user as any).roles?.includes('administrator') && (
                              <Badge variant="outline" className="text-xs bg-purple-900/20 text-purple-300">
                                Administrator (Cannot Delete)
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {allUsers && (allUsers as any[])
                  .filter((userData: any) => roleFilter === "all" || userData.roles?.includes(roleFilter))
                  .length === 0 && (
                  <div className="text-center py-8">
                    <i className="fas fa-users text-4xl text-muted-foreground mb-4"></i>
                    <p className="text-muted-foreground">
                      {roleFilter === "all" ? "No team members found" : `No ${roleFilter === "field_agent" ? "field agents" : roleFilter + "s"} found`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Details Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <i className="fas fa-user text-primary text-sm"></i>
              </div>
              <span>
                {selectedUser?.firstName && selectedUser?.lastName 
                  ? `${selectedUser.firstName} ${selectedUser.lastName}`
                  : selectedUser?.email || 'Unknown User'
                }
              </span>
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-4">
              {/* Contact Information */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground">Contact Information</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 py-1 text-xs"
                    onClick={() => {
                      setIsEditingContact(!isEditingContact);
                      if (!isEditingContact) {
                        setEditedUser({
                          firstName: selectedUser.firstName || '',
                          lastName: selectedUser.lastName || '',
                          email: selectedUser.email || '',
                          phone: selectedUser.phone || '',
                          address: selectedUser.address || '',
                          city: selectedUser.city || '',
                          state: selectedUser.state || '',
                          zipCode: selectedUser.zipCode || ''
                        });
                      }
                    }}
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    {isEditingContact ? 'Cancel' : 'Edit'}
                  </Button>
                </div>

                {isEditingContact ? (
                  <div className="space-y-3">
                    {/* Name fields */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="firstName" className="text-xs">First Name</Label>
                        <Input
                          id="firstName"
                          value={editedUser.firstName}
                          onChange={(e) => setEditedUser({...editedUser, firstName: e.target.value})}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                        <Input
                          id="lastName"
                          value={editedUser.lastName}
                          onChange={(e) => setEditedUser({...editedUser, lastName: e.target.value})}
                          className="h-8"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <Label htmlFor="email" className="text-xs">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editedUser.email}
                        onChange={(e) => setEditedUser({...editedUser, email: e.target.value})}
                        className="h-8"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <Label htmlFor="phone" className="text-xs">Phone</Label>
                      <Input
                        id="phone"
                        value={editedUser.phone}
                        onChange={(e) => setEditedUser({...editedUser, phone: e.target.value})}
                        className="h-8"
                      />
                    </div>

                    {/* Address */}
                    <div>
                      <Label htmlFor="address" className="text-xs">Address</Label>
                      <Input
                        id="address"
                        value={editedUser.address}
                        onChange={(e) => setEditedUser({...editedUser, address: e.target.value})}
                        className="h-8"
                      />
                    </div>

                    {/* City, State, Zip */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="city" className="text-xs">City</Label>
                        <Input
                          id="city"
                          value={editedUser.city}
                          onChange={(e) => setEditedUser({...editedUser, city: e.target.value})}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="state" className="text-xs">State</Label>
                        <Input
                          id="state"
                          value={editedUser.state}
                          onChange={(e) => setEditedUser({...editedUser, state: e.target.value})}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="zipCode" className="text-xs">Zip</Label>
                        <Input
                          id="zipCode"
                          value={editedUser.zipCode}
                          onChange={(e) => setEditedUser({...editedUser, zipCode: e.target.value})}
                          className="h-8"
                        />
                      </div>
                    </div>

                    {/* Save/Cancel buttons */}
                    <div className="flex space-x-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          updateUserContactMutation.mutate({
                            userId: selectedUser.id,
                            userData: editedUser
                          });
                          setSelectedUser({...selectedUser, ...editedUser});
                        }}
                        disabled={updateUserContactMutation.isPending}
                        className="flex-1"
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Email:</span>
                      <span className="text-foreground">{selectedUser.email || 'Not provided'}</span>
                    </div>
                    
                    <div className="flex items-center space-x-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="text-foreground">{selectedUser.phone || 'Not provided'}</span>
                    </div>
                    
                    <div className="flex items-start space-x-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-muted-foreground">Address:</span>
                      <div className="text-foreground">
                        {selectedUser.address || 'Not provided'}
                        {selectedUser.city && (
                          <div className="text-xs text-muted-foreground">
                            {selectedUser.city}
                            {selectedUser.state && `, ${selectedUser.state}`}
                            {selectedUser.zipCode && ` ${selectedUser.zipCode}`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Status</h4>
                <div className="flex items-center space-x-2">
                  {selectedUser.isSuspended ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Badge 
                          variant="destructive"
                          className="cursor-pointer hover:opacity-80 transition-opacity bg-red-900/30 text-red-300"
                        >
                          Suspended
                        </Badge>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Unsuspend User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to unsuspend {selectedUser.firstName} {selectedUser.lastName}? This will restore their access to the system.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              unsuspendUserMutation.mutate(selectedUser.id);
                              const updatedUser = {...selectedUser, isSuspended: false, isActive: true};
                              setSelectedUser(updatedUser);
                            }}
                            disabled={unsuspendUserMutation.isPending}
                          >
                            Unsuspend User
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Badge 
                      variant={selectedUser.isActive ? "default" : "destructive"}
                      className={`${
                        selectedUser.isActive ? "bg-green-900/30 text-green-300" : ""
                      } cursor-pointer hover:opacity-80 transition-opacity`}
                      onClick={() => {
                        updateUserStatusMutation.mutate({
                          userId: selectedUser.id,
                          isActive: !selectedUser.isActive
                        });
                        setSelectedUser({...selectedUser, isActive: !selectedUser.isActive});
                      }}
                    >
                      {selectedUser.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  )}
                  
                  {!selectedUser.isSuspended && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-orange-500 hover:text-orange-600 border-orange-500/50 hover:border-orange-600 px-3 py-1 text-xs"
                      onClick={() => {
                        suspendUserMutation.mutate(selectedUser.id);
                        setSelectedUser({...selectedUser, isSuspended: true, isActive: false});
                      }}
                      disabled={suspendUserMutation.isPending}
                    >
                      <UserX className="h-3 w-3 mr-1" />
                      Suspend User
                    </Button>
                  )}
                </div>
              </div>

              {/* Role */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Role</h4>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Badge 
                      variant="secondary" 
                      className={`${
                        selectedUser.roles?.includes('administrator') 
                          ? 'bg-purple-900/30 text-purple-300 border-purple-800/50'
                          : selectedUser.roles?.includes('manager')
                          ? 'bg-blue-900/30 text-blue-300 border-blue-800/50'
                          : selectedUser.roles?.includes('dispatcher')
                          ? 'bg-orange-900/30 text-orange-300 border-orange-800/50'
                          : 'bg-green-900/30 text-green-300 border-green-800/50'
                      } ${
                        !selectedUser.roles?.includes('manager') && !selectedUser.roles?.includes('administrator') 
                          ? 'cursor-pointer hover:opacity-80 transition-opacity'
                          : 'cursor-default'
                      }`}
                    >
                      {getRoleDisplayName(selectedUser.roles?.[0])}
                    </Badge>
                  </AlertDialogTrigger>
                  {!selectedUser.roles?.includes('manager') && !selectedUser.roles?.includes('administrator') && (
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Update User Role</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to promote {selectedUser.firstName} {selectedUser.lastName} from {getRoleDisplayName(selectedUser.role)} to {getRoleDisplayName(getNextRole(selectedUser.role))}?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            const nextRole = getNextRole(selectedUser.role);
                            updateUserRoleMutation.mutate({
                              userId: selectedUser.id,
                              role: nextRole
                            });
                            setSelectedUser({...selectedUser, role: nextRole});
                          }}
                        >
                          Confirm Promotion
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  )}
                </AlertDialog>
              </div>

              {/* Work Orders Button */}
              <div className="pt-4">
                <Button 
                  className="w-full" 
                  onClick={() => {
                    setLocation(`/work-orders?user=${selectedUser.id}`);
                    setIsDialogOpen(false);
                  }}
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  View Work Orders
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}