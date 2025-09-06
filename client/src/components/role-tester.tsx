import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Eye, ChevronDown, User, Building2, Users, AlertCircle } from "lucide-react";
import { isOperationsDirector, isRoleAllowedForCompanyType, allowedRolesByCompanyType, shouldShowRoleSimulatorUI } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface RoleTesterProps {
  currentRole: string;
  onRoleSwitch: (role: string) => void;
}

// Role descriptions for better UX
const roleDescriptions: Record<string, { label: string; description: string }> = {
  'administrator': { label: 'Administrator', description: 'Full company management access' },
  'project_manager': { label: 'Project Manager', description: 'Project oversight and coordination' },
  'manager': { label: 'Manager', description: 'Team and operations management' },
  'dispatcher': { label: 'Dispatcher', description: 'Work order coordination and assignment' },
  'field_engineer': { label: 'Field Engineer', description: 'Advanced technical field work' },
  'field_agent': { label: 'Field Agent', description: 'Basic field service tasks' },
  'client_company_admin': { label: 'Client Admin', description: 'Client company administration' }
};

// Generate role lists dynamically from the mapping
const serviceCompanyRoles = allowedRolesByCompanyType.service.map(role => ({
  value: role,
  label: roleDescriptions[role]?.label || role,
  description: roleDescriptions[role]?.description || `Role: ${role}`
}));

const clientCompanyRoles = allowedRolesByCompanyType.client.map(role => ({
  value: role,
  label: roleDescriptions[role]?.label || role,
  description: roleDescriptions[role]?.description || `Role: ${role}`
}));

export default function RoleTester({ currentRole, onRoleSwitch }: RoleTesterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCompanyType, setSelectedCompanyType] = useState<'service' | 'client'>('service');
  const [selectedRole, setSelectedRole] = useState<string>('');

  // Only check role simulation status for Operations Directors
  const { data: roleSimulationStatus } = useQuery({
    queryKey: ['/api/role-simulation/status'],
    refetchInterval: 5000, // Check every 5 seconds
    enabled: isOperationsDirector(user as any) // Only run this query for Operations Directors
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
    }
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

      // Call the role switch handler to return to OD
      onRoleSwitch('operations_director');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stop role simulation",
        variant: "destructive",
      });
    }
  });

  // Only show for operations directors
  if (!isOperationsDirector(user as any)) {
    return null;
  }

  const handleStartTesting = () => {
    if (!selectedRole || !selectedCompanyType) {
      toast({
        title: "Selection Required",
        description: "Please select both a company type and role to test",
        variant: "destructive",
      });
      return;
    }
    
    startRoleSimulationMutation.mutate(
      {
        role: selectedRole,
        companyType: selectedCompanyType,
      },
      {
        onSuccess: (data) => {
          // Set the role testing info in local storage
          localStorage.setItem('testingRole', selectedRole);
          localStorage.setItem('testingCompanyType', selectedCompanyType);
          
          // Redirect to the appropriate dashboard for the selected role using redirectUrl
          if (data.redirectUrl) {
            window.location.href = data.redirectUrl;
          } else {
            // Fallback to role-based routing if no redirectUrl provided
            const dashboardRoute = selectedRole === 'client_company_admin' ? '/dashboard' : `/${selectedRole}-dashboard`;
            window.location.href = dashboardRoute;
          }
        },
        onError: (error) => {
          toast({
            title: "Error Starting Role Testing",
            description: error.message || "Failed to start role testing.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleStopTesting = () => {
    stopRoleSimulationMutation.mutate();
  };

  // Remove duplicate definition - already defined above
  const currentlySelectedRoles = selectedCompanyType === 'service' ? serviceCompanyRoles : clientCompanyRoles;

  return (
    <Card className="mb-6 mx-auto max-w-4xl mobile-container">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          Role Simulator
          {isCurrentlyTesting && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
              Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isCurrentlyTesting ? (
          <Alert className="mb-3">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              Simulating <strong>{testingContext?.role}</strong> in{' '}
              <strong>{testingContext?.companyType}</strong> company.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-3">
            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              Simulate different user roles to verify permissions and functionality.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {isCurrentlyTesting && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-purple-900 dark:text-purple-100 text-sm truncate">
                    Currently Simulating: {testingContext?.role}
                  </p>
                  <p className="text-xs text-purple-700 dark:text-purple-300 truncate">
                    {testingContext?.companyType} company
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 truncate">
                    Started: {testingContext?.startTime ? new Date(testingContext.startTime).toLocaleTimeString() : ''}
                  </p>
                </div>
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100 text-xs shrink-0">
                  Active
                </Badge>
              </div>
            </div>
          )}

          <Tabs value={selectedCompanyType} onValueChange={(value) => setSelectedCompanyType(value as 'service' | 'client')}>
            <TabsList className="grid w-full grid-cols-2 h-auto">
              <TabsTrigger value="service" className="flex items-center gap-1 px-1 py-2 text-xs sm:px-2 sm:gap-2 sm:text-sm">
                <Building2 className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate min-w-0">Service</span>
                <span className="hidden sm:inline">Company</span>
              </TabsTrigger>
              <TabsTrigger value="client" className="flex items-center gap-1 px-1 py-2 text-xs sm:px-2 sm:gap-2 sm:text-sm">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate min-w-0">Client</span>
                <span className="hidden sm:inline">Company</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="service" className="mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isCurrentlyTesting ? "Switch to Role" : "Select Role to Test"}
                </label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a service company role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {serviceCompanyRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div>
                          <div className="font-medium">{role.label}</div>
                          <div className="text-xs text-muted-foreground">{role.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="client" className="mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isCurrentlyTesting ? "Switch to Role" : "Select Role to Test"}
                </label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client company role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientCompanyRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div>
                          <div className="font-medium">{role.label}</div>
                          <div className="text-xs text-muted-foreground">{role.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2">
            <Button 
              onClick={handleStartTesting}
              disabled={!selectedRole || startRoleSimulationMutation.isPending}
              className="flex-1 text-sm py-2 h-auto"
              size="sm"
            >
              {startRoleSimulationMutation.isPending ? "Switching..." : isCurrentlyTesting ? "Switch Role" : "Start Simulation"}
            </Button>
            
            {isCurrentlyTesting && (
              <Button 
                onClick={handleStopTesting}
                disabled={stopRoleSimulationMutation.isPending}
                variant="destructive"
                className="flex-1 text-sm py-2 h-auto"
                size="sm"
              >
                {stopRoleSimulationMutation.isPending ? "Stopping..." : "Stop Simulation"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}