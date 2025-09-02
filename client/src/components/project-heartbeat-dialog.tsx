import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StashCard } from "@/components/ui/stash-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Building2,
  Calendar,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectHeartbeatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: "company" | "global";
}

interface ProjectHeartbeatData {
  id: string;
  workOrderId: string;
  workOrderTitle?: string;
  companyName?: string;
  currentBpm: number;
  healthScore: number;
  projectStatus: string;
  lastActivity: string;
  escalationCount: number;
  projectFailed: boolean;
  assignedTo?: string;
  createdAt?: string;
}

export function ProjectHeartbeatDialog({
  open,
  onOpenChange,
  variant,
}: ProjectHeartbeatDialogProps) {
  // Fetch project health summary with detailed project data
  const { data: healthSummary, isLoading } = useQuery<any>({
    queryKey: ["/api/project-health-summary"],
    enabled: open,
    retry: false,
  });

  // Fetch work orders to get additional project details
  const { data: workOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/work-orders"],
    enabled: open,
    retry: false,
  });

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("failed") || statusLower.includes("critical")) {
      return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    }
    if (statusLower.includes("high_stress") || statusLower.includes("urgent")) {
      return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
    }
    if (statusLower.includes("elevated") || statusLower.includes("warning")) {
      return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
    }
    return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes("failed") || statusLower.includes("critical")) {
      return <XCircle className="h-4 w-4" />;
    }
    if (statusLower.includes("high_stress") || statusLower.includes("urgent")) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    if (statusLower.includes("elevated") || statusLower.includes("warning")) {
      return <Clock className="h-4 w-4" />;
    }
    return <CheckCircle className="h-4 w-4" />;
  };

  const getBpmColor = (bpm: number) => {
    if (bpm >= 180) return "text-red-600 dark:text-red-400";
    if (bpm >= 150) return "text-orange-600 dark:text-orange-400";
    if (bpm >= 100) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  // Combine heartbeat data with work order details
  const projectData: ProjectHeartbeatData[] = [];
  
  if (healthSummary?.projects) {
    healthSummary.projects.forEach((project: any) => {
      const workOrder = workOrders.find(wo => wo.id === project.workOrderId);
      projectData.push({
        ...project,
        workOrderTitle: workOrder?.title || `Work Order ${project.workOrderId}`,
        companyName: workOrder?.companyName || "Unknown Company",
        assignedTo: workOrder?.assignedTo,
        createdAt: workOrder?.createdAt,
      });
    });
  }

  // Sort by health score (worst first) and then by BPM
  const sortedProjects = projectData.sort((a, b) => {
    if (a.healthScore !== b.healthScore) {
      return a.healthScore - b.healthScore;
    }
    return b.currentBpm - a.currentBpm;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {variant === "global" ? "Global Project Heartbeat" : "Company Project Heartbeat"}
            <Badge variant="outline" className="ml-2">
              {sortedProjects.length} {sortedProjects.length === 1 ? "Project" : "Projects"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            View detailed heartbeat data for all {variant === "global" ? "active projects across all companies" : "active projects in your company"}.
            Projects are sorted by health score (lowest first).
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-32 w-full" />
                </div>
              ))}
            </div>
          ) : sortedProjects.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Active Projects
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                There are currently no active projects with heartbeat monitoring enabled.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedProjects.map((project) => (
                <StashCard
                  key={project.id}
                  title={project.workOrderTitle}
                  subtitle={`${project.companyName} • ${project.healthScore}% Health`}
                  className={cn(
                    "border-2",
                    project.projectFailed && "border-red-500 dark:border-red-400"
                  )}
                  testId={`project-heartbeat-${project.workOrderId}`}
                >
                  <div className="space-y-3">
                    {/* Status and BPM */}
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={cn("flex items-center gap-1", getStatusColor(project.projectStatus))}
                      >
                        {getStatusIcon(project.projectStatus)}
                        {project.projectStatus.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Current BPM</p>
                        <p className={cn("text-lg font-bold", getBpmColor(project.currentBpm))}>
                          {project.currentBpm}
                        </p>
                      </div>
                    </div>

                    {/* Health Score Progress */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Health Score</span>
                        <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                          {project.healthScore}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            project.healthScore >= 80 ? "bg-green-500" :
                            project.healthScore >= 60 ? "bg-yellow-500" :
                            project.healthScore >= 40 ? "bg-orange-500" : "bg-red-500"
                          )}
                          style={{ width: `${Math.max(5, project.healthScore)}%` }}
                        />
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        {variant === "global" && (
                          <>
                            <Building2 className="h-3 w-3" />
                            <span className="truncate max-w-20">{project.companyName}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(project.lastActivity).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Escalation Warning */}
                    {project.escalationCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-md px-2 py-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{project.escalationCount} escalation{project.escalationCount > 1 ? "s" : ""}</span>
                      </div>
                    )}
                  </div>
                </StashCard>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}