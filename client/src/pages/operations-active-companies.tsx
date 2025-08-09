import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Building2, ArrowLeft, Plus } from "lucide-react";
import Navigation from "@/components/navigation";
import { useLocation } from "wouter";
import { Company } from "../../../shared/schema";

export default function OperationsActiveCompanies() {
  const [, setLocation] = useLocation();

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const activeCompanies = companies.filter(company => company.isActive);

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
            Active Service Companies
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Currently active IT service companies with operations
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Companies
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {activeCompanies.length}
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
                    Total Companies
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {companies.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Activity Rate
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {companies.length > 0 ? Math.round((activeCompanies.length / companies.length) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Companies List */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                Active Companies
              </CardTitle>
              <Button 
                onClick={() => setLocation('/operations-dashboard')}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Company
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeCompanies.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No active companies found. Companies may be inactive or not yet onboarded.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeCompanies.map((company) => (
                  <div 
                    key={company.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                            {company.name}
                          </h3>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            Active
                          </span>
                        </div>
                        
                        {company.description && (
                          <p className="text-gray-600 dark:text-gray-400 mb-3">
                            {company.description}
                          </p>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-500 dark:text-gray-400">
                          {company.email && (
                            <div>
                              <span className="font-medium">Contact Email:</span> {company.email}
                            </div>
                          )}
                          {company.phone && (
                            <div>
                              <span className="font-medium">Phone:</span> {company.phone}
                            </div>
                          )}
                          {company.city && company.state && (
                            <div>
                              <span className="font-medium">Location:</span> {company.city}, {company.state}
                            </div>
                          )}
                          {company.website && (
                            <div>
                              <span className="font-medium">Website:</span> 
                              <a href={company.website} target="_blank" rel="noopener noreferrer" 
                                 className="text-blue-600 dark:text-blue-400 hover:underline ml-1">
                                {company.website}
                              </a>
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Active Since:</span> {new Date(company.createdAt || '').toLocaleDateString()}
                          </div>
                          {company.industry && (
                            <div>
                              <span className="font-medium">Industry:</span> {company.industry}
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