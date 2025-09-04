import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UniversalDashboard, ThingsToApproveCard, HeartbeatMonitorCard } from "@/components/layout/universal-dashboard";
import { ThingsToApproveEnhanced } from "@/components/things-to-approve-enhanced";
import { HeartbeatMonitor } from "@/components/heartbeat-monitor";
import { FieldAgentDashboard } from "@/components/field-agent-dashboard";
import { StashCard } from "@/components/ui/stash-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys, apiRequest, handleMutationError } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { 
  Users, 
  BarChart3, 
  Briefcase, 
  TrendingUp,
  DollarSign,
  Building2,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

/**
 * Example of migrating Admin Dashboard to Universal Dashboard structure
 * This shows both Service Company and Client Company administrator dashboards
 */

interface DashboardStats {
  totalUsers: number;
  activeWorkOrders: number;
  completedWorkOrders: number;
  totalRevenue: number;
}

interface UniversalAdminDashboardProps {
  className?: string;
}

export function UniversalAdminDashboardExample({ className }: UniversalAdminDashboardProps) {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  // Get testing context for role simulation
  const testingRole = localStorage.getItem('testingRole') || 'administrator';
  const testingCompanyType = localStorage.getItem('testingCompanyType') || 'service';
  
  const userRole = testingRole || user?.role || 'administrator';
  const companyType = testingCompanyType as 'service' | 'client';

  // Data queries
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: queryKeys.dashboardStats(),
    enabled: !!user,
  });

  const { data: workOrders = [], isLoading: workOrdersLoading } = useQuery({
    queryKey: queryKeys.workOrders(),
    enabled: !!user,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: queryKeys.users(),
    enabled: !!user,
  });

  const { data: approvalRequests = [], isLoading: approvalsLoading } = useQuery({
    queryKey: queryKeys.approvalRequests(),
    enabled: !!user,
  });

  const { data: projectHealth = [], isLoading: healthLoading } = useQuery({
    queryKey: queryKeys.projectHealthSummary(),
    enabled: !!user,
  });

  // Event listeners for approval actions
  useEffect(() => {
    const handleOpenApprovals = () => setShowApprovalDialog(true);
    window.addEventListener('openThingsToApprove', handleOpenApprovals);
    return () => window.removeEventListener('openThingsToApprove', handleOpenApprovals);
  }, []);

  // Calculate metrics
  const pendingApprovals = approvalRequests.filter((req: any) => req.status === 'pending').length;
  const healthPercentage = projectHealth.length > 0 ? 
    Math.round(projectHealth.filter((p: any) => p.status === 'healthy').length / projectHealth.length * 100) : 100;

  // Define dashboard sections based on role and company type
  const getDashboardSections = () => {
    const baseSections = [
      {
        id: 'work-orders',
        title: 'Work Orders',
        component: (
          <StashCard
            title={workOrdersLoading ? "" : workOrders.length.toString()}
            subtitle="Active Work Orders"
            icon={
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 w-20 h-16 overflow-hidden">
                <div className="flex items-center justify-center h-full">
                  <Briefcase className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            }
            onClick={() => {/* Navigate to work orders page */}}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            data-testid="card-work-orders"
          />
        ),
        priority: 2,
        roles: ['administrator', 'project_manager', 'manager', 'dispatcher'],
        companyTypes: ['service', 'client']
      },
      {
        id: 'things-to-approve',
        title: 'Things to Approve',
        component: (
          <ThingsToApproveCard
            userRole={userRole}
            pendingCount={pendingApprovals}
            onClick={() => setShowApprovalDialog(true)}
            loading={approvalsLoading}
          />
        ),
        priority: 3,
        roles: ['administrator', 'project_manager', 'manager', 'dispatcher', 'field_engineer'],
        companyTypes: ['service', 'client']
      },
      {
        id: 'heartbeat-monitor',
        title: 'System Health',
        component: (
          <HeartbeatMonitorCard
            userRole={userRole}
            healthPercentage={healthPercentage}
            activeProjects={projectHealth.length}
            loading={healthLoading}
            onClick={() => {/* Open heartbeat details */}}
          />
        ),
        priority: 4,
        roles: ['administrator', 'project_manager', 'manager'],
        companyTypes: ['service', 'client']
      }
    ];

    // Service Company specific sections
    if (companyType === 'service') {
      baseSections.push({
        id: 'revenue-tracking',
        title: 'Revenue',
        component: (
          <StashCard
            title={statsLoading ? "" : `$${stats?.totalRevenue?.toLocaleString() || '0'}`}
            subtitle="Total Revenue"
            icon={
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 w-20 h-16 overflow-hidden">
                <div className="flex items-center justify-center h-full">
                  <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
            }
            onClick={() => {/* Navigate to revenue dashboard */}}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            data-testid="card-revenue"
          />
        ),
        priority: 5,
        roles: ['administrator'],
        companyTypes: ['service']
      });
    }

    // Client Company specific sections
    if (companyType === 'client') {
      baseSections.push({
        id: 'service-providers',
        title: 'Service Providers',
        component: (
          <StashCard
            title="12"
            subtitle="Active Providers"
            icon={
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 w-20 h-16 overflow-hidden">
                <div className="flex items-center justify-center h-full">
                  <Building2 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            }
            onClick={() => {/* Navigate to service providers */}}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            data-testid="card-service-providers"
          />
        ),
        priority: 5,
        roles: ['administrator'],
        companyTypes: ['client']
      });
    }

    return baseSections;
  };

  // Special case: Field Agent gets completely different layout
  if (userRole === 'field_agent') {
    return <FieldAgentDashboard className={className} />;
  }

  // Heartbeat data for header
  const heartbeatData = {
    percentage: healthPercentage,
    projectCount: projectHealth.length,
    variant: 'company' as const
  };

  return (
    <>
      <UniversalDashboard
        userRole={userRole}
        companyType={companyType}
        sections={getDashboardSections()}
        className={className}
        showHeartbeat={true}
        heartbeatData={heartbeatData}
      >
        {/* Additional custom content can go here */}
        {userRole === 'administrator' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-auto py-4 px-6 flex flex-col items-center space-y-2">
                  <Users className="h-6 w-6" />
                  <span className="text-sm">Add User</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 px-6 flex flex-col items-center space-y-2">
                  <Briefcase className="h-6 w-6" />
                  <span className="text-sm">New Project</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 px-6 flex flex-col items-center space-y-2">
                  <BarChart3 className="h-6 w-6" />
                  <span className="text-sm">View Reports</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 px-6 flex flex-col items-center space-y-2">
                  <TrendingUp className="h-6 w-6" />
                  <span className="text-sm">Analytics</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </UniversalDashboard>

      {/* Things to Approve Dialog */}
      {showApprovalDialog && (
        <ThingsToApproveEnhanced
          userRole={userRole}
          companyType={companyType}
        />
      )}

      {/* Heartbeat Monitor Dialog can be triggered from the card */}
      <HeartbeatMonitor
        userRole={userRole}
        companyType={companyType}
      />
    </>
  );
}

/**
 * MIGRATION GUIDE:
 * 
 * 1. Replace existing dashboard layout with UniversalDashboard component
 * 2. Convert existing metrics/stats into StashCard components
 * 3. Define dashboard sections with role/company type filters
 * 4. Add ThingsToApprove and HeartbeatMonitor components
 * 5. Keep existing business logic (queries, mutations) unchanged
 * 6. Add event listeners for universal navigation actions
 * 7. Use conditional rendering for role-specific content
 * 
 * BEFORE (Old Structure):
 * ```tsx
 * return (
 *   <div>
 *     <Navigation />
 *     <div className="container mx-auto px-4 py-8">
 *       <h1>Admin Dashboard</h1>
 *       <div className="grid grid-cols-4 gap-4">
 *         <Card>...</Card>
 *         <Card>...</Card>
 *       </div>
 *     </div>
 *   </div>
 * );
 * ```
 * 
 * AFTER (Universal Structure):
 * ```tsx
 * return (
 *   <UniversalDashboard
 *     userRole={userRole}
 *     companyType={companyType}
 *     sections={getDashboardSections()}
 *     showHeartbeat={true}
 *     heartbeatData={heartbeatData}
 *   >
 *     {/* Custom content */}
 *   </UniversalDashboard>
 * );
 * ```
 */