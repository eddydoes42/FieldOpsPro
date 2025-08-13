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

export default function ProjectManagerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/dashboard')}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Manager Dashboard</h1>
          </div>
          <Button onClick={() => setLocation('/project-network')}>
            <Plus className="h-4 w-4 mr-2" />
            Manage Projects
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myProjects.length}</div>
            <p className="text-xs text-muted-foreground">Projects created by you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects.length}</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Projects</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedProjects.length}</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(myProjects.reduce((sum, p) => sum + Number(p.budget || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>
      </div>

      {/* Project Tabs */}
      <Tabs defaultValue="my-projects" className="space-y-3">
        <TabsList>
          <TabsTrigger value="my-projects">My Projects ({myProjects.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeProjects.length})</TabsTrigger>
          <TabsTrigger value="available">Available ({availableProjects.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my-projects" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow cursor-pointer">
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
          {myProjects.length === 0 && (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No projects yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Create your first project to get started</p>
              <Button onClick={() => setLocation('/project-network')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

        <TabsContent value="available" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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