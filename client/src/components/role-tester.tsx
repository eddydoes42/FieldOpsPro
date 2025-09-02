import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, Eye, ChevronDown, User, Building2, Users, AlertCircle } from "lucide-react";
import { isOperationsDirector, isValidTestRoleForCompanyType } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface RoleTesterProps {
  currentRole: string;
  onRoleSwitch: (role: string) => void;
}

const serviceCompanyRoles = [
  { value: 'administrator', label: 'Administrator', description: 'Full company management access' },
  { value: 'project_manager', label: 'Project Manager', description: 'Project oversight and coordination' },
  { value: 'manager', label: 'Manager', description: 'Team and operations management' },
  { value: 'dispatcher', label: 'Dispatcher', description: 'Work order coordination and dispatch' },
  { value: 'field_engineer', label: 'Field Engineer', description: 'Advanced technical field work' },
  { value: 'field_agent', label: 'Field Agent', description: 'Basic field service tasks' }
];

const clientCompanyRoles = [
  { value: 'client_company_admin', label: 'Client Admin', description: 'Client company administration' },
  { value: 'project_manager', label: 'Project Manager', description: 'Project oversight and coordination' },
  { value: 'manager', label: 'Manager', description: 'Team and operations management' },
  { value: 'dispatcher', label: 'Dispatcher', description: 'Work order coordination and dispatch' }
];

export default function RoleTester({ currentRole, onRoleSwitch }: RoleTesterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCompanyType, setSelectedCompanyType] = useState<'service' | 'client'>('service');
  const [selectedRole, setSelectedRole] = useState<string>('');

  // Check impersonation status
  const { data: impersonationStatus } = useQuery({
    queryKey: ['/api/impersonation/status'],
    refetchInterval: 5000 // Check every 5 seconds
  });

  const startImpersonationMutation = useMutation({
    mutationFn: ({ role, companyType }: { role: string; companyType: 'service' | 'client' }) =>
      apiRequest('/api/impersonation/start', 'POST', { role, companyType }).then(res => res.json()),
    onSuccess: (data) => {
      // Store testing info in localStorage for header compatibility
      localStorage.setItem('testingRole', data.context.role);
      localStorage.setItem('testingCompanyType', data.context.companyType);
      
      // Invalidate auth query to get new user context
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: "Role Testing Started",
        description: `Now testing as ${data.context.role} in ${data.context.companyType} company`,
      });

      // Call the role switch handler
      onRoleSwitch(data.context.role);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start role testing",
        variant: "destructive",
      });
    }
  });

  const stopImpersonationMutation = useMutation({
    mutationFn: () => apiRequest('/api/impersonation/stop', 'POST').then(res => res.json()),
    onSuccess: () => {
      // Clear testing info
      localStorage.removeItem('testingRole');
      localStorage.removeItem('testingCompanyType');
      
      // Invalidate auth query to return to original user
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: "Role Testing Stopped",
        description: "Returned to Operations Director mode",
      });

      // Call the role switch handler to return to OD
      onRoleSwitch('operations_director');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stop role testing",
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

    // Validate role/company type combination
    if (!isValidTestRoleForCompanyType(selectedRole, selectedCompanyType)) {
      toast({
        title: "Invalid Combination",
        description: `Role "${selectedRole}" is not valid for ${selectedCompanyType} companies`,
        variant: "destructive",
      });
      return;
    }

    startImpersonationMutation.mutate({
      role: selectedRole,
      companyType: selectedCompanyType
    });
  };

  const handleStopTesting = () => {
    stopImpersonationMutation.mutate();
  };

  const isCurrentlyTesting = (impersonationStatus as any)?.isImpersonating;
  const currentlySelectedRoles = selectedCompanyType === 'service' ? serviceCompanyRoles : clientCompanyRoles;

  return (
    <Card className="mb-6 mx-auto max-w-4xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          Role Tester
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
              Testing as <strong>{(impersonationStatus as any)?.context?.role}</strong> in{' '}
              <strong>{(impersonationStatus as any)?.context?.companyType}</strong> company.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-3">
            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
            <AlertDescription className="text-xs sm:text-sm">
              Test different user roles to verify permissions and functionality.
            </AlertDescription>
          </Alert>
        )}

        {!isCurrentlyTesting ? (
          <div className="space-y-3">
            <Tabs value={selectedCompanyType} onValueChange={(value) => setSelectedCompanyType(value as 'service' | 'client')}>
              <TabsList className="grid w-full grid-cols-2 h-auto">
                <TabsTrigger value="service" className="flex items-center gap-1 sm:gap-2 px-2 py-2 text-xs sm:text-sm">
                  <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="truncate">Service Co.</span>
                </TabsTrigger>
                <TabsTrigger value="client" className="flex items-center gap-1 sm:gap-2 px-2 py-2 text-xs sm:text-sm">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="truncate">Client Co.</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="service" className="mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Role to Test</label>
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
                  <label className="text-sm font-medium">Select Role to Test</label>
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

            <Button 
              onClick={handleStartTesting}
              disabled={!selectedRole || startImpersonationMutation.isPending}
              className="w-full text-sm py-2 h-auto"
              size="sm"
            >
              {startImpersonationMutation.isPending ? "Starting..." : "Start Testing"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-purple-900 dark:text-purple-100 text-sm truncate">
                    Testing: {(impersonationStatus as any)?.context?.role}
                  </p>
                  <p className="text-xs text-purple-700 dark:text-purple-300 truncate">
                    {(impersonationStatus as any)?.context?.companyType} company
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 truncate">
                    {(impersonationStatus as any)?.context?.startTime ? new Date((impersonationStatus as any).context.startTime).toLocaleTimeString() : ''}
                  </p>
                </div>
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100 text-xs shrink-0">
                  Active
                </Badge>
              </div>
            </div>

            <Button 
              onClick={handleStopTesting}
              disabled={stopImpersonationMutation.isPending}
              variant="destructive"
              className="w-full text-sm py-2 h-auto"
              size="sm"
            >
              {stopImpersonationMutation.isPending ? "Stopping..." : "Stop Testing"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}