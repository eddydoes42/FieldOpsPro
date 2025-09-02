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

  // Get category label based on status
  const getCategoryLabel = () => {
    switch (ekgStatus) {
      case 'normal': return 'Normal';
      case 'at_risk': return 'At Risk';
      case 'delayed': return 'Delayed';
      case 'critical': return 'Critical';
      default: return 'Normal';
    }
  };

  const content = (
    <Card className={cn(
      "border border-gray-200 dark:border-gray-700 transition-all duration-200 bg-white dark:bg-gray-900",
      project.projectFailed && "border-red-300 dark:border-red-600",
      onClick && "cursor-pointer hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600",
      className
    )}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Minimal Header */}
          <div className="text-center">
            <h4 className="font-semibold text-base text-gray-900 dark:text-gray-100 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {project.workOrderTitle}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400" style={{ fontFamily: 'Poppins, sans-serif' }}>
              {project.companyName}
            </p>
          </div>

          {/* BPM Display - Prominent */}
          <div className="text-center space-y-2">
            <div className="flex items-baseline justify-center gap-2">
              <span className={cn(
                "text-4xl font-bold",
                ekgStatus === 'normal' ? "text-green-600 dark:text-green-400" :
                ekgStatus === 'at_risk' ? "text-yellow-600 dark:text-yellow-400" :
                ekgStatus === 'delayed' ? "text-orange-600 dark:text-orange-400" :
                "text-red-600 dark:text-red-400"
              )} style={{ fontFamily: 'Poppins, sans-serif' }}>
                {project.currentBpm}
              </span>
              <span className="text-lg font-medium text-gray-600 dark:text-gray-400" style={{ fontFamily: 'Poppins, sans-serif' }}>
                BPM
              </span>
            </div>
            
            {/* Category Label */}
            <div className={cn(
              "inline-block px-3 py-1 rounded-full text-sm font-medium",
              ekgStatus === 'normal' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" :
              ekgStatus === 'at_risk' ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" :
              ekgStatus === 'delayed' ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" :
              "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
            )} style={{ fontFamily: 'Poppins, sans-serif' }}>
              {getCategoryLabel()}
            </div>
          </div>

          {/* Enhanced EKG Waveform */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <EKGWaveform
              bpm={project.currentBpm}
              status={ekgStatus}
              severity={severity}
              frequency={frequency}
              width={340}
              height={100}
              className="w-full"
            />
          </div>
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