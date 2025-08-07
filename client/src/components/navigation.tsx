import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useState } from "react";

interface NavigationProps {
  userRole: string;
}

export default function Navigation({ userRole }: NavigationProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getRoleConfig = () => {
    switch (userRole) {
      case 'administrator':
        return {
          badge: { text: 'Administrator', icon: 'fas fa-crown', color: 'bg-purple-900/30 text-purple-300 border-purple-800/50' },
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
          badge: { text: 'Manager', icon: 'fas fa-users-cog', color: 'bg-blue-900/30 text-blue-300 border-blue-800/50' },
          links: [
            { path: '/', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
            { path: '/onboarding', label: 'Onboarding', icon: 'fas fa-user-plus' },
            { path: '/work-orders', label: 'Work Orders', icon: 'fas fa-clipboard-list' },
            { path: '/reports/team', label: 'Team Reports', icon: 'fas fa-chart-bar' },
            { path: '/team', label: 'My Team', icon: 'fas fa-users' },
            { path: '/messages', label: 'Messages', icon: 'fas fa-comments' },
          ]
        };
      default:
        return {
          badge: { text: 'Field Agent', icon: 'fas fa-wrench', color: 'bg-green-900/30 text-green-300 border-green-800/50' },
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
    <nav className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center min-w-0">
            <div className="flex-shrink-0 flex items-center mr-8">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center mr-3">
                <i className="fas fa-tools text-white text-sm"></i>
              </div>
              <span className="text-xl font-bold text-foreground whitespace-nowrap">FieldOps Pro</span>
            </div>
            <div className="hidden lg:flex lg:space-x-6">
              {config.links.map((link) => (
                <Link key={link.path} href={link.path}>
                  <span className={`${
                    location === link.path 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  } inline-flex items-center px-2 py-1 border-b-2 text-sm font-medium cursor-pointer whitespace-nowrap`}>
                    <i className={`${link.icon} mr-2`}></i>
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
            
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
            </button>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Role Badge */}
            <span className={`${config.badge.color} text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap hidden sm:inline-flex`}>
              <i className={`${config.badge.icon} mr-1`}></i>
              {config.badge.text}
            </span>
            
            {/* User Menu */}
            <div className="flex items-center space-x-2">
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
            </div>
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <i className="fas fa-sign-out-alt"></i>
            </Button>
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-card">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {config.links.map((link) => (
                <Link key={link.path} href={link.path}>
                  <span 
                    className={`${
                      location === link.path 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    } block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className={`${link.icon} mr-3`}></i>
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
