import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

interface HeartbeatData {
  percentage: number;
  projectCount: number;
  variant: "company" | "global";
  companyId?: string;
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

  // Fetch work orders for heartbeat calculation
  const { data: workOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/work-orders"],
    enabled: shouldShowHeartbeat,
    retry: false,
  });

  // Fetch companies for operations director
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ["/api/companies"],
    enabled: isOperationsDirector,
    retry: false,
  });

  if (!shouldShowHeartbeat) {
    return null;
  }

  // Calculate heartbeat based on active work orders
  const activeWorkOrders = workOrders.filter(wo => 
    wo.status && !["completed", "cancelled", "closed"].includes(wo.status.toLowerCase())
  );

  const totalProjects = activeWorkOrders.length;
  
  if (totalProjects === 0) {
    return {
      percentage: 100, // No active projects = 100% health
      projectCount: 0,
      variant: isOperationsDirector ? "global" : "company"
    };
  }

  // Calculate health based on various factors
  let healthScore = 0;
  let validProjects = 0;

  activeWorkOrders.forEach(wo => {
    let projectHealth = 100;
    
    // Reduce health based on status
    if (wo.status === "urgent" || wo.status === "critical") {
      projectHealth -= 40;
    } else if (wo.status === "in_progress" || wo.status === "assigned") {
      projectHealth -= 10;
    } else if (wo.status === "pending" || wo.status === "new") {
      projectHealth -= 20;
    }

    // Reduce health based on age (if created more than 7 days ago)
    if (wo.createdAt) {
      const daysSinceCreated = Math.floor(
        (Date.now() - new Date(wo.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceCreated > 7) {
        projectHealth -= Math.min(30, daysSinceCreated * 2);
      }
    }

    // Ensure health doesn't go below 0
    projectHealth = Math.max(0, projectHealth);
    
    healthScore += projectHealth;
    validProjects++;
  });

  const averageHealth = validProjects > 0 ? healthScore / validProjects : 100;

  return {
    percentage: Math.round(averageHealth),
    projectCount: totalProjects,
    variant: isOperationsDirector ? "global" : "company"
  };
}