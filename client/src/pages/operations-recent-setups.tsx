import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, ArrowLeft, Plus, Building2, Users, Home } from "lucide-react";
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/operations-dashboard')}
              className="flex items-center space-x-1"
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center space-x-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Recent User Onboarding
          </h1>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center">
                <UserPlus className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Total Recent Setups
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {recentSetups.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    New Administrators
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {adminSetups.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Other Users
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {otherSetups.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center">
                <UserPlus className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    This Week
                  </p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
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


      </div>
    </div>
  );
}