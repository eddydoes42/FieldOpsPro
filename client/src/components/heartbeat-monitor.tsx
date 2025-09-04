import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { queryKeys } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

interface ProjectHealthData {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  completionPercentage: number;
  issueCount: number;
  lastUpdate: string;
  workOrderCount: number;
  companyId: string;
  companyName?: string;
}

interface HeartbeatMonitorProps {
  userRole: string;
  companyType?: 'service' | 'client';
  className?: string;
}

export function HeartbeatMonitor({ 
  userRole, 
  companyType = 'service', 
  className 
}: HeartbeatMonitorProps) {
  const [showDialog, setShowDialog] = useState(false);

  // Only show for Manager+ roles
  const managerRoles = ['operations_director', 'administrator', 'project_manager', 'manager'];
  if (!managerRoles.includes(userRole)) return null;

  // Query for project health data
  const { data: healthData = [], isLoading } = useQuery<ProjectHealthData[]>({
    queryKey: queryKeys.projectHealthSummary(),
    refetchInterval: 30000, // Refresh every 30 seconds for real-time monitoring
    refetchOnWindowFocus: true,
    staleTime: 15000,
  });

  // Calculate overall health percentage
  const calculateOverallHealth = (projects: ProjectHealthData[]) => {
    if (projects.length === 0) return 100; // No projects = healthy state
    
    const healthScores = projects.map(project => {
      switch (project.status) {
        case 'healthy': return 100;
        case 'warning': return 60;
        case 'critical': return 20;
        default: return 50;
      }
    });
    
    return Math.round(healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length);
  };

  const overallHealth = calculateOverallHealth(healthData);
  const activeProjects = healthData.length;
  const criticalProjects = healthData.filter(p => p.status === 'critical').length;
  const warningProjects = healthData.filter(p => p.status === 'warning').length;

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

  const getHealthBadgeVariant = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
    if (percentage >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
    return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
  };

  const getProjectStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default: return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <Card className={cn("cursor-pointer hover:shadow-lg transition-shadow", className)}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>System Health</span>
            </div>
            <Skeleton className="h-6 w-16" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <div className="flex justify-between text-sm">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className={cn("cursor-pointer hover:shadow-lg transition-shadow", className)}
        onClick={() => setShowDialog(true)}
        data-testid="card-heartbeat-monitor"
      >
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getHealthIcon(overallHealth)}
              <span>System Health</span>
            </div>
            <Badge variant="outline" className={cn("text-sm font-semibold", getHealthBadgeVariant(overallHealth))}>
              {overallHealth}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <Progress value={overallHealth} className="h-2" />
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{activeProjects} Active Projects</span>
              <span className={cn("font-medium", getHealthColor(overallHealth))}>
                {overallHealth >= 80 ? 'Healthy' : overallHealth >= 60 ? 'Monitor' : 'Action Needed'}
              </span>
            </div>
            {(criticalProjects > 0 || warningProjects > 0) && (
              <div className="flex space-x-4 text-xs">
                {criticalProjects > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    {criticalProjects} Critical
                  </span>
                )}
                {warningProjects > 0 && (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    {warningProjects} Warning
                  </span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Health Details Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>System Health Monitor</span>
              <Badge variant="outline" className={cn("text-sm", getHealthBadgeVariant(overallHealth))}>
                {overallHealth}% Overall
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{activeProjects}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Projects</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {healthData.filter(p => p.status === 'healthy').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Healthy</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{warningProjects}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Warning</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{criticalProjects}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Critical</div>
              </div>
            </div>

            {/* Project Details */}
            {healthData.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  All Systems Healthy
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  No active projects requiring attention at this time.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Project Status Details
                </h3>
                {healthData
                  .sort((a, b) => {
                    // Sort by status priority: critical > warning > healthy
                    const statusOrder = { critical: 0, warning: 1, healthy: 2 };
                    return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder];
                  })
                  .map((project) => (
                    <Card key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            {getProjectStatusIcon(project.status)}
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {project.name}
                              </h4>
                              {project.companyName && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {project.companyName}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              project.status === 'healthy' ? 'border-green-200 text-green-800 dark:text-green-200' :
                              project.status === 'warning' ? 'border-yellow-200 text-yellow-800 dark:text-yellow-200' :
                              'border-red-200 text-red-800 dark:text-red-200'
                            )}
                          >
                            {project.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{project.completionPercentage}%</span>
                          </div>
                          <Progress value={project.completionPercentage} className="h-1" />
                          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                            <span>{project.workOrderCount} Work Orders</span>
                            <span>{project.issueCount} Issues</span>
                            <span>Updated {new Date(project.lastUpdate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}