import { useMemo } from "react";
import { 
  Home, 
  Building2, 
  BarChart3, 
  Search, 
  Settings, 
  FolderOpen, 
  PlusCircle, 
  Briefcase, 
  ClipboardList, 
  User,
  Users,
  FileText,
  Clock,
  MessageSquare,
  Calendar,
  Wrench,
  MapPin
} from "lucide-react";

export interface NavItem {
  icon: any;
  label: string;
  route: string;
  badge?: number;
  disabled?: boolean;
}

interface UseRoleNavigationProps {
  userRole?: string | string[];
  unreadMessages?: number;
}

export function useRoleNavigation({ userRole, unreadMessages = 0 }: UseRoleNavigationProps) {
  const navigationItems = useMemo(() => {
    // Extract primary role if array
    const primaryRole = Array.isArray(userRole) ? userRole[0] : userRole;
    
    switch (primaryRole) {
      case "operations_director":
        return [
          { icon: Home, label: "Dashboard", route: "/operations-dashboard" },
          { icon: Building2, label: "Companies", route: "/operations/companies" },
          { icon: BarChart3, label: "Reports", route: "/operations/reports" },
          { icon: Search, label: "Search", route: "/search" },
          { icon: Settings, label: "Settings", route: "/operations/settings" }
        ];

      case "administrator":
      case "manager":
      case "project_manager":
        return [
          { icon: Home, label: "Dashboard", route: "/admin-dashboard" },
          { icon: FolderOpen, label: "Projects", route: "/work-orders" },
          { icon: Users, label: "Team", route: "/team" },
          { icon: MessageSquare, label: "Messages", route: "/messages", badge: unreadMessages },
          { icon: Settings, label: "Settings", route: "/settings" }
        ];

      case "dispatcher":
        return [
          { icon: Home, label: "Dashboard", route: "/manager-dashboard" },
          { icon: ClipboardList, label: "Work Orders", route: "/work-orders" },
          { icon: PlusCircle, label: "Create", route: "/work-orders/create" },
          { icon: MessageSquare, label: "Messages", route: "/messages", badge: unreadMessages },
          { icon: Search, label: "Search", route: "/search" }
        ];

      case "field_engineer":
      case "field_agent":
        return [
          { icon: Home, label: "Dashboard", route: "/mywork" },
          { icon: Briefcase, label: "My Jobs", route: "/field-agent-work" },
          { icon: Clock, label: "Time", route: "/time-tracking" },
          { icon: MessageSquare, label: "Messages", route: "/messages", badge: unreadMessages },
          { icon: User, label: "Profile", route: "/field-agent-settings" }
        ];

      case "client_company_admin":
      case "client":
        return [
          { icon: Home, label: "Dashboard", route: "/client-dashboard" },
          { icon: ClipboardList, label: "Work Orders", route: "/client/work-orders" },
          { icon: PlusCircle, label: "Create", route: "/client/work-orders/create" },
          { icon: Users, label: "Talent", route: "/talent-network" },
          { icon: Settings, label: "Settings", route: "/client/settings" }
        ];

      default:
        return [
          { icon: Home, label: "Dashboard", route: "/dashboard" },
          { icon: Search, label: "Search", route: "/search" },
          { icon: User, label: "Profile", route: "/profile" }
        ];
    }
  }, [userRole, unreadMessages]);

  return {
    navigationItems,
    primaryRole: Array.isArray(userRole) ? userRole[0] : userRole
  };
}