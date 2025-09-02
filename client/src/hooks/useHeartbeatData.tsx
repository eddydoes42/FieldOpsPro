import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface HeartbeatData {
  percentage: number;
  projectCount: number;
  variant: "company" | "global";
  companyId?: string;
}

interface ProjectHeartbeat {
  id: string;
  workOrderId: string;
  currentBpm: number;
  healthScore: number;
  projectStatus: string;
  lastActivity: string;
  lastHealthCheck: string;
  monitoringEnabled: boolean;
  escalationCount: number;
  projectFailed: boolean;
}

export function useHeartbeatData(): HeartbeatData | null {
  const { user } = useAuth();
  
  // Get user roles to determine heartbeat scope
  const userRoles = (user as any)?.roles || [];
  const isOperationsDirector = userRoles.includes("operations_director");
  const isAdminTeam = userRoles.some((role: string) => 
    ["administrator", "manager", "project_manager", "dispatcher"].includes(role)
  );

  // Don't show heartbeat for field agents or client users
  const shouldShowHeartbeat = isOperationsDirector || isAdminTeam;

  // Fetch project health summary - this gives us aggregated heartbeat data
  const { data: healthSummary } = useQuery<any>({
    queryKey: ["/api/project-health-summary"],
    enabled: shouldShowHeartbeat,
    retry: false,
  });

  // Fetch work orders to get project count
  const { data: workOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/work-orders"],
    enabled: shouldShowHeartbeat,
    retry: false,
  });

  if (!shouldShowHeartbeat) {
    return null;
  }

  // Filter active projects (not completed, cancelled, or closed)
  const activeWorkOrders = workOrders.filter(wo => 
    wo.status && !["completed", "cancelled", "closed"].includes(wo.status.toLowerCase())
  );

  const totalActiveProjects = activeWorkOrders.length;
  
  if (totalActiveProjects === 0) {
    return {
      percentage: 100, // No active projects = 100% health
      projectCount: 0,
      variant: isOperationsDirector ? "global" : "company"
    };
  }

  // Use health summary data if available, otherwise calculate from work orders
  let averageHealthScore = 100;
  
  if (healthSummary && healthSummary.projects) {
    // Calculate average health score from project heartbeat data
    const projectsWithHeartbeat = healthSummary.projects.filter((p: any) => p.healthScore !== undefined);
    
    if (projectsWithHeartbeat.length > 0) {
      const totalHealthScore = projectsWithHeartbeat.reduce((sum: number, project: any) => 
        sum + project.healthScore, 0
      );
      averageHealthScore = totalHealthScore / projectsWithHeartbeat.length;
    }
  } else {
    // Fallback: calculate basic health based on project status
    let totalHealth = 0;
    let validProjects = 0;

    activeWorkOrders.forEach(wo => {
      let projectHealth = 100;
      
      // Reduce health based on status
      const status = wo.status?.toLowerCase() || "";
      if (status.includes("critical") || status.includes("failed")) {
        projectHealth = 20;
      } else if (status.includes("urgent") || status.includes("high")) {
        projectHealth = 40;
      } else if (status.includes("elevated") || status.includes("warning")) {
        projectHealth = 70;
      } else if (status.includes("in_progress") || status.includes("assigned")) {
        projectHealth = 85;
      }

      // Reduce health based on age
      if (wo.createdAt) {
        const daysSinceCreated = Math.floor(
          (Date.now() - new Date(wo.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceCreated > 14) {
          projectHealth = Math.max(20, projectHealth - 30);
        } else if (daysSinceCreated > 7) {
          projectHealth = Math.max(30, projectHealth - 15);
        }
      }

      totalHealth += projectHealth;
      validProjects++;
    });

    averageHealthScore = validProjects > 0 ? totalHealth / validProjects : 100;
  }

  return {
    percentage: Math.round(Math.max(0, Math.min(100, averageHealthScore))),
    projectCount: totalActiveProjects,
    variant: isOperationsDirector ? "global" : "company"
  };
}