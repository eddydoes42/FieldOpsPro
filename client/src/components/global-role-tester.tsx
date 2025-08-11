import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, TestTube, Building2, Shield, Users, UserCheck, Eye } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isOperationsDirector } from "@shared/schema";

interface GlobalRoleTesterProps {
  currentTestingRole?: string;
  onRoleTest: (role: string) => void;
  onExitTest: () => void;
}

const testableRoles = [
  { 
    value: 'administrator', 
    label: 'Service Admin', 
    icon: Shield,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    description: 'Test admin functionality'
  },
  { 
    value: 'manager', 
    label: 'Manager', 
    icon: Users,
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    description: 'Test manager functionality'
  },
  { 
    value: 'dispatcher', 
    label: 'Dispatcher', 
    icon: Building2,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    description: 'Test dispatcher functionality'
  },
  { 
    value: 'field_agent', 
    label: 'Field Agent', 
    icon: UserCheck,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    description: 'Test field agent functionality'
  },
  { 
    value: 'client', 
    label: 'Client', 
    icon: Eye,
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    description: 'Test client functionality'
  }
];

export default function GlobalRoleTester({ currentTestingRole, onRoleTest, onExitTest }: GlobalRoleTesterProps) {
  const { user } = useAuth();

  // Only show for operations directors
  if (!isOperationsDirector(user as any)) {
    return null;
  }

  const currentRoleInfo = testableRoles.find(role => role.value === currentTestingRole);
  const CurrentIcon = currentRoleInfo?.icon || TestTube;

  return (
    <div className="fixed top-4 right-4 z-50">
      {currentTestingRole ? (
        <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2 shadow-lg">
          <div className="flex items-center gap-2">
            <TestTube className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Testing:
            </span>
            <Badge className={currentRoleInfo?.color || 'bg-gray-100 text-gray-800'}>
              <CurrentIcon className="h-3 w-3 mr-1" />
              {currentRoleInfo?.label || currentTestingRole}
            </Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onExitTest}
            className="text-xs h-6 px-2 border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-800"
          >
            Exit Test
          </Button>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 shadow-lg hover:shadow-xl transition-shadow"
            >
              <TestTube className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Role Tester</span>
              <span className="sm:hidden">Test</span>
              <ChevronDown className="h-3 w-3 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">
              Test Role Functions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {testableRoles.map((role) => {
              const RoleIcon = role.icon;
              
              return (
                <DropdownMenuItem
                  key={role.value}
                  onClick={() => onRoleTest(role.value)}
                  className="cursor-pointer p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-start space-x-3 w-full">
                    <div className={`rounded-lg p-2 ${role.color}`}>
                      <RoleIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {role.label}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {role.description}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}