import { ReactNode, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { SearchBar } from "@/components/ui/search-bar";
import { BottomNav } from "@/components/ui/bottom-nav";
import { HeartbeatBar } from "@/components/ui/heartbeat-bar";
import { ProjectHeartbeatDialog } from "@/components/project-heartbeat-dialog";
import { SearchPopup } from "@/components/search-popup";
import { ThingsToApprovePopup } from "@/components/things-to-approve-popup";
import { DeviceMemoryPrompt } from "@/components/device-memory-prompt";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deviceAuthService } from "@/lib/deviceAuth";

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
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [showThingsToApprove, setShowThingsToApprove] = useState(false);
  const [showDeviceMemoryPrompt, setShowDeviceMemoryPrompt] = useState(false);
  
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

  // Handle search click from navigation
  const handleSearchClick = () => {
    setShowSearchPopup(true);
  };

  // Listen for Things to Approve popup trigger
  useEffect(() => {
    const handleOpenThingsToApprove = () => {
      setShowThingsToApprove(true);
    };

    window.addEventListener('openThingsToApprove', handleOpenThingsToApprove);
    return () => {
      window.removeEventListener('openThingsToApprove', handleOpenThingsToApprove);
    };
  }, []);

  // Show device memory prompt if user is authenticated and device should be remembered
  useEffect(() => {
    if (user && deviceAuthService.shouldShowRememberDevicePrompt()) {
      // Show prompt after a short delay to ensure proper mounting
      const timer = setTimeout(() => {
        setShowDeviceMemoryPrompt(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Transform navigation items to handle search popup
  const transformedNavigationItems = navigationItems.map(item => {
    if (item.route === '/search') {
      return {
        ...item,
        route: '#', // Prevent routing
        onClick: handleSearchClick
      };
    }
    return item;
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
        "pb-20 pt-4 px-4", // Consistent padding for omnipresent bottom nav
        className
      )}>
        {children}
      </main>

      {/* Bottom Navigation - Omnipresent */}
      <BottomNav items={transformedNavigationItems} onItemClick={(item) => {
        if (item.onClick) {
          item.onClick();
        }
      }} />

      {/* Project Heartbeat Dialog */}
      {showHeartbeat && heartbeatData && (
        <ProjectHeartbeatDialog
          open={showHeartbeatDialog}
          onOpenChange={setShowHeartbeatDialog}
          variant={heartbeatData.variant}
        />
      )}

      {/* Search Popup */}
      <SearchPopup
        open={showSearchPopup}
        onOpenChange={setShowSearchPopup}
      />

      {/* Things to Approve Popup */}
      <ThingsToApprovePopup
        open={showThingsToApprove}
        onClose={() => setShowThingsToApprove(false)}
      />

      {/* Device Memory Prompt */}
      <DeviceMemoryPrompt
        open={showDeviceMemoryPrompt}
        onOpenChange={setShowDeviceMemoryPrompt}
        username={(user as any)?.email || (user as any)?.firstName}
        onDeviceRemembered={() => {
          // Update device usage when remembered
          deviceAuthService.updateDeviceUsage((user as any)?.email || (user as any)?.firstName);
        }}
      />
    </div>
  );
}