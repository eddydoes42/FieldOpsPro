import { ReactNode, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { StashLayout } from "@/components/layout/stash-layout";
import { StashCard } from "@/components/ui/stash-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  FileText, 
  TrendingUp,
  Users,
  Building2,
  Activity
} from "lucide-react";

interface DashboardSection {
  id: string;
  title: string;
  component: ReactNode;
  priority: number;
  roles: string[];
  companyTypes?: ('service' | 'client')[];
}

interface UniversalDashboardProps {
  userRole: string;
  companyType?: 'service' | 'client';
  sections: DashboardSection[];
  children?: ReactNode;
  className?: string;
  showHeartbeat?: boolean;
  heartbeatData?: {
    percentage: number;
    projectCount: number;
    variant: "company" | "global";
  };
}

export function UniversalDashboard({
  userRole,
  companyType = 'service',
  sections,
  children,
  className,
  showHeartbeat = false,
  heartbeatData
}: UniversalDashboardProps) {
  const { user } = useAuth();
  
  // Filter sections based on role and company type
  const visibleSections = sections
    .filter(section => {
      const hasRoleAccess = section.roles.includes(userRole) || section.roles.includes('*');
      const hasCompanyTypeAccess = !section.companyTypes || section.companyTypes.includes(companyType);
      return hasRoleAccess && hasCompanyTypeAccess;
    })
    .sort((a, b) => a.priority - b.priority);

  // Role-specific title mapping
  const getDashboardTitle = (role: string, companyType: string) => {
    if (role === 'operations_director') return 'Operations Dashboard';
    if (role === 'administrator') {
      return companyType === 'service' ? 'Service Company Dashboard' : 'Client Company Dashboard';
    }
    if (role === 'project_manager') return 'Project Manager Dashboard';
    if (role === 'manager') return 'Management Dashboard';
    if (role === 'dispatcher') return 'Dispatch Dashboard';
    if (role === 'field_engineer') return 'Field Engineering Dashboard';
    if (role === 'field_agent') return 'My Work Dashboard';
    return 'Dashboard';
  };

  return (
    <StashLayout
      showSearch={userRole !== 'field_agent'}
      showHeartbeat={showHeartbeat}
      heartbeatData={heartbeatData}
    >
      <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", className)}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-center items-center mb-6">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              {getDashboardTitle(userRole, companyType)}
            </h1>
          </div>
        </div>

        {/* Role-specific content for non-field agents */}
        {userRole !== 'field_agent' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
            {visibleSections.map((section) => (
              <div key={section.id} className="col-span-1">
                {section.component}
              </div>
            ))}
          </div>
        )}

        {/* Field Agent simplified layout */}
        {userRole === 'field_agent' && (
          <div className="space-y-6">
            {visibleSections.map((section) => (
              <div key={section.id}>
                {section.component}
              </div>
            ))}
          </div>
        )}

        {/* Additional custom content */}
        {children && (
          <div className="mt-8">
            {children}
          </div>
        )}
      </div>
    </StashLayout>
  );
}

// Things to Approve Component for Universal Use
interface ThingsToApproveProps {
  userRole: string;
  pendingCount: number;
  onClick?: () => void;
  loading?: boolean;
}

export function ThingsToApproveCard({ 
  userRole, 
  pendingCount, 
  onClick, 
  loading = false 
}: ThingsToApproveProps) {
  if (userRole === 'field_agent') return null;

  return (
    <StashCard
      title={loading ? "" : pendingCount.toString()}
      subtitle="Things to Approve"
      icon={
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 w-20 h-16 overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <FileText className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
      }
      onClick={onClick}
      className="cursor-pointer hover:shadow-lg transition-shadow"
      data-testid="card-things-to-approve"
    />
  );
}

// Heartbeat Monitor Component for Manager+ Roles
interface HeartbeatMonitorProps {
  userRole: string;
  healthPercentage: number;
  activeProjects: number;
  loading?: boolean;
  onClick?: () => void;
}

export function HeartbeatMonitorCard({ 
  userRole, 
  healthPercentage, 
  activeProjects, 
  loading = false, 
  onClick 
}: HeartbeatMonitorProps) {
  const managerRoles = ['operations_director', 'administrator', 'project_manager', 'manager'];
  
  if (!managerRoles.includes(userRole)) return null;

  const getHealthColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getHealthIcon = (percentage: number) => {
    if (percentage >= 80) return <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />;
    if (percentage >= 60) return <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
    return <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />;
  };

  return (
    <StashCard
      title={loading ? "" : `${healthPercentage}%`}
      subtitle="System Health"
      icon={
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 w-20 h-16 overflow-hidden">
          <div className="flex flex-col items-center justify-center h-full space-y-1">
            {loading ? <Skeleton className="h-5 w-5" /> : getHealthIcon(healthPercentage)}
            <span className={cn("text-xs font-medium", loading ? "" : getHealthColor(healthPercentage))}>
              {loading ? <Skeleton className="h-3 w-8" /> : `${activeProjects} active`}
            </span>
          </div>
        </div>
      }
      onClick={onClick}
      className="cursor-pointer hover:shadow-lg transition-shadow"
      data-testid="card-heartbeat-monitor"
    />
  );
}