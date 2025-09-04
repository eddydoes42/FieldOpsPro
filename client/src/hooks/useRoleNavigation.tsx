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
  MapPin,
  CheckSquare
} from "lucide-react";

export interface NavItem {
  icon: any;
  label: string;
  route: string;
  badge?: number;
  disabled?: boolean;
  onClick?: () => void;
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
          { icon: CheckSquare, label: "Approve", route: "#", onClick: () => {
            // Will be handled by the component using this hook
            const event = new CustomEvent('openThingsToApprove');
            window.dispatchEvent(event);
          }},
          { icon: Search, label: "Search", route: "/search" },
          { icon: Settings, label: "Settings", route: "/settings" }
        ];

      case "administrator":
        return [
          { icon: Home, label: "Dashboard", route: "/dashboard" },
          { icon: Users, label: "Team", route: "/team" },
          { icon: FolderOpen, label: "Work Orders", route: "/work-orders" },
          { icon: Briefcase, label: "Job Network", route: "/job-network" },
          { icon: BarChart3, label: "Reports", route: "/reports" },
          { icon: CheckSquare, label: "Approve", route: "#", onClick: () => {
            const event = new CustomEvent('openThingsToApprove');
            window.dispatchEvent(event);
          }},
          { icon: MessageSquare, label: "Messages", route: "/messages", badge: unreadMessages }
        ];

      case "project_manager":
        return [
          { icon: Home, label: "Dashboard", route: "/dashboard" },
          { icon: FolderOpen, label: "Projects", route: "/projects" },
          { icon: Briefcase, label: "Job Network", route: "/job-network" },
          { icon: Users, label: "Talent", route: "/talent-network" },
          { icon: CheckSquare, label: "Approve", route: "#", onClick: () => {
            const event = new CustomEvent('openThingsToApprove');
            window.dispatchEvent(event);
          }},
          { icon: MessageSquare, label: "Messages", route: "/messages", badge: unreadMessages }
        ];

      case "manager":
        return [
          { icon: Home, label: "Dashboard", route: "/dashboard" },
          { icon: Users, label: "Team", route: "/team" },
          { icon: FolderOpen, label: "Work Orders", route: "/work-orders" },
          { icon: Calendar, label: "Calendar", route: "/calendar" },
          { icon: CheckSquare, label: "Approve", route: "#", onClick: () => {
            const event = new CustomEvent('openThingsToApprove');
            window.dispatchEvent(event);
          }},
          { icon: MessageSquare, label: "Messages", route: "/messages", badge: unreadMessages }
        ];

      case "dispatcher":
        return [
          { icon: Home, label: "Dashboard", route: "/dashboard" },
          { icon: ClipboardList, label: "Work Orders", route: "/work-orders" },
          { icon: Calendar, label: "Calendar", route: "/calendar" },
          { icon: CheckSquare, label: "Approve", route: "#", onClick: () => {
            const event = new CustomEvent('openThingsToApprove');
            window.dispatchEvent(event);
          }},
          { icon: MessageSquare, label: "Messages", route: "/messages", badge: unreadMessages }
        ];

      case "field_engineer":
        return [
          { icon: Home, label: "Dashboard", route: "/dashboard" },
          { icon: Briefcase, label: "My Work", route: "/mywork" },
          { icon: Users, label: "My Team", route: "/my-team" },
          { icon: CheckSquare, label: "Approve", route: "#", onClick: () => {
            const event = new CustomEvent('openThingsToApprove');
            window.dispatchEvent(event);
          }},
          { icon: MessageSquare, label: "Messages", route: "/messages", badge: unreadMessages }
        ];

      case "field_agent":
        return [
          { icon: Briefcase, label: "My Work", route: "/mywork" },
          { icon: MessageSquare, label: "Messages", route: "/messages", badge: unreadMessages },
          { icon: User, label: "Settings", route: "/settings" }
        ];

      case "client_company_admin":
      case "client":
        return [
          { icon: Home, label: "Dashboard", route: "/dashboard" },
          { icon: ClipboardList, label: "Work Orders", route: "/work-orders" },
          { icon: PlusCircle, label: "Create", route: "/work-orders/create" },
          { icon: Users, label: "Talent", route: "/talent-network" },
          { icon: Settings, label: "Settings", route: "/settings" }
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