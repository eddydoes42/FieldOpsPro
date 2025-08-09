import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Plus, 
  AlertTriangle, 
  Star, 
  X,
  Users,
  ClipboardList,
  Zap,
  Calendar as CalendarIcon,
  Building2
} from "lucide-react";

interface QuickActionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

export default function QuickActionMenu({ isOpen, onClose, position }: QuickActionMenuProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  const userRoles = (user as any)?.roles || [];
  const isAdmin = userRoles.includes('administrator');
  const isManager = userRoles.includes('manager');
  const isDispatcher = userRoles.includes('dispatcher');
  const hasOperationsDirectorRole = userRoles.includes('operations_director');
  
  // Check if user is truly an operations director (has operations_director role AND no companyId)
  const isOperationsDirector = hasOperationsDirectorRole && !(user as any)?.companyId;
  
  // Check if user is a company administrator (has admin role but has a companyId, or admin role without operations director role)
  const isCompanyAdmin = isAdmin && ((user as any)?.companyId || !hasOperationsDirectorRole);
  
  const canManageUsers = isAdmin || isManager;
  const canCreateWorkOrders = isAdmin || isManager || isDispatcher;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAction = (action: string) => {
    onClose();
    
    switch (action) {
      case 'add-team-member':
        setLocation('/onboarding');
        break;
      case 'create-work-order':
        setLocation('/work-orders?action=create');
        break;
      case 'view-active-issues':
        setLocation('/work-orders?filter=active-issues');
        break;
      case 'view-priority-tasks':
        setLocation('/work-orders?filter=high-priority');
        break;
      case 'view-team':
        setLocation('/team');
        break;
      case 'view-work-orders':
        setLocation('/work-orders');
        break;
      case 'view-calendar':
        setLocation('/calendar');
        break;
      case 'add-company':
        window.dispatchEvent(new CustomEvent('openCompanyForm'));
        break;
      case 'onboard-admin':
        window.dispatchEvent(new CustomEvent('openAdminForm'));
        break;
      case 'view-companies':
        setLocation('/operations/companies');
        break;
      case 'view-admins':
        setLocation('/operations/active-admins');
        break;
      case 'view-recent-setups':
        setLocation('/operations/recent-setups');
        break;
    }
  };

  const menuStyle = {
    position: 'fixed' as const,
    top: Math.min(position.y, window.innerHeight - 400),
    left: Math.min(position.x, window.innerWidth - 280),
    zIndex: 9999,
  };

  return (
    <div style={menuStyle} ref={menuRef}>
      <Card className="w-72 shadow-xl border-2 border-primary/20 bg-background/95 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">Quick Actions</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="p-2 space-y-1">
            {/* Primary Actions */}
            <div className="space-y-1">
              {/* Operations Director Actions */}
              {isOperationsDirector && (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-9 text-sm"
                    onClick={() => handleAction('add-company')}
                  >
                    <Building2 className="h-4 w-4 text-blue-500" />
                    <span>Add New Company</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      OpsDir
                    </Badge>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-9 text-sm"
                    onClick={() => handleAction('onboard-admin')}
                  >
                    <UserPlus className="h-4 w-4 text-green-500" />
                    <span>Onboard Administrator</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      OpsDir
                    </Badge>
                  </Button>
                </>
              )}
              
              {/* Company Admin User Management */}
              {isCompanyAdmin && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-9 text-sm"
                  onClick={() => handleAction('add-team-member')}
                >
                  <UserPlus className="h-4 w-4 text-blue-500" />
                  <span>Add Team Member</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Admin
                  </Badge>
                </Button>
              )}
              
              {/* Manager User Management */}
              {isManager && !isOperationsDirector && !isCompanyAdmin && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-9 text-sm"
                  onClick={() => handleAction('add-team-member')}
                >
                  <UserPlus className="h-4 w-4 text-blue-500" />
                  <span>Add Team Member</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Manager
                  </Badge>
                </Button>
              )}
              
              {/* Work Order Creation for Company Admins, Managers, Dispatchers */}
              {(isCompanyAdmin || (isManager && !isOperationsDirector) || (isDispatcher && !isOperationsDirector)) && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-9 text-sm"
                  onClick={() => handleAction('create-work-order')}
                >
                  <Plus className="h-4 w-4 text-green-500" />
                  <span>Create Work Order</span>
                </Button>
              )}
            </div>

            {/* View Actions */}
            <div className="border-t border-border pt-2 space-y-1">
              <div className="px-2 py-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Quick Views
                </span>
              </div>
              
              {/* Operations Director Views */}
              {isOperationsDirector && (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-9 text-sm"
                    onClick={() => handleAction('view-companies')}
                  >
                    <Building2 className="h-4 w-4 text-blue-500" />
                    <span>All Companies</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-9 text-sm"
                    onClick={() => handleAction('view-admins')}
                  >
                    <Users className="h-4 w-4 text-purple-500" />
                    <span>Active Administrators</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-9 text-sm"
                    onClick={() => handleAction('view-recent-setups')}
                  >
                    <UserPlus className="h-4 w-4 text-orange-500" />
                    <span>Recent Setups</span>
                  </Button>
                </>
              )}
              
              {/* Company Admin and Manager Views */}
              {(isCompanyAdmin || (isManager && !isOperationsDirector)) && (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-9 text-sm"
                    onClick={() => handleAction('view-priority-tasks')}
                  >
                    <Star className="h-4 w-4 text-amber-500" />
                    <span>Priority Tasks</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      High
                    </Badge>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-9 text-sm"
                    onClick={() => handleAction('view-active-issues')}
                  >
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span>Active Issues</span>
                    <Badge variant="destructive" className="ml-auto text-xs">
                      Issues
                    </Badge>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-9 text-sm"
                    onClick={() => handleAction('view-team')}
                  >
                    <Users className="h-4 w-4 text-purple-500" />
                    <span>Team Overview</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-9 text-sm"
                    onClick={() => handleAction('view-work-orders')}
                  >
                    <ClipboardList className="h-4 w-4 text-blue-500" />
                    <span>All Work Orders</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-9 text-sm"
                    onClick={() => handleAction('view-calendar')}
                  >
                    <CalendarIcon className="h-4 w-4 text-indigo-500" />
                    <span>Calendar View</span>
                  </Button>
                </>
              )}
              
              {/* Field Agent Views */}
              {!isCompanyAdmin && !isManager && !isOperationsDirector && (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-9 text-sm"
                    onClick={() => handleAction('view-work-orders')}
                  >
                    <ClipboardList className="h-4 w-4 text-blue-500" />
                    <span>My Work Orders</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-9 text-sm"
                    onClick={() => handleAction('view-calendar')}
                  >
                    <CalendarIcon className="h-4 w-4 text-indigo-500" />
                    <span>Calendar View</span>
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <div className="px-4 py-2 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground">
              Right-click anywhere to open this menu
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}