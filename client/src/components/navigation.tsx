import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import QuickActionMenu from "@/components/quick-action-menu";
import { useQuickActionMenu } from "@/hooks/useQuickActionMenu";
import { Zap } from "lucide-react";
import PermanentRoleSwitcher from "@/components/permanent-role-switcher";

interface NavigationProps {
  testingRole?: string;
  currentActiveRole?: string;
  onPermanentRoleSwitch?: (role: string) => void;
}

export default function Navigation({ testingRole, currentActiveRole, onPermanentRoleSwitch }: NavigationProps = {}) {
  const { user } = useAuth();
  const [location] = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Quick action menu
  const { isOpen: isQuickMenuOpen, position: quickMenuPosition, openMenu: openQuickMenu, closeMenu: closeQuickMenu } = useQuickActionMenu();

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
    // Clear role selection when logging out
    localStorage.removeItem('selectedRole');
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
    // Check if we're on operations dashboard - if so, always show Operations Director navigation
    const isOnOperationsDashboard = typeof window !== 'undefined' ? window.location.pathname === '/operations-dashboard' : false;
    const storedTestingRole = typeof window !== 'undefined' ? localStorage.getItem('testingRole') : null;
    
    
    if (isOnOperationsDashboard) {
      // Always show Operations Director navigation on operations dashboard
      return {
        badge: { text: 'Operations Director', icon: 'fas fa-globe', color: 'bg-indigo-900/30 text-indigo-300 border-indigo-800/50' },
        links: [
          { path: '/operations-dashboard', label: 'Operations Dashboard', icon: 'fas fa-chart-network' },
          { path: '/operations/companies', label: 'Companies', icon: 'fas fa-building' },
          { path: '/operations/active-admins', label: 'Administrators', icon: 'fas fa-users-cog' },
          { path: '/operations/recent-setups', label: 'Recent Setups', icon: 'fas fa-user-plus' },
          { path: '/job-network', label: 'Job Network', icon: 'fas fa-network-wired' },
          { path: '/talent-network', label: 'Talent Network', icon: 'fas fa-users' },
          { path: '/project-network', label: 'Project Network', icon: 'fas fa-project-diagram' },
          { path: '/operations/exclusive-network', label: 'Exclusive Networks', icon: 'fas fa-shield-alt' },
          { path: '/messages', label: 'Messages', icon: 'fas fa-comments', showUnreadCount: true },
        ]
      };
    }
    
    // Check for testing role from localStorage or prop  
    const activeTestingRole = testingRole || storedTestingRole;
    
    // Use testing role if active, otherwise use actual user roles
    if (activeTestingRole) {
      const roles = [activeTestingRole];
      return getConfigForRoles(roles);
    }
    
    // Handle multiple roles by prioritizing highest privilege role
    const userRoles = (user as any)?.roles || [];
    const roles = Array.isArray(userRoles) ? userRoles : [userRoles];
    return getConfigForRoles(roles);
  };

  const getConfigForRoles = (roles: string[]) => {
    // Check if actual user has operations_director role
    const isOperationsDirector = roles.includes('operations_director');
    
    // For Operations Director when not testing, show Operations Director navigation
    if (isOperationsDirector) {
      return {
        badge: { text: 'Operations Director', icon: 'fas fa-globe', color: 'bg-indigo-900/30 text-indigo-300 border-indigo-800/50' },
        links: [
          { path: '/operations-dashboard', label: 'Operations Dashboard', icon: 'fas fa-chart-network' },
          { path: '/operations/companies', label: 'Companies', icon: 'fas fa-building' },
          { path: '/operations/active-admins', label: 'Administrators', icon: 'fas fa-users-cog' },
          { path: '/operations/recent-setups', label: 'Recent Setups', icon: 'fas fa-user-plus' },
          { path: '/job-network', label: 'Job Network', icon: 'fas fa-network-wired' },
          { path: '/talent-network', label: 'Talent Network', icon: 'fas fa-users' },
          { path: '/project-network', label: 'Project Network', icon: 'fas fa-project-diagram' },
          { path: '/operations/exclusive-network', label: 'Exclusive Networks', icon: 'fas fa-shield-alt' },
          { path: '/messages', label: 'Messages', icon: 'fas fa-comments', showUnreadCount: true },
        ]
      };
    }
    
    const priorityRole = isOperationsDirector ? 'operations_director' :
                        roles.includes('administrator') ? 'administrator' :
                        roles.includes('project_manager') ? 'project_manager' :
                        roles.includes('manager') ? 'manager' :
                        roles.includes('dispatcher') ? 'dispatcher' :
                        roles.includes('client_company_admin') ? 'client_company_admin' : 'field_agent';

    // Create combined role badge for multiple roles
    const roleDisplay = roles.length > 1 ? 
      `${priorityRole === 'administrator' ? 'Admin' : priorityRole === 'project_manager' ? 'Project Mgr' : priorityRole === 'manager' ? 'Manager' : priorityRole === 'dispatcher' ? 'Dispatcher' : 'Agent'} +${roles.length - 1}` :
      priorityRole;

    switch (priorityRole) {
      case 'operations_director':
        return {
          badge: { text: 'Operations Director', icon: 'fas fa-globe', color: 'bg-indigo-900/30 text-indigo-300 border-indigo-800/50' },
          links: [
            { path: '/operations-dashboard', label: 'Operations Dashboard', icon: 'fas fa-chart-network' },
            { path: '/operations/companies', label: 'Companies', icon: 'fas fa-building' },
            { path: '/operations/active-admins', label: 'Administrators', icon: 'fas fa-users-cog' },
            { path: '/operations/recent-setups', label: 'Recent Setups', icon: 'fas fa-user-plus' },
            { path: '/job-network', label: 'Job Network', icon: 'fas fa-network-wired' },
            { path: '/talent-network', label: 'Talent Network', icon: 'fas fa-users' },
            { path: '/project-network', label: 'Project Network', icon: 'fas fa-project-diagram' },
            { path: '/operations/exclusive-network', label: 'Exclusive Networks', icon: 'fas fa-shield-alt' },
            { path: '/messages', label: 'Messages', icon: 'fas fa-comments', showUnreadCount: true },
          ]
        };
      case 'administrator':
        return {
          badge: { text: roleDisplay, icon: 'fas fa-crown', color: 'bg-purple-900/30 text-purple-300 border-purple-800/50' },
          links: [
            { path: '/admin-dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
            { path: '/team', label: 'My Team', icon: 'fas fa-users' },
            { path: '/job-network', label: 'Job Network', icon: 'fas fa-network-wired' }, { path: "/project-network", label: "Project Network", icon: "fas fa-project-diagram" },
            { path: '/work-orders', label: 'Work Orders', icon: 'fas fa-clipboard-list' },
            { path: '/calendar', label: 'Calendar', icon: 'fas fa-calendar-alt' },
            { path: '/reports', label: 'Reports', icon: 'fas fa-chart-bar' },
            { path: '/onboarding', label: 'Team Member Information', icon: 'fas fa-user-plus' },
            { path: '/messages', label: 'Messages', icon: 'fas fa-comments', showUnreadCount: true },
          ]
        };
      case 'project_manager':
        return {
          badge: { text: roleDisplay === 'project_manager' ? 'Project Manager' : roleDisplay, icon: 'fas fa-project-diagram', color: 'bg-cyan-900/30 text-cyan-300 border-cyan-800/50' },
          links: [
            { path: '/project-manager-dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
            { path: '/project-network', label: 'Project Network', icon: 'fas fa-project-diagram' },
            { path: '/job-network', label: 'Job Network', icon: 'fas fa-network-wired' },
            { path: '/talent-network', label: 'Talent Network', icon: 'fas fa-users' },
            { path: '/operations/exclusive-network', label: 'Exclusive Network', icon: 'fas fa-shield-alt' },
            { path: '/messages', label: 'Messages', icon: 'fas fa-comments', showUnreadCount: true },
          ]
        };
      case 'manager':
        return {
          badge: { text: roleDisplay, icon: 'fas fa-users', color: 'bg-blue-900/30 text-blue-300 border-blue-800/50' },
          links: [
            { path: '/manager-dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
            { path: '/team', label: 'My Team', icon: 'fas fa-users' },
            { path: '/job-network', label: 'Job Network', icon: 'fas fa-network-wired' }, { path: "/project-network", label: "Project Network", icon: "fas fa-project-diagram" },
            { path: '/work-orders', label: 'Work Orders', icon: 'fas fa-clipboard-list' },
            { path: '/calendar', label: 'Calendar', icon: 'fas fa-calendar-alt' },
            { path: '/reports', label: 'Reports', icon: 'fas fa-chart-bar' },
            { path: '/onboarding', label: 'Team Member Information', icon: 'fas fa-user-plus' },
            { path: '/messages', label: 'Messages', icon: 'fas fa-comments', showUnreadCount: true },
          ]
        };
      case 'dispatcher':
        return {
          badge: { text: roleDisplay, icon: 'fas fa-headset', color: 'bg-green-900/30 text-green-300 border-green-800/50' },
          links: [
            { path: '/dispatcher-dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
            { path: '/job-network', label: 'Job Network', icon: 'fas fa-network-wired' },
            { path: '/work-orders', label: 'Work Orders', icon: 'fas fa-clipboard-list' },
            { path: '/calendar', label: 'Calendar', icon: 'fas fa-calendar-alt' },
            { path: '/messages', label: 'Messages', icon: 'fas fa-comments', showUnreadCount: true },
          ]
        };
      case 'field_agent':
        return {
          badge: { text: roleDisplay, icon: 'fas fa-tools', color: 'bg-orange-900/30 text-orange-300 border-orange-800/50' },
          links: [
            { path: '/field-agent/my-work', label: 'My Work', icon: 'fas fa-clipboard-list' },
            { path: '/time-tracking', label: 'Time', icon: 'fas fa-clock' },
            { path: '/team', label: 'My Team', icon: 'fas fa-users' },
            { path: '/field-agent/settings', label: 'Settings', icon: 'fas fa-cog' },
          ]
        };
      case 'client_company_admin':
        return {
          badge: { text: 'Client Admin', icon: 'fas fa-user-tie', color: 'bg-teal-900/30 text-teal-300 border-teal-800/50' },
          links: [
            { path: '/client-dashboard', label: 'My Dashboard', icon: 'fas fa-tachometer-alt' },
            { path: '/job-network', label: 'Job Network', icon: 'fas fa-network-wired' },
            { path: '/talent-network', label: 'Talent Network', icon: 'fas fa-users' },
            { path: '/client/work-orders', label: 'My Work Orders', icon: 'fas fa-clipboard-list' },
            { path: '/messages', label: 'Messages', icon: 'fas fa-comments', showUnreadCount: true },
          ]
        };
      default:
        return {
          badge: { text: 'Field Agent', icon: 'fas fa-tools', color: 'bg-gray-900/30 text-gray-300 border-gray-800/50' },
          links: [
            { path: '/field-agent/my-work', label: 'My Work', icon: 'fas fa-clipboard-list' },
            { path: '/time-tracking', label: 'Time', icon: 'fas fa-clock' },
            { path: '/team', label: 'My Team', icon: 'fas fa-users' },
            { path: '/field-agent/settings', label: 'Settings', icon: 'fas fa-cog' },
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
          
          {/* Right side - Navigation Menu */}
          <div className="flex items-center space-x-4">
            {/* Permanent Role Switcher */}
            {currentActiveRole && onPermanentRoleSwitch && (
              <PermanentRoleSwitcher 
                currentActiveRole={currentActiveRole} 
                onRoleSwitch={onPermanentRoleSwitch} 
              />
            )}
            
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
                  {typeof window !== 'undefined' && window.location.pathname === '/operations-dashboard' 
                    ? 'Operations Director' 
                    : `${(user as any)?.firstName} ${(user as any)?.lastName}`}
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
                          {typeof window !== 'undefined' && window.location.pathname === '/operations-dashboard' 
                            ? 'Operations Director' 
                            : `${(user as any)?.firstName} ${(user as any)?.lastName}`}
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
      
      {/* Quick Action Menu */}
      <QuickActionMenu
        isOpen={isQuickMenuOpen}
        onClose={closeQuickMenu}
        position={quickMenuPosition}
      />
    </nav>
  );
}
