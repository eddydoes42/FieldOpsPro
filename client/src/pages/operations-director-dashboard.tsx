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
import UserOnboardingForm from "@/components/user-onboarding-form";
import { Company, AccessRequest, insertUserSchema } from "../../../shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryKeys, handleMutationError, invalidateRelatedQueries } from "@/lib/queryClient";
import { formatCurrency, formatBudget } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { usePerformanceMonitoring } from "@/hooks/usePerformanceMonitoring";
import { Skeleton } from "@/components/ui/skeleton";
import { StashLayout } from "@/components/layout/stash-layout";
import { StashCard } from "@/components/ui/stash-card";
import { useHeartbeatData } from "@/hooks/useHeartbeatData";
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
  const [showRecentSetupsDialog, setShowRecentSetupsDialog] = useState(false);
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
  
  // Performance monitoring
  const { getComponentMetrics } = usePerformanceMonitoring('OperationsDirectorDashboard');

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

  const { data: companies = [], isLoading: companiesLoading, error: companiesError } = useQuery<Company[]>({
    queryKey: queryKeys.companies(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: (error: Error) => handleMutationError(error, toast),
  });

  const { data: stats = { totalAdmins: 0, activeCompanies: 0, recentSetups: 0 }, isLoading: statsLoading } = useQuery<{
    totalAdmins: number;
    activeCompanies: number;
    recentSetups: number;
  }>({
    queryKey: queryKeys.operationsStats(),
    refetchInterval: 30000, // Refetch every 30 seconds - reduced frequency
    refetchOnWindowFocus: true,
    staleTime: 15000, // Consider data stale after 15 seconds
    onError: (error: Error) => handleMutationError(error, toast),
  });

  const { data: budgetData = { totalEarned: 0, todayEarning: 0 }, isLoading: budgetLoading } = useQuery<{
    totalEarned: number;
    todayEarning: number;
  }>({
    queryKey: queryKeys.budgetSummary(),
    refetchInterval: 60000, // Refetch every minute - reduced frequency
    refetchOnWindowFocus: true,
    staleTime: 30000, // Consider data stale after 30 seconds
    onError: (error: Error) => handleMutationError(error, toast),
  });

  const { data: serviceFeeData = { totalServiceFees: 0, todayServiceFees: 0 }, isLoading: serviceFeesLoading } = useQuery<{
    totalServiceFees: number;
    todayServiceFees: number;
  }>({
    queryKey: queryKeys.serviceFeesSummary(),
    refetchInterval: 60000, // Refetch every minute - reduced frequency
    refetchOnWindowFocus: true,
    staleTime: 30000, // Consider data stale after 30 seconds
    onError: (error: Error) => handleMutationError(error, toast),
  });

  // Current user query for UserOnboardingForm permissions
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: queryKeys.auth(),
    staleTime: 10 * 60 * 1000, // 10 minutes - user data doesn't change often
    onError: (error: Error) => handleMutationError(error, toast),
  });

  // Access requests query - most critical for real-time updates
  const { data: accessRequests = [], isLoading: accessRequestsLoading } = useQuery<AccessRequest[]>({
    queryKey: queryKeys.accessRequests(),
    refetchInterval: 10000, // Refetch every 10 seconds - still frequent but reduced
    refetchOnWindowFocus: true,
    staleTime: 5000, // Consider data stale after 5 seconds
    onError: (error: Error) => handleMutationError(error, toast),
  });

  // Query for all approval requests - critical for Things to Approve section
  const { data: approvalRequests = [], isLoading: approvalRequestsLoading } = useQuery<any[]>({
    queryKey: queryKeys.approvalRequests(),
    refetchInterval: 15000, // Refetch every 15 seconds - reduced frequency
    refetchOnWindowFocus: true,
    staleTime: 8000, // Consider data stale after 8 seconds
    onError: (error: Error) => handleMutationError(error, toast),
  });

  // Query for recent users - important for Recent Activity section
  const { data: recentUsers = [], isLoading: recentUsersLoading } = useQuery<any[]>({
    queryKey: queryKeys.recentUsers(),
    refetchInterval: 30000, // Refetch every 30 seconds - reduced frequency
    refetchOnWindowFocus: true,
    staleTime: 15000, // Consider data stale after 15 seconds
    retry: 2,
    onError: (error: Error) => handleMutationError(error, toast),
  });

  // Calculate total pending approvals
  const totalPendingApprovals = accessRequests.length + approvalRequests.filter(req => req.status === 'pending').length;

  if (showCompanyForm) {
    return <CompanyOnboardingForm onClose={() => setShowCompanyForm(false)} />;
  }

  if (showAdminForm) {
    return <AdminOnboardingForm onClose={() => setShowAdminForm(false)} />;
  }

  // Mutations for access request actions
  const reviewAccessRequestMutation = useMutation({
    mutationFn: async ({ requestId, status, notes, accessRequest }: { 
      requestId: string; 
      status: 'approved' | 'rejected'; 
      notes?: string; 
      accessRequest?: AccessRequest;
    }) => {
      return apiRequest(`/api/access-requests/${requestId}/review`, 'PATCH', { status, notes });
    },
    onSuccess: async (data, variables) => {
      // Use enhanced cache invalidation
      await invalidateRelatedQueries(queryClient, 'accessRequests');
      await queryClient.invalidateQueries({ queryKey: queryKeys.operationsStats() });
      
      toast({
        title: "Request Reviewed",
        description: `Access request has been ${variables.status}.`,
      });
      
      // If approved and we have the access request data, trigger user creation form
      if (variables.status === 'approved' && variables.accessRequest) {
        const request = variables.accessRequest;
        setSelectedAccessRequest(request);
        setShowUserCreationDialog(true);
        setShowApprovalsDialog(false);
      }
    },
    onError: (error: Error) => {
      handleMutationError(error, toast);
    },
  });

  const handleAccessRequestClick = (request: AccessRequest) => {
    setSelectedAccessRequest(request);
    setShowUserCreationDialog(true);
  };

  const handleApproveRequest = (request: AccessRequest) => {
    reviewAccessRequestMutation.mutate({ 
      requestId: request.id, 
      status: 'approved',
      accessRequest: request 
    });
  };

  const handleRejectRequest = (requestId: string) => {
    reviewAccessRequestMutation.mutate({ requestId, status: 'rejected', notes: 'Request denied' });
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

  // Get heartbeat data for the monitor
  const heartbeatData = useHeartbeatData();

  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // TODO: Implement search filtering logic for companies, users, work orders
  };

  const handleSearchClear = () => {
    setSearchQuery("");
  };

  return (
    <>
      <Navigation />
      
      <StashLayout
        showSearch={false}
        showHeartbeat={!!heartbeatData}
        heartbeatData={heartbeatData || undefined}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-center items-center mb-6">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Operations Dashboard
              </h1>
            </div>
          
          {/* Budget & Service Fee Indicators */}
          <div className="flex justify-end space-x-4">
            {/* Earnings Display */}
            <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              <div className="text-right">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Total Earned
                </p>
                {budgetLoading ? (
                  <Skeleton className="h-4 w-20" />
                ) : (
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    ${(budgetData.totalEarned || 0).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Today's Earning
                </p>
                {budgetLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : (
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">
                    ${(budgetData.todayEarning || 0).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            
            {/* Service Fees Display */}
            <div className="flex items-center space-x-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
              <div className="bg-orange-100 dark:bg-orange-800 p-1 rounded">
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400">FEE</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Total Fees
                </p>
                {serviceFeesLoading ? (
                  <Skeleton className="h-4 w-20" />
                ) : (
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    ${(serviceFeeData.totalServiceFees || 0).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="h-6 w-px bg-orange-200 dark:border-orange-700"></div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Today's Fees
                </p>
                {serviceFeesLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : (
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                    ${(serviceFeeData.todayServiceFees || 0).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>



        {/* Quick Stats - Compact Grid Layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {/* Things to Approve */}
          <StashCard
            title={totalPendingApprovals.toString()}
            subtitle="Things to Approve"
            icon={
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2 w-16 h-12">
                <div className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">Pending</div>
                <div className="flex justify-between text-xs">
                  <span className="text-amber-600 dark:text-amber-400">{accessRequests.length} Access</span>
                  <span className="text-amber-600 dark:text-amber-400">{approvalRequests.filter(req => req.status === 'pending').length} Other</span>
                </div>
              </div>
            }
            onClick={() => setShowApprovalsDialog(true)}
            variant={totalPendingApprovals > 0 ? "featured" : "compact"}
            testId="button-things-to-approve"
          />
          <StashCard
            title={(companies.length || 0).toString()}
            subtitle="Total Companies"
            icon={
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 w-16 h-12">
                <div className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Types</div>
                <div className="flex justify-between text-xs">
                  <span className="text-blue-600 dark:text-blue-400">{companies.filter(c => c.companyType === 'service_company').length} Service</span>
                  <span className="text-blue-600 dark:text-blue-400">{companies.filter(c => c.companyType === 'client_company').length} Client</span>
                </div>
              </div>
            }
            onClick={() => setLocation('/operations/companies')}
            testId="card-total-companies"
            variant="compact"
          />

          <StashCard
            title={(stats.totalAdmins || 0).toString()}
            subtitle="Active Admins"
            icon={
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 w-16 h-12">
                <div className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">Roles</div>
                <div className="flex justify-between text-xs">
                  <span className="text-green-600 dark:text-green-400">{recentUsers.filter(u => u.role === 'administrator').length} Admin</span>
                  <span className="text-green-600 dark:text-green-400">{recentUsers.filter(u => u.role === 'manager').length} Mgr</span>
                </div>
              </div>
            }
            onClick={() => setLocation('/operations/active-admins')}
            testId="card-active-admins"
            variant="compact"
          />
          <StashCard
            title={(stats.activeCompanies || 0).toString()}
            subtitle="Active Companies"
            icon={
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-2 w-16 h-12">
                <div className="text-xs text-purple-700 dark:text-purple-300 font-medium mb-1">Status</div>
                <div className="flex justify-between text-xs">
                  <span className="text-purple-600 dark:text-purple-400">{companies.filter(c => c.isActive).length} Active</span>
                  <span className="text-purple-600 dark:text-purple-400">{companies.filter(c => !c.isActive).length} Inactive</span>
                </div>
              </div>
            }
            onClick={() => setLocation('/operations/companies?status=active')}
            testId="card-active-companies"
            variant="compact"
          />

          <StashCard
            title={(stats.recentSetups || 0).toString()}
            subtitle="Recent Setups"
            icon={
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-2 w-16 h-12">
                <div className="text-xs text-orange-700 dark:text-orange-300 font-medium mb-1">Period</div>
                <div className="flex justify-between text-xs">
                  <span className="text-orange-600 dark:text-orange-400">{recentUsers.filter(u => {
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return new Date(u.createdAt) >= weekAgo;
                  }).length} Week</span>
                  <span className="text-orange-600 dark:text-orange-400">{recentUsers.filter(u => {
                    const monthAgo = new Date();
                    monthAgo.setDate(monthAgo.getDate() - 30);
                    return new Date(u.createdAt) >= monthAgo;
                  }).length} Month</span>
                </div>
              </div>
            }
            onClick={() => setShowRecentSetupsDialog(true)}
            testId="card-recent-setups"
            variant="compact"
          />

          <StashCard
            title="Audit"
            subtitle="System Trail"
            icon={
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-2 w-16 h-12">
                <div className="text-xs text-indigo-700 dark:text-indigo-300 font-medium mb-1">Events</div>
                <div className="flex justify-between text-xs">
                  <span className="text-indigo-600 dark:text-indigo-400">Security</span>
                  <span className="text-indigo-600 dark:text-indigo-400">Access</span>
                </div>
              </div>
            }
            onClick={() => setLocation('/audit-logs')}
            testId="button-audit-logs"
            variant="compact"
          />
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
                                    handleApproveRequest(request);
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

        {/* Recent Setups Dialog */}
        <Dialog open={showRecentSetupsDialog} onOpenChange={setShowRecentSetupsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <UserPlus className="h-5 w-5 mr-2 text-orange-600 dark:text-orange-400" />
                Recent User Setups
              </DialogTitle>
              <DialogDescription>
                Displaying the 5 most recently created users
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {recentUsers.slice(0, 5).map((user: any, index: number) => (
                <Card key={user.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.roles?.map((role: string) => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                {role.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user.companyName || 'No Company'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {recentUsers.length === 0 && (
                <div className="text-center py-8">
                  <UserPlus className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No recent user setups found</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* User Creation Dialog - Using centralized UserOnboardingForm */}
        {showUserCreationDialog && selectedAccessRequest && (
          <UserOnboardingForm
            onClose={() => {
              setShowUserCreationDialog(false);
              setSelectedAccessRequest(null);
            }}
            onSuccess={() => {
              setShowUserCreationDialog(false);
              setSelectedAccessRequest(null);
              queryClient.invalidateQueries({ queryKey: ['/api/access-requests'] });
              toast({
                title: "User Created",
                description: "User account has been successfully created from the access request.",
              });
            }}
            currentUser={currentUser}
            preFilledData={{
              firstName: selectedAccessRequest.firstName,
              lastName: selectedAccessRequest.lastName,
              email: selectedAccessRequest.email,
              phone: selectedAccessRequest.phone || "",
              requestedRole: selectedAccessRequest.requestedRole,
            }}
          />
        )}
        </div>
      </StashLayout>
    </>
  );
}