import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import QuickActionMenu from "@/components/quick-action-menu";
import { useQuickActionMenu } from "@/hooks/useQuickActionMenu";
import { Zap, Menu } from "lucide-react";
import PermanentRoleSwitcher from "@/components/permanent-role-switcher";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isRoleAllowedForCompanyType } from "@shared/schema";

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

  // Role simulation functionality
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check role simulation status
  const { data: roleSimulationStatus } = useQuery({
    queryKey: ['/api/role-simulation/status'],
    refetchInterval: 5000 // Check every 5 seconds
  });

  // Type-safe access to role simulation status
  const isCurrentlyTesting = roleSimulationStatus && typeof roleSimulationStatus === 'object' && 'isSimulatingRole' in roleSimulationStatus ? 
    (roleSimulationStatus as any).isSimulatingRole : false;
  const testingContext = roleSimulationStatus && typeof roleSimulationStatus === 'object' && 'context' in roleSimulationStatus ? 
    (roleSimulationStatus as any).context : null;

  const startRoleSimulationMutation = useMutation({
    mutationFn: ({ role, companyType }: { role: string; companyType: 'service' | 'client' }) => {
      // Enhanced validation using the new role-company mapping
      if (!isRoleAllowedForCompanyType(companyType, role)) {
        throw new Error(`Invalid role "${role}" for company type "${companyType}". Please select a valid combination.`);
      }
      
      return apiRequest('/api/role-simulation/start', 'POST', { role, companyType }).then(res => res.json());
    },
    onSuccess: (data, variables) => {
      // Set the role testing info in local storage
      localStorage.setItem('testingRole', variables.role);
      localStorage.setItem('testingCompanyType', variables.companyType);
      
      // Redirect to the appropriate dashboard for the selected role using redirectUrl
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        // Fallback to role-based routing if no redirectUrl provided
        const dashboardRoute = variables.role === 'client_company_admin' ? '/dashboard' : `/${variables.role}-dashboard`;
        window.location.href = dashboardRoute;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error Starting Role Testing",
        description: error.message || "Failed to start role testing.",
        variant: "destructive",
      });
    },
  });

  const stopRoleSimulationMutation = useMutation({
    mutationFn: () => apiRequest('/api/role-simulation/stop', 'POST').then(res => res.json()),
    onSuccess: () => {
      // Clear testing info
      localStorage.removeItem('testingRole');
      localStorage.removeItem('testingCompanyType');
      
      // Invalidate auth query to return to original user
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: "Role Simulation Stopped",
        description: "Returned to Operations Director mode",
      });

      // Redirect to operations dashboard
      window.location.href = '/operations-dashboard';
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stop role simulation",
        variant: "destructive",
      });
    }
  });

  // Handler for Service Company role selection
  const handleServiceCompanyRoleChange = (role: string) => {
    if (role) {
      startRoleSimulationMutation.mutate({ role, companyType: 'service' });
    }
  };

  // Handler for Client Company role selection
  const handleClientCompanyRoleChange = (role: string) => {
    if (role) {
      startRoleSimulationMutation.mutate({ role, companyType: 'client' });
    }
  };

  // Handler for stopping role simulation
  const handleStopTesting = () => {
    stopRoleSimulationMutation.mutate();
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
    // Check if we're on any operations page - if so, always show Operations Director navigation
    const isOnOperationsPage = typeof window !== 'undefined' ? window.location.pathname.startsWith('/operations') : false;
    const storedTestingRole = typeof window !== 'undefined' ? localStorage.getItem('testingRole') : null;
    
    
    if (isOnOperationsPage) {
      // Always show Operations Director navigation on operations pages
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
          { path: '/approved-payments', label: 'Approved Payments', icon: 'fas fa-dollar-sign' },
          { path: '/messages', label: 'Messages', icon: 'fas fa-comments', showUnreadCount: true },
        ]
      };
    }
    
    // Check for testing role from localStorage or prop, but ONLY if role testing is actually active
    const activeTestingRole = (testingRole || storedTestingRole) && isCurrentlyTesting ? (testingRole || storedTestingRole) : null;
    
    // Use testing role if active AND confirmed by server, otherwise use actual user roles
    if (activeTestingRole && isCurrentlyTesting) {
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
          { path: '/approved-payments', label: 'Approved Payments', icon: 'fas fa-dollar-sign' },
          { path: '/messages', label: 'Messages', icon: 'fas fa-comments', showUnreadCount: true },
        ]
      };
    }
    
    const priorityRole = isOperationsDirector ? 'operations_director' :
                        roles.includes('administrator') ? 'administrator' :
                        roles.includes('project_manager') ? 'project_manager' :
                        roles.includes('manager') ? 'manager' :
                        roles.includes('dispatcher') ? 'dispatcher' :
                        roles.includes('field_engineer') ? 'field_engineer' : 'field_agent';

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
            { path: '/approved-payments', label: 'Approved Payments', icon: 'fas fa-dollar-sign' },
            { path: '/messages', label: 'Messages', icon: 'fas fa-comments', showUnreadCount: true },
          ]
        };
      case 'administrator': {
        // Determine company type context from current user
        const currentUser = user as any;
        const userCompany = currentUser?.company || {};
        const isClientCompanyAdmin = userCompany.type === 'client';
        
        // Different navigation for Service vs Client company administrators
        if (isClientCompanyAdmin) {
          return {
            badge: { text: 'Client Admin', icon: 'fas fa-user-tie', color: 'bg-teal-900/30 text-teal-300 border-teal-800/50' },
            links: [
              { path: '/client-dashboard', label: 'My Dashboard', icon: 'fas fa-tachometer-alt' },
              { path: '/job-network', label: 'Job Network', icon: 'fas fa-network-wired' },
              { path: '/talent-network', label: 'Talent Network', icon: 'fas fa-users' },
              { path: '/client/work-orders', label: 'My Work Orders', icon: 'fas fa-clipboard-list' },
              { path: '/approved-payments', label: 'Approved Payments', icon: 'fas fa-dollar-sign' },
              { path: '/messages', label: 'Messages', icon: 'fas fa-comments', showUnreadCount: true },
            ]
          };
        }
        
        // Service Company Administrator (full access)
        return {
          badge: { text: roleDisplay, icon: 'fas fa-crown', color: 'bg-purple-900/30 text-purple-300 border-purple-800/50' },
          links: [
            { path: '/admin-dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
            { path: '/team', label: 'My Team', icon: 'fas fa-users' },
            { path: '/job-network', label: 'Job Network', icon: 'fas fa-network-wired' },
            { path: '/project-network', label: 'Project Network', icon: 'fas fa-project-diagram' },
            { path: '/work-orders', label: 'Work Orders', icon: 'fas fa-clipboard-list' },
            { path: '/job-requests', label: 'Job Requests', icon: 'fas fa-hand-paper' },
            { path: '/calendar', label: 'Calendar', icon: 'fas fa-calendar-alt' },
            { path: '/reports', label: 'Reports', icon: 'fas fa-chart-bar' },
            { path: '/onboarding', label: 'Team Member Information', icon: 'fas fa-user-plus' },
            { path: '/approved-payments', label: 'Approved Payments', icon: 'fas fa-dollar-sign' },
            { path: '/messages', label: 'Messages', icon: 'fas fa-comments', showUnreadCount: true },
          ]
        };
      }
      case 'project_manager':
        return {
          badge: { text: roleDisplay === 'project_manager' ? 'Project Manager' : roleDisplay, icon: 'fas fa-project-diagram', color: 'bg-cyan-900/30 text-cyan-300 border-cyan-800/50' },
          links: [
            { path: '/project-manager-dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
            { path: '/project-network', label: 'Project Network', icon: 'fas fa-project-diagram' },
            { path: '/job-network', label: 'Job Network', icon: 'fas fa-network-wired' },
            { path: '/talent-network', label: 'Talent Network', icon: 'fas fa-users' },
            { path: '/operations/exclusive-network', label: 'Exclusive Network', icon: 'fas fa-shield-alt' },
            { path: '/approved-payments', label: 'Approved Payments', icon: 'fas fa-dollar-sign' },
            { path: '/messages', label: 'Messages', icon: 'fas fa-comments', showUnreadCount: true },
          ]
        };
      case 'manager':
        return {
          badge: { text: roleDisplay, icon: 'fas fa-users', color: 'bg-blue-900/30 text-blue-300 border-blue-800/50' },
          links: [
            { path: '/manager-dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
            { path: '/team', label: 'My Team', icon: 'fas fa-users' },
            { path: '/job-network', label: 'Job Network', icon: 'fas fa-network-wired' },
            { path: '/project-network', label: 'Project Network', icon: 'fas fa-project-diagram' },
            { path: '/work-orders', label: 'Work Orders', icon: 'fas fa-clipboard-list' },
            { path: '/job-requests', label: 'Job Requests', icon: 'fas fa-hand-paper' },
            { path: '/calendar', label: 'Calendar', icon: 'fas fa-calendar-alt' },
            { path: '/reports', label: 'Reports', icon: 'fas fa-chart-bar' },
            { path: '/onboarding', label: 'Team Member Information', icon: 'fas fa-user-plus' },
            { path: '/approved-payments', label: 'Approved Payments', icon: 'fas fa-dollar-sign' },
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
            { path: '/job-requests', label: 'Job Requests', icon: 'fas fa-hand-paper' },
            { path: '/calendar', label: 'Calendar', icon: 'fas fa-calendar-alt' },
            { path: '/approved-payments', label: 'Approved Payments', icon: 'fas fa-dollar-sign' },
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
            { path: '/approved-payments', label: 'Approved Payments', icon: 'fas fa-dollar-sign' },
            { path: '/field-agent/settings', label: 'Settings', icon: 'fas fa-cog' },
          ]
        };
      case 'field_engineer':
        return {
          badge: { text: roleDisplay === 'field_engineer' ? 'Field Engineer' : roleDisplay, icon: 'fas fa-user-hard-hat', color: 'bg-blue-900/30 text-blue-300 border-blue-800/50' },
          links: [
            { path: '/field-engineer-dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
            { path: '/mywork', label: 'My Work', icon: 'fas fa-clipboard-list' },
            { path: '/team', label: 'My Team', icon: 'fas fa-users' },
            { path: '/calendar', label: 'Calendar', icon: 'fas fa-calendar-alt' },
            { path: '/approved-payments', label: 'Approved Payments', icon: 'fas fa-dollar-sign' },
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
            { path: '/approved-payments', label: 'Approved Payments', icon: 'fas fa-dollar-sign' },
            { path: '/field-agent/settings', label: 'Settings', icon: 'fas fa-cog' },
          ]
        };
    }
  };

  const config = getRoleConfig();

  // Check if user is Operations Director for Role Testers
  const isOperationsDirectorUser = (user as any)?.roles?.includes('operations_director');

  return (
    <>
      {/* Omnipresent Role Testers for Operations Directors */}
      {isOperationsDirectorUser && (
        <div className="bg-gradient-to-r from-purple-600 to-teal-600 text-white px-4 py-2 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Service Company Role Tester */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Service Company:</span>
                <select
                  value={testingContext?.companyType === 'service' ? testingContext?.role || '' : ''}
                  onChange={(e) => handleServiceCompanyRoleChange(e.target.value)}
                  disabled={startRoleSimulationMutation.isPending}
                  className="bg-purple-700 text-white border border-purple-500 rounded px-2 py-1 text-sm disabled:opacity-50"
                  data-testid="select-service-company-role"
                >
                  <option value="">Select Role</option>
                  <option value="administrator">Administrator</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="manager">Manager</option>
                  <option value="dispatcher">Dispatcher</option>
                  <option value="field_engineer">Field Engineer</option>
                  <option value="field_agent">Field Agent</option>
                </select>
              </div>
              
              {/* Client Company Role Tester */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Client Company:</span>
                <select
                  value={testingContext?.companyType === 'client' ? testingContext?.role || '' : ''}
                  onChange={(e) => handleClientCompanyRoleChange(e.target.value)}
                  disabled={startRoleSimulationMutation.isPending}
                  className="bg-teal-700 text-white border border-teal-500 rounded px-2 py-1 text-sm disabled:opacity-50"
                  data-testid="select-client-company-role"
                >
                  <option value="">Select Role</option>
                  <option value="administrator">Administrator</option>
                  <option value="project_manager">Project Manager</option>
                  <option value="manager">Manager</option>
                  <option value="dispatcher">Dispatcher</option>
                </select>
              </div>
            </div>
            
            {/* Stop Testing Button */}
            {isCurrentlyTesting && (
              <button
                onClick={handleStopTesting}
                disabled={stopRoleSimulationMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
                data-testid="button-stop-testing"
              >
                {stopRoleSimulationMutation.isPending ? 'Stopping...' : 'Stop Testing'}
              </button>
            )}
          </div>
        </div>
      )}
    
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
                data-testid="button-navigation-menu"
              >
                {/* User Avatar */}
                {(user as any)?.profileImageUrl ? (
                  <img 
                    className="h-8 w-8 rounded-full object-cover" 
                    src={(user as any).profileImageUrl} 
                    alt="Profile"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <i className="fas fa-user text-primary text-sm"></i>
                  </div>
                )}
                
                {/* User Name and Role - Hidden on small screens */}
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground truncate max-w-32">
                    {isCurrentlyTesting && testingContext?.simulatedUser
                      ? `${testingContext.simulatedUser.firstName} ${testingContext.simulatedUser.lastName}`
                      : (user as any)?.firstName && (user as any)?.lastName 
                        ? `${(user as any).firstName} ${(user as any).lastName}`
                        : (user as any)?.email?.split('@')[0] || 'User'
                    }
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-32">
                    {config.badge.text}
                  </span>
                </div>
                
                <Menu className="h-4 w-4 text-muted-foreground" />
              </button>
              
              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50">
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center space-x-3">
                      {(user as any)?.profileImageUrl ? (
                        <img 
                          className="h-10 w-10 rounded-full object-cover" 
                          src={(user as any).profileImageUrl} 
                          alt="Profile"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <i className="fas fa-user text-primary"></i>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {isCurrentlyTesting && testingContext?.simulatedUser
                            ? `${testingContext.simulatedUser.firstName} ${testingContext.simulatedUser.lastName}`
                            : (user as any)?.firstName && (user as any)?.lastName 
                              ? `${(user as any).firstName} ${(user as any).lastName}`
                              : (user as any)?.email || 'User'
                          }
                        </p>
                        {/* Role Badge */}
                        <span className={`${config.badge.color} text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap inline-flex mt-1`}>
                          <i className={`${config.badge.icon} mr-1`}></i>
                          {config.badge.text}
                        </span>
                        {/* Show testing indicator if in role test mode */}
                        {(localStorage.getItem('testingRole') || localStorage.getItem('testingCompanyType')) && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center">
                            <i className="fas fa-vial mr-1"></i>
                            Role Testing Active
                          </div>
                        )}
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
    </>
  );
}
