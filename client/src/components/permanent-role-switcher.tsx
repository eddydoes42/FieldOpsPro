import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Building2, Shield, User, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { hasRole, isOperationsDirector } from "@shared/schema";

interface PermanentRoleSwitcherProps {
  currentActiveRole: string;
  onRoleSwitch: (role: string) => void;
}

const availableRoles = [
  { 
    value: 'operations_director', 
    label: 'Operations Director', 
    icon: Building2,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    description: 'Platform oversight and company management'
  },
  { 
    value: 'administrator', 
    label: 'Service Admin', 
    icon: Shield,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    description: 'Service company administration'
  }
];

export default function PermanentRoleSwitcher({ currentActiveRole, onRoleSwitch }: PermanentRoleSwitcherProps) {
  const { user } = useAuth();

  // Only show for users who have both operations director and administrator roles
  const hasOpsDirector = isOperationsDirector(user as any);
  const hasAdmin = hasRole(user as any, 'administrator');
  
  // Only show switcher if user has both roles
  if (!hasOpsDirector || !hasAdmin) {
    return null;
  }

  const currentRoleInfo = availableRoles.find(role => role.value === currentActiveRole);
  const CurrentIcon = currentRoleInfo?.icon || User;

  // Debug logging to understand what's happening
  console.log("PermanentRoleSwitcher Debug:", {
    currentActiveRole,
    currentRoleInfo,
    label: currentRoleInfo?.label,
    fallbackText: currentRoleInfo?.label || 'Switch Role',
    availableRoles: availableRoles.map(r => r.value)
  });

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-lg hover:shadow-xl transition-shadow"
          >
            <CurrentIcon className="h-4 w-4 mr-2" />
            <span className="text-sm">{currentRoleInfo?.label || 'Switch Role'}</span>
            <ChevronDown className="h-3 w-3 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">
            Switch Active Role
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableRoles.map((role) => {
            const RoleIcon = role.icon;
            const isCurrentRole = role.value === currentActiveRole;
            
            return (
              <DropdownMenuItem
                key={role.value}
                onClick={() => {
                  if (!isCurrentRole) {
                    onRoleSwitch(role.value);
                  }
                }}
                disabled={isCurrentRole}
                className="cursor-pointer p-3 focus:bg-gray-50 dark:focus:bg-gray-700"
              >
                <div className="flex items-start space-x-3 w-full">
                  <div className="mt-0.5">
                    <RoleIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {role.label}
                      </span>
                      <Badge 
                        className={`${role.color} text-xs px-2 py-0.5`}
                      >
                        {isCurrentRole ? 'Active' : 'Switch'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                      {role.description}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <div className="px-3 py-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your active role affects your dashboard and permissions
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}