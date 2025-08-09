import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, ArrowLeft, Plus, Building2, Users } from "lucide-react";
import Navigation from "@/components/navigation";
import { useLocation } from "wouter";

interface RecentUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  companyId?: string;
  companyName?: string;
  createdAt: string;
  onboardedBy?: string;
}

export default function OperationsRecentSetups() {
  const [, setLocation] = useLocation();

  // TODO: Replace with actual API endpoint for recent users
  const { data: recentUsers = [] } = useQuery<RecentUser[]>({
    queryKey: ['/api/operations/recent-users'],
  });

  // Filter for users created in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentSetups = recentUsers.filter(user => 
    new Date(user.createdAt) >= thirtyDaysAgo
  );

  const adminSetups = recentSetups.filter(user => user.roles.includes('administrator'));
  const otherSetups = recentSetups.filter(user => !user.roles.includes('administrator'));

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
            Recent User Setups
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Recently onboarded users and administrators (last 30 days)
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserPlus className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Recent Setups
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {recentSetups.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    New Administrators
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {adminSetups.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Other Users
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {otherSetups.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserPlus className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    This Week
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {recentSetups.filter(user => {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return new Date(user.createdAt) >= weekAgo;
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Setups List */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                Recent User Onboarding
              </CardTitle>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => setLocation('/operations-dashboard')}
                  variant="outline"
                  size="sm"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Add Company
                </Button>
                <Button 
                  onClick={() => setLocation('/operations-dashboard')}
                  className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Onboard Admin
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recentSetups.length === 0 ? (
              <div className="text-center py-8">
                <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No recent user setups in the last 30 days.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentSetups
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((user) => (
                  <div 
                    key={user.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          {user.roles.includes('administrator') ? (
                            <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          )}
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.roles.includes('administrator')
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                          }`}>
                            {user.roles.includes('administrator') ? 'Administrator' : user.roles.join(', ')}
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                            {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div>
                            <span className="font-medium">Email:</span> {user.email}
                          </div>
                          {user.companyName && (
                            <div>
                              <span className="font-medium">Company:</span> {user.companyName}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Roles:</span> {user.roles.join(', ')}
                          </div>
                          <div>
                            <span className="font-medium">Setup Date:</span> {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                          {user.onboardedBy && (
                            <div>
                              <span className="font-medium">Onboarded By:</span> {user.onboardedBy}
                            </div>
                          )}
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