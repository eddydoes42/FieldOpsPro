import { ReactNode, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { SearchBar } from "@/components/ui/search-bar";
import { BottomNav } from "@/components/ui/bottom-nav";
import { HeartbeatBar } from "@/components/ui/heartbeat-bar";
import { ProjectHeartbeatDialog } from "@/components/project-heartbeat-dialog";
import { cn } from "@/lib/utils";

interface StashLayoutProps {
  children: ReactNode;
  showSearch?: boolean;
  showHeartbeat?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchClear?: () => void;
  searchPlaceholder?: string;
  className?: string;
  heartbeatData?: {
    percentage: number;
    projectCount: number;
    variant: "company" | "global";
  };
}

export function StashLayout({
  children,
  showSearch = true,
  showHeartbeat = false,
  searchValue = "",
  onSearchChange,
  onSearchClear,
  searchPlaceholder = "Search...",
  className,
  heartbeatData,
}: StashLayoutProps) {
  const { user } = useAuth();
  const [showHeartbeatDialog, setShowHeartbeatDialog] = useState(false);
  
  // Get unread messages count for bottom navigation badge
  const { data: messages = [] } = useQuery<any[]>({
    queryKey: ["/api/messages"],
    retry: false,
  });

  const currentUserId = (user as any)?.id;
  const unreadCount = messages?.filter((msg: any) => 
    !msg.isRead && msg.recipientId === currentUserId
  ).length || 0;

  // Get role-based navigation
  const userRoles = (user as any)?.roles || [];
  const { navigationItems } = useRoleNavigation({ 
    userRole: userRoles, 
    unreadMessages: unreadCount 
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Search Bar Section */}
      {showSearch && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
          <SearchBar
            value={searchValue}
            onChange={onSearchChange}
            onClear={onSearchClear}
            placeholder={searchPlaceholder}
            className="max-w-2xl mx-auto"
          />
        </div>
      )}

      {/* Heartbeat Monitor - Conditional */}
      {showHeartbeat && heartbeatData && (
        <HeartbeatBar
          label={heartbeatData.variant === "global" ? "Global Heartbeat" : "Company Heartbeat"}
          percentage={heartbeatData.percentage}
          projectCount={heartbeatData.projectCount}
          variant={heartbeatData.variant}
          onClick={() => setShowHeartbeatDialog(true)}
        />
      )}

      {/* Main Content Area */}
      <main className={cn(
        "pb-20 lg:pb-8", // Extra padding for mobile bottom nav
        className
      )}>
        {children}
      </main>

      {/* Bottom Navigation - Mobile/Tablet Only */}
      <BottomNav items={navigationItems} />

      {/* Project Heartbeat Dialog */}
      {showHeartbeat && heartbeatData && (
        <ProjectHeartbeatDialog
          open={showHeartbeatDialog}
          onOpenChange={setShowHeartbeatDialog}
          variant={heartbeatData.variant}
        />
      )}
    </div>
  );
}