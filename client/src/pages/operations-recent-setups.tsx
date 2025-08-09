import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, ArrowLeft, Plus, Building2, Users, Home } from "lucide-react";
import Navigation from "@/components/navigation";
import { useLocation } from "wouter";

export default function OperationsRecentSetups() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
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
            Quick Actions
          </h1>
        </div>



        {/* Actions */}
        <div className="flex justify-center space-x-4">
          <Button 
            onClick={() => setLocation('/operations-dashboard')}
            variant="outline"
            size="lg"
          >
            <Building2 className="h-5 w-5 mr-2" />
            Add Company
          </Button>
          <Button 
            onClick={() => setLocation('/operations-dashboard')}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Admin
          </Button>
        </div>
      </div>
    </div>
  );
}