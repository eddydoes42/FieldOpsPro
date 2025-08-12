import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, Settings, UserCheck } from "lucide-react";
import { useLocation } from "wouter";

interface RoleSelectionProps {
  user: any;
}

export default function RoleSelection({ user }: RoleSelectionProps) {
  const [, setLocation] = useLocation();

  const hasOperationsDirectorRole = user?.roles?.includes('operations_director');
  const hasAdministratorRole = user?.roles?.includes('administrator');

  // If user only has one relevant role, redirect automatically
  if (hasOperationsDirectorRole && !hasAdministratorRole) {
    setLocation('/operations-dashboard');
    return null;
  }
  
  if (hasAdministratorRole && !hasOperationsDirectorRole) {
    setLocation('/admin-dashboard');
    return null;
  }

  // If user has no relevant roles, redirect to dashboard with their primary role
  if (!hasOperationsDirectorRole && !hasAdministratorRole) {
    setLocation('/dashboard');
    return null;
  }

  const handleOperationsDirector = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Store preference and redirect to operations director dashboard
    localStorage.setItem('selectedRole', 'operations_director');
    setLocation('/operations-dashboard');
  };

  const handleCompanyAdmin = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Store preference and redirect to company admin dashboard
    localStorage.setItem('selectedRole', 'administrator');
    setLocation('/admin-dashboard');
  };

  const handleClientCompany = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Store testing role for client company testing and redirect to client dashboard
    localStorage.setItem('testingRole', 'client_company_admin');
    localStorage.setItem('testingCompanyType', 'client');
    setLocation('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {user?.firstName} {user?.lastName}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            You have multiple roles. Please choose how you'd like to access the system today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Operations Director Option */}
          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-blue-100 dark:bg-blue-900 rounded-full w-fit">
                <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                Operations Director
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Manage multiple IT service companies, onboard new companies, and create administrators across the platform.
              </p>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                <div className="flex items-center justify-center">
                  <Settings className="h-4 w-4 mr-2" />
                  <span>Multi-company oversight</span>
                </div>
                <div className="flex items-center justify-center">
                  <UserCheck className="h-4 w-4 mr-2" />
                  <span>Administrator onboarding</span>
                </div>
                <div className="flex items-center justify-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  <span>Company management</span>
                </div>
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                onClick={handleOperationsDirector}
                type="button"
              >
                Access Operations Director Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* Service Company Admin Option */}
          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-green-100 dark:bg-green-900 rounded-full w-fit">
                <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                Service Company Admin
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Manage your IT service company operations, work orders, team members, and day-to-day business activities.
              </p>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                <div className="flex items-center justify-center">
                  <Users className="h-4 w-4 mr-2" />
                  <span>Team management</span>
                </div>
                <div className="flex items-center justify-center">
                  <Settings className="h-4 w-4 mr-2" />
                  <span>Work order oversight</span>
                </div>
                <div className="flex items-center justify-center">
                  <UserCheck className="h-4 w-4 mr-2" />
                  <span>Staff onboarding</span>
                </div>
              </div>
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                onClick={handleCompanyAdmin}
                type="button"
              >
                Access Company Admin Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* Client Company Option */}
          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-3 bg-teal-100 dark:bg-teal-900 rounded-full w-fit">
                <UserCheck className="h-8 w-8 text-teal-600 dark:text-teal-400" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                Client Company
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Test client company administration, work order creation, and IT service management from the client perspective.
              </p>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                <div className="flex items-center justify-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  <span>Work order creation</span>
                </div>
                <div className="flex items-center justify-center">
                  <UserCheck className="h-4 w-4 mr-2" />
                  <span>Service requests</span>
                </div>
                <div className="flex items-center justify-center">
                  <Users className="h-4 w-4 mr-2" />
                  <span>Talent network access</span>
                </div>
              </div>
              <Button 
                className="w-full bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700"
                onClick={handleClientCompany}
                type="button"
              >
                Access Client Company Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            You can change your role preference at any time from your dashboard settings.
          </p>
        </div>
      </div>
    </div>
  );
}