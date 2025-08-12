import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Settings, Eye, ChevronDown, User } from "lucide-react";
import { isOperationsDirector } from "@shared/schema";

interface RoleSwitcherProps {
  currentRole: string;
  onRoleSwitch: (role: string) => void;
  currentActiveRole?: string;
}

const availableRoles = [
  { value: 'administrator', label: 'Administrator', shortLabel: 'Admin', color: 'bg-blue-100 text-blue-800' },
  { value: 'manager', label: 'Manager', shortLabel: 'Manager', color: 'bg-green-100 text-green-800' },
  { value: 'dispatcher', label: 'Dispatcher', shortLabel: 'Dispatcher', color: 'bg-orange-100 text-orange-800' },
  { value: 'field_agent', label: 'Field Agent', shortLabel: 'Field Agent', color: 'bg-gray-100 text-gray-800' }
];

export default function RoleSwitcher({ currentRole, onRoleSwitch, currentActiveRole }: RoleSwitcherProps) {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState(currentRole);

  // Only show for operations directors when they are testing a role on OTHER pages (not operations dashboard)
  const isTestingRole = localStorage.getItem('testingRole');
  const isOnOperationsDashboard = window.location.pathname === '/operations-dashboard';
  
  // Don't show if not operations director
  if (!isOperationsDirector(user as any)) {
    return null;
  }
  
  // NEVER show on operations dashboard (we have a dedicated role tester there)
  if (isOnOperationsDashboard) {
    return null;
  }
  
  // On other pages, only show if testing a role
  if (!isTestingRole) {
    return null;
  }

  const handleRoleSwitch = () => {
    onRoleSwitch(selectedRole);
  };

  const currentRoleInfo = availableRoles.find(role => role.value === currentRole);

  const handleStopTesting = () => {
    // Clear testing role and navigate back to operations director dashboard
    localStorage.removeItem('testingRole');
    window.location.href = '/operations-dashboard';
  };

  const handleStartTesting = () => {
    onRoleSwitch(selectedRole);
  };

  // This component only shows when testing roles on other dashboards (never on operations dashboard)

  return (
    <div className="mb-4 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3">
      <div className="flex items-center">
        <span className="text-sm text-purple-700 font-medium mr-3">Role Tester</span>
        <Button 
          onClick={handleStopTesting}
          variant="outline" 
          size="sm" 
          className="border-red-300 text-red-700 hover:bg-red-50"
        >
          Stop Testing
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                  <User className="h-3 w-3 mr-2" />
                  {(currentRoleInfo as any)?.shortLabel || 'Switch Role'}
                  <ChevronDown className="h-3 w-3 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-purple-900">
                  Available Roles
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableRoles.map((role) => (
                  <DropdownMenuItem
                    key={role.value}
                    onClick={() => {
                      if (role.value !== currentRole) {
                        onRoleSwitch(role.value);
                      }
                    }}
                    disabled={role.value === currentRole}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">{role.label}</span>
                      <Badge className={`${role.color} border text-xs px-2 py-0.5 ml-2`}>
                        {role.value === currentRole ? 'Current' : 'Switch'}
                      </Badge>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
      </div>
    </div>
  );
}