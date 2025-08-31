import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Users, UserPlus, Settings, DollarSign, User, ChevronDown, Clock, CheckCircle, XCircle, TrendingUp, FileText, AlertTriangle, Shield } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Navigation from "@/components/navigation";
import RoleTester from "@/components/role-tester";

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import CompanyOnboardingForm from "@/components/company-onboarding-form";
import AdminOnboardingForm from "@/components/admin-onboarding-form";
import { Company, AccessRequest, insertUserSchema } from "../../../shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatBudget } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  const [showApprovalsDialog, setShowApprovalsDialog] = useState(false);
  const [selectedApprovalRequest, setSelectedApprovalRequest] = useState<any>(null);
  const [showApprovalDetailsDialog, setShowApprovalDetailsDialog] = useState(false);
  const [, setLocation] = useLocation();
  // Operations Director has a single active role (operations_director)
  const [testingRole, setTestingRole] = useState<string>('');
  const [selectedTestRole, setSelectedTestRole] = useState<string>(
    localStorage.getItem('testingCompanyType') === 'service' ? localStorage.getItem('testingRole') || '' : ''
  );
  const [selectedClientTestRole, setSelectedClientTestRole] = useState<string>(
    localStorage.getItem('testingCompanyType') === 'client' ? localStorage.getItem('testingRole') || '' : ''
  );
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

  // Query for all approval requests
  const { data: approvalRequests = [] } = useQuery<any[]>({
    queryKey: ['/api/approval-requests'],
  });

  // Calculate total pending approvals
  const totalPendingApprovals = accessRequests.length + approvalRequests.filter(req => req.status === 'pending').length;

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
      return apiRequest('PATCH', `/api/access-requests/${requestId}/review`, { status, notes });
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
      return apiRequest('POST', '/api/users', userData);
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
    { value: 'project_manager', label: 'Project Manager', shortLabel: 'Project Manager' },
    { value: 'manager', label: 'Manager', shortLabel: 'Manager' },
    { value: 'dispatcher', label: 'Dispatcher', shortLabel: 'Dispatcher' },
    { value: 'field_agent', label: 'Field Agent', shortLabel: 'Field Agent' }
  ];

  const availableClientRoles = [
    { value: 'administrator', label: 'Administrator', shortLabel: 'Admin' },
    { value: 'project_manager', label: 'Project Manager', shortLabel: 'Project Manager' },
    { value: 'manager', label: 'Manager', shortLabel: 'Manager' },
    { value: 'dispatcher', label: 'Dispatcher', shortLabel: 'Dispatcher' }
  ];

  const handleStartTesting = (role: string) => {
    // Clear any permanent role selection to ensure testing role takes precedence
    localStorage.removeItem('selectedRole');
    localStorage.setItem('testingRole', role);
    localStorage.setItem('testingCompanyType', 'service');
    setSelectedTestRole(role);
    setSelectedClientTestRole(''); // Clear client role when selecting service role
    console.log('Starting role test:', role, 'service');
    
    // Force reload to clear any cached user data and apply new role context
    window.location.href = '/dashboard';
  };

  const handleStartClientTesting = (role: string) => {
    // Clear any permanent role selection to ensure testing role takes precedence
    localStorage.removeItem('selectedRole');
    localStorage.setItem('testingRole', role);
    localStorage.setItem('testingCompanyType', 'client');
    setSelectedClientTestRole(role);
    setSelectedTestRole(''); // Clear service role when selecting client role
    console.log('Starting client role test:', role, 'client');
    
    // Force reload to clear any cached user data and apply new role context
    window.location.href = '/client-dashboard';
  };

  const stopTesting = () => {
    localStorage.removeItem('testingRole');
    localStorage.removeItem('testingCompanyType');
    setSelectedTestRole('');
    setSelectedClientTestRole('');
    window.location.href = '/operations-dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Role Testers - Always present for Operations Director */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* Service Company Role Tester */}
        <div className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow-sm">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Service Company Role Tester:</span>
            <select
              value={selectedTestRole}
              onChange={(e) => {
                setSelectedTestRole(e.target.value);
                if (e.target.value) {
                  handleStartTesting(e.target.value);
                }
              }}
              className="bg-purple-700 text-white border border-purple-500 rounded px-2 py-1 text-sm"
            >
              <option value="">Select a Role</option>
              <option value="administrator">Administrator</option>
              <option value="project_manager">Project Manager</option>
              <option value="manager">Manager</option>
              <option value="dispatcher">Dispatcher</option>
              <option value="field_engineer">Field Engineer</option>
              <option value="field_agent">Field Agent</option>
            </select>
            {selectedTestRole && (
              <Button
                onClick={stopTesting}
                size="sm"
                variant="outline"
                className="bg-purple-800 hover:bg-purple-900 text-white border-purple-400"
              >
                Stop Testing
              </Button>
            )}
          </div>
        </div>

        {/* Client Company Role Tester */}
        <div className="bg-teal-600 text-white px-4 py-2 rounded-lg shadow-sm">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Client Company Role Tester:</span>
            <select
              value={selectedClientTestRole}
              onChange={(e) => {
                setSelectedClientTestRole(e.target.value);
                if (e.target.value) {
                  handleStartClientTesting(e.target.value);
                }
              }}
              className="bg-teal-700 text-white border border-teal-500 rounded px-2 py-1 text-sm"
            >
              <option value="">Select a Role</option>
              <option value="administrator">Administrator</option>
              <option value="project_manager">Project Manager</option>
              <option value="manager">Manager</option>
              <option value="dispatcher">Dispatcher</option>
            </select>
            {selectedClientTestRole && (
              <Button
                onClick={stopTesting}
                size="sm"
                variant="outline"
                className="bg-teal-800 hover:bg-teal-900 text-white border-teal-400"
              >
                Stop Testing
              </Button>
            )}
          </div>
        </div>
      </div>
      
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-center items-center mb-4">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
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



        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Things to Approve Button */}
          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors relative"
            onClick={() => setShowApprovalsDialog(true)}
            data-testid="button-things-to-approve"
          >
            <CardContent className="p-4 h-32 flex flex-col justify-between overflow-hidden">
              <div className="flex flex-col items-center justify-center flex-1 min-h-0">
                <div className="relative mb-2">
                  <FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  {totalPendingApprovals > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {totalPendingApprovals}
                    </div>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {totalPendingApprovals}
                </p>
              </div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center leading-tight px-1 break-words">
                Things to Approve
              </p>
            </CardContent>
          </Card>
          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            onClick={() => setLocation('/operations/companies')}
          >
            <CardContent className="p-4 h-32 flex flex-col justify-between overflow-hidden">
              <div className="flex flex-col items-center justify-center flex-1 min-h-0">
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {companies.length || 0}
                </p>
              </div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center leading-tight px-1 break-words">
                Total Companies
              </p>
            </CardContent>
          </Card>

          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            onClick={() => setLocation('/operations/active-admins')}
          >
            <CardContent className="p-4 h-32 flex flex-col justify-between overflow-hidden">
              <div className="flex flex-col items-center justify-center flex-1 min-h-0">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400 mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.totalAdmins || 0}
                </p>
              </div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center leading-tight px-1 break-words">
                Active Admins
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Second Row of Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            onClick={() => setLocation('/operations/companies?status=active')}
          >
            <CardContent className="p-4 h-32 flex flex-col justify-between overflow-hidden">
              <div className="flex flex-col items-center justify-center flex-1 min-h-0">
                <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.activeCompanies || 0}
                </p>
              </div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center leading-tight px-1 break-words">
                Active Companies
              </p>
            </CardContent>
          </Card>

          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            onClick={() => setLocation('/operations/recent-setups')}
          >
            <CardContent className="p-4 h-32 flex flex-col justify-between overflow-hidden">
              <div className="flex flex-col items-center justify-center flex-1 min-h-0">
                <UserPlus className="h-6 w-6 text-orange-600 dark:text-orange-400 mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {stats.recentSetups || 0}
                </p>
              </div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center leading-tight px-1 break-words">
                Recent Setups
              </p>
            </CardContent>
          </Card>

          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            onClick={() => setLocation('/audit-logs')}
            data-testid="button-audit-logs"
          >
            <CardContent className="p-4 h-32 flex flex-col justify-between overflow-hidden">
              <div className="flex flex-col items-center justify-center flex-1 min-h-0">
                <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mb-2" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  Audit
                </p>
              </div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center leading-tight px-1 break-words">
                System Trail
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Things to Approve Dialog */}
        <Dialog open={showApprovalsDialog} onOpenChange={setShowApprovalsDialog}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" />
                Things to Approve ({totalPendingApprovals})
              </DialogTitle>
              <DialogDescription>
                Review and approve pending access requests, user deletions, and high-budget items.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Access Requests */}
              {accessRequests.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Access Requests ({accessRequests.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {accessRequests.map((request) => (
                      <Card 
                        key={request.id} 
                        className="bg-white dark:bg-gray-800 border-yellow-200 dark:border-yellow-700 cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors"
                        onClick={() => {
                          setSelectedAccessRequest(request);
                          setShowUserCreationDialog(true);
                          setShowApprovalsDialog(false);
                        }}
                        data-testid={`card-access-request-${request.id}`}
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
                                  data-testid={`button-approve-${request.id}`}
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
                                  data-testid={`button-reject-${request.id}`}
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

              {/* Other Approval Requests */}
              {approvalRequests.filter(req => req.status === 'pending').length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Other Approvals ({approvalRequests.filter(req => req.status === 'pending').length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {approvalRequests.filter(req => req.status === 'pending').map((request) => (
                      <Card 
                        key={request.id} 
                        className="bg-white dark:bg-gray-800 border-orange-200 dark:border-orange-700 cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors"
                        onClick={() => {
                          setSelectedApprovalRequest(request);
                          setShowApprovalDetailsDialog(true);
                        }}
                        data-testid={`card-approval-${request.id}`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                              {request.type === 'user_deletion' && 'User Deletion Request'}
                              {request.type === 'high_budget_work_order' && 'High Budget Work Order'}
                              {request.type === 'high_budget_project' && 'High Budget Project'}
                              {request.type === 'issue_escalation' && 'Issue Escalation'}
                            </CardTitle>
                            <Badge 
                              variant="outline" 
                              className={
                                request.priority === 'urgent' ? 'bg-red-50 text-red-700 border-red-200' :
                                request.priority === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                'bg-blue-50 text-blue-700 border-blue-200'
                              }
                            >
                              {request.priority?.toUpperCase() || 'NORMAL'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {request.budgetAmount && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                <strong>Budget:</strong> ${parseFloat(request.budgetAmount).toLocaleString()}
                              </p>
                            )}
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <strong>Requested:</strong> {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Needs Review
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {totalPendingApprovals === 0 && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No pending approvals at this time.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Approval Details Dialog */}
        <Dialog open={showApprovalDetailsDialog} onOpenChange={setShowApprovalDetailsDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Approval Request Details</DialogTitle>
              <DialogDescription>
                Review the details of this approval request and choose an action.
              </DialogDescription>
            </DialogHeader>
            {selectedApprovalRequest && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedApprovalRequest.type === 'user_deletion' && 'User Deletion Request'}
                    {selectedApprovalRequest.type === 'high_budget_work_order' && 'High Budget Work Order'}
                    {selectedApprovalRequest.type === 'high_budget_project' && 'High Budget Project'}
                    {selectedApprovalRequest.type === 'issue_escalation' && 'Issue Escalation'}
                  </p>
                </div>
                
                {selectedApprovalRequest.budgetAmount && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Budget Amount:</label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      ${parseFloat(selectedApprovalRequest.budgetAmount).toLocaleString()}
                    </p>
                  </div>
                )}
                
                {selectedApprovalRequest.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes:</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedApprovalRequest.notes}</p>
                  </div>
                )}
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowApprovalDetailsDialog(false)}
                    data-testid="button-cancel-approval"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      // Handle deny logic
                      setShowApprovalDetailsDialog(false);
                    }}
                    data-testid="button-deny-approval"
                  >
                    Deny
                  </Button>
                  <Button
                    onClick={() => {
                      // Handle approve logic
                      setShowApprovalDetailsDialog(false);
                    }}
                    data-testid="button-approve-approval"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                    onClick={() => {
                      // Handle intervene logic
                      setShowApprovalDetailsDialog(false);
                    }}
                    data-testid="button-intervene-approval"
                  >
                    Intervene
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* User Creation Dialog */}
        <Dialog open={showUserCreationDialog} onOpenChange={setShowUserCreationDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create User Account</DialogTitle>
              <DialogDescription>
                Create a new user account from this approved access request.
              </DialogDescription>
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