import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Eye, RefreshCw, AlertTriangle } from "lucide-react";
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
  const [isTestMode, setIsTestMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState(currentRole);

  // Only show for operations directors
  if (!isOperationsDirector(user as any)) {
    return null;
  }

  const handleRoleSwitch = () => {
    onRoleSwitch(selectedRole);
    setIsTestMode(selectedRole !== 'operations_director');
  };

  const handleResetToNormal = () => {
    onRoleSwitch('operations_director');
    setSelectedRole('operations_director');
    setIsTestMode(false);
  };

  const currentRoleInfo = availableRoles.find(role => role.value === currentRole);

  return (
    <Card className="mb-6 border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg text-purple-900">Role Testing Mode</CardTitle>
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
              Operations Director Only
            </Badge>
          </div>
          {isTestMode && (
            <div className="flex items-center space-x-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Testing Mode Active</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Current View:
            </label>
            <Badge className={`${currentRoleInfo?.color} border text-sm px-3 py-1`}>
              <Eye className="h-3 w-3 mr-2" />
              {currentRoleInfo?.label || 'Unknown Role'}
            </Badge>
          </div>
          
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Switch to Role:
            </label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select role to test" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex items-center space-x-2">
                      <Badge className={`${role.color} border text-xs px-2 py-0.5`}>
                        {role.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              onClick={handleRoleSwitch}
              disabled={selectedRole === currentRole}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Eye className="h-4 w-4 mr-2" />
              Switch View
            </Button>
            
            {isTestMode && (
              <Button 
                onClick={handleResetToNormal}
                variant="outline"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}
          </div>
        </div>
        
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md border border-blue-200">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-800 mb-1">Role Testing Feature</p>
              <p className="text-blue-700">
                As an Operations Director, you can test the functionality of different role dashboards. 
                Switch roles to experience the system from different user perspectives. 
                {isTestMode && (
                  <span className="font-medium"> You are currently in testing mode - click Reset to return to your normal Operations Director view.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}