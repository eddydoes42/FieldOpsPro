import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, Users, DollarSign, MapPin, Clock, Briefcase, CheckSquare, AlertCircle, Home } from 'lucide-react';
import { useLocation } from 'wouter';
import type { Project } from '@shared/schema';
import { formatCurrency, formatBudget } from '@/lib/utils';

export default function ProjectManagerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Role Testing Components
  const ServiceCompanyRoleTester = () => {
    const [testingRole, setTestingRole] = useState<string>('');

    return (
      <div className="bg-purple-600 text-white px-4 py-2 mb-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Service Company Role Tester:</span>
          <select
            value={testingRole}
            onChange={(e) => setTestingRole(e.target.value)}
            className="bg-purple-700 text-white border border-purple-500 rounded px-2 py-1 text-sm"
          >
            <option value="">Select a Role</option>
            <option value="administrator">Administrator</option>
            <option value="project_manager">Project Manager</option>
            <option value="manager">Manager</option>
            <option value="dispatcher">Dispatcher</option>
            <option value="field_engineer">Field Engineer</option>
            <option value="field_agent">Field Agent</option>
          </select>
        </div>
      </div>
    );
  };

  const ClientCompanyRoleTester = () => {
    const [testingRole, setTestingRole] = useState<string>('');

    return (
      <div className="bg-teal-600 text-white px-4 py-2 mb-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Client Company Role Tester:</span>
          <select
            value={testingRole}
            onChange={(e) => setTestingRole(e.target.value)}
            className="bg-teal-700 text-white border border-teal-500 rounded px-2 py-1 text-sm"
          >
            <option value="">Select a Role</option>
            <option value="administrator">Administrator</option>
            <option value="manager">Manager</option>
            <option value="dispatcher">Dispatcher</option>
          </select>
        </div>
      </div>
    );
  };

  // Fetch projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Fetch project stats
  const { data: stats = {} } = useQuery({
    queryKey: ["/api/project-manager/stats"],
  });

  // Filter projects by status and ownership
  const myProjects = (projects as Project[]).filter((p: Project) => 
    p.createdByCompanyId === (user as any)?.companyId || p.createdById === (user as any)?.id
  );
  
  const availableProjects = (projects as Project[]).filter((p: Project) => 
    p.status === 'available' && p.createdByCompanyId !== (user as any)?.companyId
  );
  
  const activeProjects = myProjects.filter((p: Project) => 
    p.status === 'in_progress' || p.status === 'assigned'
  );
  
  const completedProjects = myProjects.filter((p: Project) => 
    p.status === 'completed'
  );

  // Import formatCurrency from utils instead of defining locally

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'available': return 'default';
      case 'assigned': return 'secondary';
      case 'in_progress': return 'secondary';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-3">
      {/* Role Testers - Always present for Operations Director */}
      <ServiceCompanyRoleTester />
      <ClientCompanyRoleTester />
      
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/dashboard')}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <Home className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Project Manager Dashboard</h1>
          </div>
          <Button size="sm" onClick={() => setLocation('/project-network')}>
            <Plus className="h-3 w-3 mr-2" />
            Manage Projects
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <Card className="p-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold truncate">{myProjects.length}</div>
              <p className="text-xs text-muted-foreground truncate">Total Projects</p>
            </div>
            <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
          </div>
        </Card>

        <Card className="p-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold truncate">{activeProjects.length}</div>
              <p className="text-xs text-muted-foreground truncate">Active</p>
            </div>
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
          </div>
        </Card>

        <Card className="p-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold truncate">{completedProjects.length}</div>
              <p className="text-xs text-muted-foreground truncate">Completed</p>
            </div>
            <CheckSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
          </div>
        </Card>

        <Card className="p-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-lg font-bold truncate">
                {formatCurrency(myProjects.reduce((sum, p) => sum + Number(p.budget || 0), 0))}
              </div>
              <p className="text-xs text-muted-foreground truncate">Budget</p>
            </div>
            <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
          </div>
        </Card>
      </div>

      {/* Project Tabs */}
      <Tabs defaultValue="my-projects" className="space-y-1">
        <TabsList className="h-7">
          <TabsTrigger value="my-projects" className="text-xs px-2">My Projects ({myProjects.length})</TabsTrigger>
          <TabsTrigger value="active" className="text-xs px-2">Active ({activeProjects.length})</TabsTrigger>
          <TabsTrigger value="available" className="text-xs px-2">Available ({availableProjects.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my-projects" className="space-y-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {myProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{project.name}</CardTitle>
                    <Badge variant={getStatusBadgeVariant(project.status)} className="text-xs">
                      {project.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-gray-600">
                    {project.projectCode}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    <div className="flex items-center text-xs text-gray-600">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(project.startDate)}
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <Clock className="h-3 w-3 mr-1" />
                      {project.expectedDuration} days
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <Users className="h-3 w-3 mr-1" />
                      {project.workersNeeded} workers
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <DollarSign className="h-3 w-3 mr-1" />
                      {formatCurrency(Number(project.budget || 0))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {myProjects.length === 0 && (
            <div className="text-center py-8">
              <Briefcase className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No projects yet</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Create your first project to get started</p>
              <Button size="sm" onClick={() => setLocation('/project-network')}>
                <Plus className="h-3 w-3 mr-1" />
                Create Project
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {activeProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer border-blue-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge variant={getStatusBadgeVariant(project.status)}>
                      {project.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm text-gray-600">
                    {project.projectCode}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Start: {formatDate(project.startDate)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      Duration: {project.expectedDuration} days
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-2" />
                      Workers needed: {project.workersNeeded}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Budget: {formatCurrency(Number(project.budget || 0))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {activeProjects.length === 0 && (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No active projects</h3>
              <p className="text-gray-600 dark:text-gray-400">Projects will appear here once they are assigned and in progress</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="available" className="space-y-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {availableProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer border-green-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge variant="default">AVAILABLE</Badge>
                  </div>
                  <CardDescription className="text-sm text-gray-600">
                    {project.projectCode}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Start: {formatDate(project.startDate)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      Duration: {project.expectedDuration} days
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-2" />
                      Workers needed: {project.workersNeeded}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Budget: {formatCurrency(Number(project.budget || 0))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {availableProjects.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No available projects</h3>
              <p className="text-gray-600 dark:text-gray-400">Check back later for new project opportunities</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}