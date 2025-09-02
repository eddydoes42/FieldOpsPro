import { EKGWaveform } from "@/components/ui/ekg-waveform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

interface ProjectEKGMonitorProps {
  project: {
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
  };
  onClick?: () => void;
  className?: string;
  showDetails?: boolean;
}

export function ProjectEKGMonitor({
  project,
  onClick,
  className,
  showDetails = true
}: ProjectEKGMonitorProps) {
  
  // Determine EKG status based on project health and status
  const getEKGStatus = () => {
    if (project.projectFailed || project.projectStatus.toLowerCase().includes('failed')) {
      return 'critical';
    }
    if (project.healthScore < 40 || project.projectStatus.toLowerCase().includes('critical')) {
      return 'critical';
    }
    if (project.healthScore < 60 || project.projectStatus.toLowerCase().includes('delayed')) {
      return 'delayed';
    }
    if (project.healthScore < 80 || project.projectStatus.toLowerCase().includes('warning')) {
      return 'at_risk';
    }
    return 'normal';
  };

  // Determine severity based on escalation count and health score
  const getSeverity = () => {
    if (project.escalationCount >= 3 || project.healthScore < 30) {
      return 'severe';
    }
    if (project.escalationCount >= 2 || project.healthScore < 50) {
      return 'moderate';
    }
    if (project.escalationCount >= 1 || project.healthScore < 70) {
      return 'mild';
    }
    return 'none';
  };

  // Determine frequency based on recent activity and escalations
  const getFrequency = () => {
    const lastActivityDate = new Date(project.lastActivity);
    const hoursSinceActivity = (Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60);
    
    if (project.escalationCount >= 2 || hoursSinceActivity > 24) {
      return 'frequent';
    }
    return 'occasional';
  };

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

  const ekgStatus = getEKGStatus();
  const severity = getSeverity();
  const frequency = getFrequency();

  const content = (
    <Card className={cn(
      "border-2 transition-all duration-200",
      project.projectFailed && "border-red-500 dark:border-red-400",
      onClick && "cursor-pointer hover:shadow-md",
      className
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with project info */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                {project.workOrderTitle}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {project.companyName} • {project.healthScore}% Health
              </p>
            </div>
            
            {/* Status Badge */}
            <Badge
              variant="outline"
              className={cn("flex items-center gap-1 ml-2", getStatusColor(project.projectStatus))}
            >
              {getStatusIcon(project.projectStatus)}
              <span className="hidden sm:inline">
                {project.projectStatus.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </Badge>
          </div>

          {/* EKG Waveform */}
          <div className="bg-black rounded-md overflow-hidden">
            <EKGWaveform
              bpm={project.currentBpm}
              status={ekgStatus}
              severity={severity}
              frequency={frequency}
              width={320}
              height={80}
              className="w-full"
            />
          </div>

          {showDetails && (
            <>
              {/* Health Score Progress */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Health Score</span>
                  <span className={cn("text-xs font-medium", getBpmColor(project.currentBpm))}>
                    {project.currentBpm} BPM • {project.healthScore}%
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
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(project.lastActivity).toLocaleDateString()}
                  </span>
                </div>
                {project.assignedTo && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="truncate max-w-20">{project.assignedTo}</span>
                  </div>
                )}
              </div>

              {/* Escalation Warning */}
              {project.escalationCount > 0 && (
                <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-md px-2 py-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{project.escalationCount} escalation{project.escalationCount > 1 ? "s" : ""}</span>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (onClick) {
    return (
      <Button
        variant="ghost"
        className="h-auto p-0 w-full"
        onClick={onClick}
      >
        {content}
      </Button>
    );
  }

  return content;
}