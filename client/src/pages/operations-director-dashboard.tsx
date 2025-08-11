import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, UserPlus, Settings, DollarSign, User, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Navigation from "@/components/navigation";
import PermanentRoleSwitcher from "@/components/permanent-role-switcher";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import CompanyOnboardingForm from "@/components/company-onboarding-form";
import AdminOnboardingForm from "@/components/admin-onboarding-form";
import { Company } from "../../../shared/schema";

export default function OperationsDirectorDashboard() {
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [, setLocation] = useLocation();
  const [currentActiveRole, setCurrentActiveRole] = useState(
    localStorage.getItem('permanentRole') || 'operations_director'
  );
  const [testingRole, setTestingRole] = useState<string>('administrator');
  const [selectedTestRole, setSelectedTestRole] = useState<string>('administrator');

  // Listen for custom events from quick action menu
  useEffect(() => {
    const handleOpenCompanyForm = () => setShowCompanyForm(true);
    const handleOpenAdminForm = () => setShowAdminForm(true);

    window.addEventListener('openCompanyForm', handleOpenCompanyForm);
    window.addEventListener('openAdminForm', handleOpenAdminForm);

    return () => {
      window.removeEventListener('openCompanyForm', handleOpenCompanyForm);
      window.removeEventListener('openAdminForm', handleOpenAdminForm);
    };
  }, []);

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const { data: stats = { totalAdmins: 0, activeCompanies: 0, recentSetups: 0 } } = useQuery<{
    totalAdmins: number;
    activeCompanies: number;
    recentSetups: number;
  }>({
    queryKey: ['/api/operations/stats'],
  });

  const { data: budgetData = { totalEarned: 0, todayEarning: 0 } } = useQuery<{
    totalEarned: number;
    todayEarning: number;
  }>({
    queryKey: ['/api/operations/budget-summary'],
  });

  if (showCompanyForm) {
    return <CompanyOnboardingForm onClose={() => setShowCompanyForm(false)} />;
  }

  if (showAdminForm) {
    return <AdminOnboardingForm onClose={() => setShowAdminForm(false)} />;
  }

  const availableRoles = [
    { value: 'administrator', label: 'Administrator', shortLabel: 'Admin' },
    { value: 'manager', label: 'Manager', shortLabel: 'Manager' },
    { value: 'dispatcher', label: 'Dispatcher', shortLabel: 'Dispatcher' },
    { value: 'field_agent', label: 'Field Agent', shortLabel: 'Field Agent' },
    { value: 'client', label: 'Client', shortLabel: 'Client' }
  ];

  const handleStartTesting = (role: string) => {
    localStorage.setItem('testingRole', role);
    // Navigate to appropriate dashboard based on role
    if (role === 'administrator') {
      window.location.href = '/admin-dashboard';
    } else if (role === 'manager') {
      window.location.href = '/manager-dashboard';
    } else if (role === 'dispatcher') {
      window.location.href = '/dispatcher-dashboard';
    } else if (role === 'field_agent') {
      window.location.href = '/agent-dashboard';
    } else if (role === 'client') {
      window.location.href = '/client-dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Role Tester for Operations Director */}
      <div className="mb-4 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3 mx-4 mt-4">
        <div className="flex items-center">
          <span className="text-sm text-purple-700 font-medium mr-3">Role Tester</span>
        </div>
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                <User className="h-3 w-3 mr-2" />
                {availableRoles.find(role => role.value === selectedTestRole)?.shortLabel || 'Switch Role'}
                <ChevronDown className="h-3 w-3 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-purple-900">
                Available Roles
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableRoles.map((role) => (
                <DropdownMenuItem
                  key={role.value}
                  onClick={() => handleStartTesting(role.value)}
                  className="cursor-pointer"
                >
                  <User className="h-3 w-3 mr-2" />
                  {role.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  localStorage.removeItem('testingRole');
                  setSelectedTestRole('administrator'); // Reset to default
                  window.location.reload(); // Refresh to clear any testing state
                }}
                className="cursor-pointer text-red-600 hover:text-red-700 focus:text-red-700"
              >
                <span className="text-red-600 mr-2">✕</span>
                Stop Testing
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <Navigation 
        currentActiveRole={localStorage.getItem('permanentRole') || 'operations_director'} 
        onPermanentRoleSwitch={(role) => {
          localStorage.setItem('permanentRole', role);
          localStorage.setItem('selectedRole', role);
          // Navigate to appropriate dashboard based on role
          window.location.href = '/dashboard';
        }}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Operations Director Dashboard
              </h1>
            </div>
            

          </div>
          
          {/* Budget Indicator */}
          <div className="flex justify-end">
            <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Total Earned
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    ${(budgetData.totalEarned || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Today's Earning
                </p>
                <p className="text-sm font-bold text-green-600 dark:text-green-400">
                  ${(budgetData.todayEarning || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            onClick={() => setLocation('/operations/companies')}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Companies
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {companies.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            onClick={() => setLocation('/operations/active-admins')}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Admins
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalAdmins || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            onClick={() => setLocation('/operations/companies?status=active')}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Companies
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.activeCompanies || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            onClick={() => setLocation('/operations/recent-setups')}
          >
            <CardContent className="p-6">
              <div className="flex items-center">
                <UserPlus className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Recent Setups
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.recentSetups || 0}
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