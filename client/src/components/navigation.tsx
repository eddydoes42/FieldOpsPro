import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";

interface NavigationProps {
  userRole: string;
}

export default function Navigation({ userRole }: NavigationProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getRoleConfig = () => {
    switch (userRole) {
      case 'administrator':
        return {
          badge: { text: 'Administrator', icon: 'fas fa-crown', color: 'bg-purple-100 text-purple-800' },
          links: [
            { path: '/', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
            { path: '/users', label: 'Users', icon: 'fas fa-users' },
            { path: '/work-orders', label: 'Work Orders', icon: 'fas fa-clipboard-list' },
            { path: '/reports', label: 'Reports', icon: 'fas fa-chart-bar' },
            { path: '/settings', label: 'Settings', icon: 'fas fa-cog' },
          ]
        };
      case 'manager':
        return {
          badge: { text: 'Manager', icon: 'fas fa-users-cog', color: 'bg-blue-100 text-blue-800' },
          links: [
            { path: '/', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
            { path: '/onboarding', label: 'Onboarding', icon: 'fas fa-user-plus' },
            { path: '/work-orders', label: 'Work Orders', icon: 'fas fa-clipboard-list' },
            { path: '/team', label: 'My Team', icon: 'fas fa-users' },
            { path: '/messages', label: 'Messages', icon: 'fas fa-comments' },
          ]
        };
      default:
        return {
          badge: { text: 'Field Agent', icon: 'fas fa-wrench', color: 'bg-green-100 text-green-800' },
          links: [
            { path: '/', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
            { path: '/work-orders', label: 'My Orders', icon: 'fas fa-clipboard-list' },
            { path: '/time-tracking', label: 'Time Tracking', icon: 'fas fa-clock' },
            { path: '/messages', label: 'Messages', icon: 'fas fa-comments' },
          ]
        };
    }
  };

  const config = getRoleConfig();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-tools text-white text-sm"></i>
              </div>
              <span className="text-xl font-bold text-gray-900">FieldOps Pro</span>
            </div>
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              {config.links.map((link) => (
                <Link key={link.path} href={link.path}>
                  <a className={`${
                    location === link.path 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                    <i className={`${link.icon} mr-2`}></i>
                    {link.label}
                  </a>
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Role Badge */}
            <span className={`${config.badge.color} text-xs font-medium px-3 py-1 rounded-full`}>
              <i className={`${config.badge.icon} mr-1`}></i>
              {config.badge.text}
            </span>
            
            {/* Notifications */}
            <button className="p-2 rounded-full text-gray-400 hover:text-gray-500 relative">
              <i className="fas fa-bell text-lg"></i>
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400"></span>
            </button>
            
            {/* User Menu */}
            <div className="flex items-center">
              {user?.profileImageUrl && (
                <img 
                  className="h-8 w-8 rounded-full object-cover" 
                  src={user.profileImageUrl} 
                  alt="Profile"
                />
              )}
              <span className="ml-2 text-gray-700 font-medium">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700"
            >
              <i className="fas fa-sign-out-alt"></i>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
