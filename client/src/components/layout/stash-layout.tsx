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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";
import { Link } from "wouter";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
      {/* Omnipresent Hamburger Menu */}
      <div className="fixed top-4 left-4 z-50">
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow border-2 border-gray-200 dark:border-gray-600"
              data-testid="hamburger-menu-trigger"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent 
            side="left" 
            className="w-80 p-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700"
            data-testid="hamburger-menu-content"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                  <i className="fas fa-tools text-white text-sm"></i>
                </div>
                <span className="text-lg font-bold text-foreground">FieldOps Pro</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(false)}
                data-testid="close-menu-button"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Navigation Links */}
            <div className="flex-1 overflow-y-auto p-4">
              <nav className="space-y-2">
                {navigationItems.map((item, index) => (
                  <Link
                    key={index}
                    href={item.route}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    onClick={() => {
                      if (item.onClick) {
                        item.onClick();
                      }
                      setIsMenuOpen(false);
                    }}
                    data-testid={`menu-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {item.icon && (
                      <div className="flex-shrink-0">
                        {typeof item.icon === 'string' ? (
                          <i className={`${item.icon} w-5 h-5 text-current`}></i>
                        ) : (
                          <span className="w-5 h-5 flex items-center justify-center">{item.icon}</span>
                        )}
                      </div>
                    )}
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>
            
            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                {(user as any)?.profileImageUrl ? (
                  <img 
                    className="h-8 w-8 rounded-full object-cover" 
                    src={(user as any).profileImageUrl} 
                    alt="Profile"
                  />
                ) : (
                  <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <i className="fas fa-user text-gray-600 dark:text-gray-400 text-sm"></i>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {(user as any)?.firstName || 'User'} {(user as any)?.lastName || ''}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {(user as any)?.email || ''}
                  </p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
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
        "pb-20 pt-4 pl-4 pr-4", // Consistent padding for omnipresent bottom nav and hamburger menu
        "sm:pl-16", // Extra left padding on larger screens for hamburger button
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