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
}

const availableRoles = [
  { value: 'operations_director', label: 'Operations Director', color: 'bg-purple-100 text-purple-800' },
  { value: 'administrator', label: 'Administrator', color: 'bg-blue-100 text-blue-800' },
  { value: 'manager', label: 'Manager', color: 'bg-green-100 text-green-800' },
  { value: 'dispatcher', label: 'Dispatcher', color: 'bg-orange-100 text-orange-800' },
  { value: 'field_agent', label: 'Field Agent', color: 'bg-gray-100 text-gray-800' },
  { value: 'client', label: 'Client', color: 'bg-pink-100 text-pink-800' }
];

export default function RoleSwitcher({ currentRole, onRoleSwitch }: RoleSwitcherProps) {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState(currentRole);

  // Only show for operations directors
  if (!isOperationsDirector(user as any)) {
    return null;
  }

  const handleRoleSwitch = () => {
    onRoleSwitch(selectedRole);
  };

  const currentRoleInfo = availableRoles.find(role => role.value === currentRole);

  return (
    <div className="mb-4 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <Settings className="h-4 w-4 text-purple-600" />
            <Badge className={`${currentRoleInfo?.color} border text-xs px-2 py-1`}>
              <Eye className="h-3 w-3 mr-1" />
              {currentRoleInfo?.label}
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                  <User className="h-3 w-3 mr-2" />
                  Switch Role
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