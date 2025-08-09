import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Users, ArrowLeft, Plus, Building2 } from "lucide-react";
import Navigation from "@/components/navigation";
import { useLocation } from "wouter";

interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyId?: string;
  companyName?: string;
  roles: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export default function OperationsActiveAdmins() {
  const [, setLocation] = useLocation();

  // TODO: Replace with actual API endpoint for admins
  const { data: admins = [] } = useQuery<Admin[]>({
    queryKey: ['/api/operations/admins'],
  });

  const activeAdmins = admins.filter(admin => admin.isActive && admin.roles.includes('administrator'));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/operations-dashboard')}
            className="mb-4 flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Operations Dashboard</span>
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Active Service Company Administrators
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Active administrators managing IT service companies
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:bg-gray-50 dark:hover:bg-gray-750"
            onClick={() => setLocation('/team?role=administrator&status=active')}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Admins
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {activeAdmins.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:bg-gray-50 dark:hover:bg-gray-750"
            onClick={() => setLocation('/team?role=administrator')}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Admins
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {admins.filter(admin => admin.roles.includes('administrator')).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:bg-gray-50 dark:hover:bg-gray-750"
            onClick={() => setLocation('/operations/companies?status=active')}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Companies Managed
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {new Set(activeAdmins.map(admin => admin.companyId).filter(Boolean)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admins List */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                Active Administrators
              </CardTitle>
              <Button 
                onClick={() => setLocation('/operations-dashboard')}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Onboard New Admin
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeAdmins.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No active administrators found. Start by onboarding your first administrator.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeAdmins.map((admin) => (
                  <div 
                    key={admin.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                            {admin.firstName} {admin.lastName}
                          </h3>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            Active
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div>
                            <span className="font-medium">Email:</span> {admin.email}
                          </div>
                          {admin.companyName && (
                            <div>
                              <span className="font-medium">Company:</span> {admin.companyName}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Roles:</span> {admin.roles.join(', ')}
                          </div>
                          {admin.lastLoginAt && (
                            <div>
                              <span className="font-medium">Last Login:</span> {new Date(admin.lastLoginAt).toLocaleDateString()}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Onboarded:</span> {new Date(admin.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}