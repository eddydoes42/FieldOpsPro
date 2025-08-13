import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Users, UserPlus, Settings, DollarSign, User, ChevronDown, Clock, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Navigation from "@/components/navigation";
import PermanentRoleSwitcher from "@/components/permanent-role-switcher";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import CompanyOnboardingForm from "@/components/company-onboarding-form";
import AdminOnboardingForm from "@/components/admin-onboarding-form";
import { Company, AccessRequest, insertUserSchema } from "../../../shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function OperationsDirectorDashboard() {
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [showUserCreationDialog, setShowUserCreationDialog] = useState(false);
  const [selectedAccessRequest, setSelectedAccessRequest] = useState<AccessRequest | null>(null);
  const [, setLocation] = useLocation();
  const [currentActiveRole, setCurrentActiveRole] = useState(
    localStorage.getItem('permanentRole') || 'operations_director'
  );
  const [testingRole, setTestingRole] = useState<string>('administrator');
  const [selectedTestRole, setSelectedTestRole] = useState<string>('administrator');
  const [selectedClientTestRole, setSelectedClientTestRole] = useState<string>('administrator');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Listen for custom events from quick action menu
  useEffect(() => {
    const handleOpenCompanyForm = () => setShowCompanyForm(true);
    const handleOpenAdminForm = () => setShowAdminForm(true);

    window.addEventListener('openCompanyForm', handleOpenCompanyForm);
    window.addEventListener('openAdminForm', handleOpenAdminForm);

    return () => {
      window.removeEventListener('openCompanyForm', handleOpenCompanyForm);
      window.removeEventListener('openAdminForm', handleOpenAdminForm);
    };
  }, []);

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const { data: stats = { totalAdmins: 0, activeCompanies: 0, recentSetups: 0 } } = useQuery<{
    totalAdmins: number;
    activeCompanies: number;
    recentSetups: number;
  }>({
    queryKey: ['/api/operations/stats'],
  });

  const { data: budgetData = { totalEarned: 0, todayEarning: 0 } } = useQuery<{
    totalEarned: number;
    todayEarning: number;
  }>({
    queryKey: ['/api/operations/budget-summary'],
  });

  // Access requests query
  const { data: accessRequests = [] } = useQuery<AccessRequest[]>({
    queryKey: ['/api/access-requests'],
  });

  // User creation form
  const userForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      roles: [],
      companyId: "",
    },
  });

  if (showCompanyForm) {
    return <CompanyOnboardingForm onClose={() => setShowCompanyForm(false)} />;
  }

  if (showAdminForm) {
    return <AdminOnboardingForm onClose={() => setShowAdminForm(false)} />;
  }

  // Mutations for access request actions
  const reviewAccessRequestMutation = useMutation({
    mutationFn: async ({ requestId, status, notes }: { requestId: string; status: 'approved' | 'rejected'; notes?: string }) => {
      return apiRequest(`/api/access-requests/${requestId}/review`, 'PATCH', { status, notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/access-requests'] });
      toast({
        title: "Request Reviewed",
        description: "Access request has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to review access request",
        variant: "destructive",
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      return apiRequest('/api/users', 'POST', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setShowUserCreationDialog(false);
      userForm.reset();
      setSelectedAccessRequest(null);
      toast({
        title: "User Created",
        description: "User account has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const handleAccessRequestClick = (request: AccessRequest) => {
    setSelectedAccessRequest(request);
    // Pre-populate form with access request data
    userForm.setValue('firstName', request.firstName);
    userForm.setValue('lastName', request.lastName);
    userForm.setValue('email', request.email);
    userForm.setValue('phone', request.phone || '');
    userForm.setValue('roles', [request.requestedRole] as any);
    setShowUserCreationDialog(true);
  };

  const handleApproveRequest = (requestId: string) => {
    reviewAccessRequestMutation.mutate({ requestId, status: 'approved' });
  };

  const handleRejectRequest = (requestId: string) => {
    reviewAccessRequestMutation.mutate({ requestId, status: 'rejected', notes: 'Request denied' });
  };

  const onSubmitUserCreation = (data: any) => {
    createUserMutation.mutate(data);
  };

  const availableRoles = [
    { value: 'administrator', label: 'Administrator', shortLabel: 'Admin' },
    { value: 'manager', label: 'Manager', shortLabel: 'Manager' },
    { value: 'dispatcher', label: 'Dispatcher', shortLabel: 'Dispatcher' },
    { value: 'field_agent', label: 'Field Agent', shortLabel: 'Field Agent' }
  ];

  const availableClientRoles = [
    { value: 'administrator', label: 'Administrator', shortLabel: 'Admin' },
    { value: 'manager', label: 'Manager', shortLabel: 'Manager' },
    { value: 'dispatcher', label: 'Dispatcher', shortLabel: 'Dispatcher' }
  ];

  const handleStartTesting = (role: string) => {
    localStorage.setItem('testingRole', role);
    localStorage.setItem('testingCompanyType', 'service');
    // Navigate to appropriate dashboard based on role
    if (role === 'administrator') {
      window.location.href = '/admin-dashboard';
    } else if (role === 'manager') {
      window.location.href = '/manager-dashboard';
    } else if (role === 'dispatcher') {
      window.location.href = '/dispatcher-dashboard';
    } else if (role === 'field_agent') {
      window.location.href = '/agent-dashboard';
    }
  };

  const handleStartClientTesting = (role: string) => {
    localStorage.setItem('testingRole', role);
    localStorage.setItem('testingCompanyType', 'client');
    // Navigate to client-specific dashboard based on role
    if (role === 'administrator') {
      window.location.href = '/client-dashboard';
    } else if (role === 'manager') {
      window.location.href = '/client-dashboard';
    } else if (role === 'dispatcher') {
      window.location.href = '/client-dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Dual Role Testers for Operations Director */}
      <div className="mx-4 mt-4 space-y-3">
        {/* Service Company Role Tester */}
        <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-center">
            <span className="text-sm text-purple-700 font-medium mr-3">Service Company Role Tester</span>
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                  <User className="h-3 w-3 mr-2" />
                  {availableRoles.find(role => role.value === selectedTestRole)?.shortLabel || 'Switch Role'}
                  <ChevronDown className="h-3 w-3 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-purple-900">
                  Service Company Roles
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableRoles.map((role) => (
                  <DropdownMenuItem
                    key={role.value}
                    onClick={() => handleStartTesting(role.value)}
                    className="cursor-pointer"
                  >
                    <User className="h-3 w-3 mr-2" />
                    {role.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    localStorage.removeItem('testingRole');
                    localStorage.removeItem('testingCompanyType');
                    setSelectedTestRole('administrator'); // Reset to default
                    window.location.reload(); // Refresh to clear any testing state
                  }}
                  className="cursor-pointer text-red-600 hover:text-red-700 focus:text-red-700"
                >
                  <span className="text-red-600 mr-2">✕</span>
                  Stop Testing
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Client Company Role Tester */}
        <div className="flex items-center justify-between bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-3">
          <div className="flex items-center">
            <span className="text-sm text-teal-700 font-medium mr-3">Client Company Role Tester</span>
          </div>
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-teal-300 text-teal-700 hover:bg-teal-50">
                  <User className="h-3 w-3 mr-2" />
                  {availableClientRoles.find(role => role.value === selectedClientTestRole)?.shortLabel || 'Switch Role'}
                  <ChevronDown className="h-3 w-3 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-teal-900">
                  Client Company Roles
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableClientRoles.map((role) => (
                  <DropdownMenuItem
                    key={role.value}
                    onClick={() => handleStartClientTesting(role.value)}
                    className="cursor-pointer"
                  >
                    <User className="h-3 w-3 mr-2" />
                    {role.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    localStorage.removeItem('testingRole');
                    localStorage.removeItem('testingCompanyType');
                    setSelectedClientTestRole('administrator'); // Reset to default
                    window.location.reload(); // Refresh to clear any testing state
                  }}
                  className="cursor-pointer text-red-600 hover:text-red-700 focus:text-red-700"
                >
                  <span className="text-red-600 mr-2">✕</span>
                  Stop Testing
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      <Navigation 
        currentActiveRole={localStorage.getItem('permanentRole') || 'operations_director'} 
        onPermanentRoleSwitch={(role) => {
          localStorage.setItem('permanentRole', role);
          localStorage.setItem('selectedRole', role);
          // Navigate to appropriate dashboard based on role
          window.location.href = '/dashboard';
        }}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Operations Director Dashboard
              </h1>
            </div>
            

          </div>
          
          {/* Budget Indicator */}
          <div className="flex justify-end">
            <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Total Earned
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    ${(budgetData.totalEarned || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Today's Earning
                </p>
                <p className="text-sm font-bold text-green-600 dark:text-green-400">
                  ${(budgetData.todayEarning || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Things to Approve Section */}
        {accessRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Things to Approve</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accessRequests.map((request) => (
                <Card 
                  key={request.id} 
                  className="bg-white dark:bg-gray-800 border-yellow-200 dark:border-yellow-700 cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors"
                  onClick={() => handleAccessRequestClick(request)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                        {request.firstName} {request.lastName}
                      </CardTitle>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {request.requestedRole.replace('_', ' ').split(' ').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Email:</strong> {request.email}
                      </p>
                      {request.phone && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Phone:</strong> {request.phone}
                        </p>
                      )}
                      {request.howHeardAbout && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Source:</strong> {request.howHeardAbout}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="h-3 w-3 mr-1" />
                          {request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-green-600 border-green-200 hover:bg-green-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveRequest(request.id);
                            }}
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectRequest(request.id);
                            }}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            onClick={() => setLocation('/operations/companies')}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Companies
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {companies.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            onClick={() => setLocation('/operations/active-admins')}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Admins
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalAdmins || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            onClick={() => setLocation('/operations/companies?status=active')}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Companies
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.activeCompanies || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            onClick={() => setLocation('/operations/recent-setups')}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserPlus className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Recent Setups
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.recentSetups || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Creation Dialog */}
        <Dialog open={showUserCreationDialog} onOpenChange={setShowUserCreationDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create User Account</DialogTitle>
            </DialogHeader>
            <Form {...userForm}>
              <form onSubmit={userForm.handleSubmit(onSubmitUserCreation)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={userForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={userForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={userForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={userForm.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a company" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowUserCreationDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}