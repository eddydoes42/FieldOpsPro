import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Building2, Users } from "lucide-react";
import { useLocation } from "wouter";
import { hasRole, isOperationsDirector } from "../../../shared/schema";

interface RoleSwitcherProps {
  user: any;
}

export default function RoleSwitcher({ user }: RoleSwitcherProps) {
  const [, setLocation] = useLocation();
  
  const hasOpsDirector = isOperationsDirector(user);
  const hasAdmin = hasRole(user, 'administrator');
  const selectedRole = localStorage.getItem('selectedRole');
  
  // Don't show if user doesn't have multiple roles
  if (!hasOpsDirector || !hasAdmin) return null;

  const getCurrentRoleDisplay = () => {
    if (selectedRole === 'operations_director' || (!selectedRole && hasOpsDirector)) {
      return {
        icon: <Building2 className="h-4 w-4" />,
        label: "Operations Director"
      };
    }
    return {
      icon: <Users className="h-4 w-4" />,
      label: "Company Admin"
    };
  };

  const switchToOperationsDirector = () => {
    localStorage.setItem('selectedRole', 'operations_director');
    setLocation('/dashboard');
  };

  const switchToCompanyAdmin = () => {
    localStorage.setItem('selectedRole', 'administrator');
    setLocation('/dashboard');
  };

  const currentRole = getCurrentRoleDisplay();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center space-x-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
        >
          {currentRole.icon}
          <span className="hidden sm:inline">{currentRole.label}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem 
          onClick={switchToOperationsDirector}
          className="flex items-center space-x-2 cursor-pointer"
        >
          <Building2 className="h-4 w-4" />
          <div>
            <div className="font-medium">Operations Director</div>
            <div className="text-xs text-gray-500">Multi-company oversight</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={switchToCompanyAdmin}
          className="flex items-center space-x-2 cursor-pointer"
        >
          <Users className="h-4 w-4" />
          <div>
            <div className="font-medium">Company Admin</div>
            <div className="text-xs text-gray-500">Service company operations</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}