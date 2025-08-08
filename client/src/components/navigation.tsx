import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

interface NavigationProps {
  userRole: string;
}

export default function Navigation({ userRole }: NavigationProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch messages to calculate unread count
  const { data: messages } = useQuery<any[]>({
    queryKey: ["/api/messages"],
    retry: false,
  });

  const currentUserId = (user as any)?.id;
  const unreadCount = messages?.filter((msg: any) => 
    !msg.isRead && msg.recipientId === currentUserId
  ).length || 0;

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getRoleConfig = () => {
    switch (userRole) {
      case 'administrator':
        return {
          badge: { text: 'Administrator', icon: 'fas fa-crown', color: 'bg-purple-900/30 text-purple-300 border-purple-800/50' },
          links: [
            { path: '/', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
            { path: '/team', label: 'My Team', icon: 'fas fa-users' },
            { path: '/work-orders', label: 'Work Orders', icon: 'fas fa-clipboard-list' },
            { path: '/reports', label: 'Reports', icon: 'fas fa-chart-bar' },
            { path: '/settings', label: 'Settings', icon: 'fas fa-cog' },
          ]
        };
      case 'manager':
        return {
          badge: { text: 'Manager', icon: 'fas fa-users-cog', color: 'bg-blue-900/30 text-blue-300 border-blue-800/50' },
          links: [
            { path: '/', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
            { path: '/onboarding', label: 'Onboarding', icon: 'fas fa-user-plus' },
            { path: '/work-orders', label: 'Work Orders', icon: 'fas fa-clipboard-list' },
            { path: '/reports/team', label: 'Team Reports', icon: 'fas fa-chart-bar' },
            { path: '/team', label: 'My Team', icon: 'fas fa-users' },
            { path: '/messages', label: 'Messages', icon: 'fas fa-comments', showUnreadCount: true },
          ]
        };
      default:
        return {
          badge: { text: 'FA', icon: 'fas fa-wrench', color: 'bg-green-900/30 text-green-300 border-green-800/50' },
          links: [
            { path: '/', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
            { path: '/work-orders', label: 'My Orders', icon: 'fas fa-clipboard-list' },
            { path: '/time-tracking', label: 'Time Tracking', icon: 'fas fa-clock' },
            { path: '/messages', label: 'Messages', icon: 'fas fa-comments', showUnreadCount: true },
          ]
        };
    }
  };

  const config = getRoleConfig();

  return (
    <nav className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center mr-3">
              <i className="fas fa-tools text-white text-sm"></i>
            </div>
            <span className="text-xl font-bold text-foreground whitespace-nowrap">FieldOps Pro</span>
          </div>
          
          {/* Right side - Navigation Menu Dropdown */}
          <div className="flex items-center space-x-4">
            {/* Navigation Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                {(user as any)?.profileImageUrl && (
                  <img 
                    className="h-8 w-8 rounded-full object-cover" 
                    src={(user as any).profileImageUrl} 
                    alt="Profile"
                  />
                )}
                <span className="text-foreground font-medium text-sm hidden md:block">
                  {(user as any)?.firstName} {(user as any)?.lastName}
                </span>
                <i className="fas fa-bars text-muted-foreground"></i>
              </button>
              
              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center space-x-3">
                      {(user as any)?.profileImageUrl && (
                        <img 
                          className="h-10 w-10 rounded-full object-cover" 
                          src={(user as any).profileImageUrl} 
                          alt="Profile"
                        />
                      )}
                      <div>
                        <p className="font-medium text-foreground">
                          {(user as any)?.firstName} {(user as any)?.lastName}
                        </p>
                        {/* Role Badge */}
                        <span className={`${config.badge.color} text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap inline-flex mt-1`}>
                          <i className={`${config.badge.icon} mr-1`}></i>
                          {config.badge.text}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="py-2">
                    {config.links.map((link) => (
                      <Link key={link.path} href={link.path}>
                        <div 
                          className={`flex items-center justify-between px-4 py-2 text-sm hover:bg-secondary/50 cursor-pointer ${
                            location === link.path ? 'bg-primary/10 text-primary' : 'text-foreground'
                          }`}
                          onClick={() => setDropdownOpen(false)}
                        >
                          <div className="flex items-center">
                            <i className={`${link.icon} mr-3 w-4`}></i>
                            {link.label}
                          </div>
                          {(link as any).showUnreadCount && unreadCount > 0 && (
                            <Badge className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                  <div className="border-t border-border py-2">
                    <button
                      onClick={handleLogout}
                      className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                    >
                      <i className="fas fa-sign-out-alt mr-3 w-4"></i>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </nav>
  );
}
