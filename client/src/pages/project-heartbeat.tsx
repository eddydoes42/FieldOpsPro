import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Heart, 
  Activity, 
  TrendingUp, 
  Users, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Calendar
} from 'lucide-react';
import Navigation from '@/components/navigation';
import ProjectHeartbeatMonitor from '@/components/project-heartbeat-monitor';
import { useAuth } from '@/hooks/useAuth';

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  location: string;
  createdAt: string;
  dueDate?: string;
  assigneeId?: string;
  assigneeName?: string;
  companyId: string;
  companyName: string;
  budget?: number;
  budgetType?: string;
  estimatedHours?: number;
}

interface ProjectHealthSummary {
  workOrderId: string;
  projectStatus: string;
  healthScore: number;
  workOrderTitle: string;
  lastActivity: string;
}

export default function ProjectHeartbeatPage() {
  const [, params] = useRoute('/project-heartbeat/:workOrderId');
  const workOrderId = params?.workOrderId;
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('monitor');

  // Fetch work order details
  const { data: workOrder, isLoading: loadingWorkOrder } = useQuery<WorkOrder>({
    queryKey: [`/api/work-orders/${workOrderId}`],
    enabled: !!workOrderId,
  });

  // Fetch project health summary
  const { data: healthSummary } = useQuery<ProjectHealthSummary[]>({
    queryKey: ['/api/project-health-summary'],
  });

  // Find current project in health summary
  const currentProjectHealth = healthSummary?.find(p => p.workOrderId === workOrderId);

  if (!workOrderId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Invalid Project ID</h2>
                <p className="text-gray-600">The project heartbeat monitor could not be loaded.</p>
                <Button 
                  className="mt-4" 
                  onClick={() => window.history.back()}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loadingWorkOrder) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
                <p className="text-gray-600">The requested project could not be found.</p>
                <Button 
                  className="mt-4" 
                  onClick={() => window.history.back()}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': 
      case 'normal': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.history.back()}
                className="flex items-center space-x-1"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
                  <Heart className="h-8 w-8 text-red-500" />
                  <span>Project Heartbeat Monitor</span>
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Real-time health monitoring for {workOrder.title}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(workOrder.status)}>
                {workOrder.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge className={getPriorityColor(workOrder.priority)}>
                {workOrder.priority.toUpperCase()} PRIORITY
              </Badge>
            </div>
          </div>
        </div>

        {/* Project Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-sm text-gray-500">Health Score</div>
                  <div className="text-2xl font-bold">
                    {currentProjectHealth?.healthScore || 100}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-sm text-gray-500">Assigned To</div>
                  <div className="text-lg font-semibold">
                    {workOrder.assigneeName || 'Unassigned'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-sm text-gray-500">Due Date</div>
                  <div className="text-lg font-semibold">
                    {workOrder.dueDate ? formatDate(workOrder.dueDate) : 'Not set'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-sm text-gray-500">Budget</div>
                  <div className="text-lg font-semibold">
                    {workOrder.budget ? formatCurrency(workOrder.budget) : 'Not set'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="monitor">
              <Heart className="h-4 w-4 mr-2" />
              Live Monitor
            </TabsTrigger>
            <TabsTrigger value="details">
              <Activity className="h-4 w-4 mr-2" />
              Project Details
            </TabsTrigger>
            <TabsTrigger value="events">
              <Clock className="h-4 w-4 mr-2" />
              Event History
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Live Monitor Tab */}
          <TabsContent value="monitor" className="space-y-6">
            <ProjectHeartbeatMonitor 
              workOrderId={workOrderId}
              projectTitle={workOrder.title}
              isVisible={true}
            />
            
            {/* Additional monitoring widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Timeline</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">Project Created</div>
                        <div className="text-xs text-gray-500">{formatDate(workOrder.createdAt)}</div>
                      </div>
                    </div>
                    {workOrder.assigneeId && (
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Agent Assigned</div>
                          <div className="text-xs text-gray-500">{workOrder.assigneeName}</div>
                        </div>
                      </div>
                    )}
                    {currentProjectHealth?.lastActivity && (
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Last Activity</div>
                          <div className="text-xs text-gray-500">{formatDate(currentProjectHealth.lastActivity)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Risk Indicators</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {workOrder.dueDate && new Date(workOrder.dueDate) < new Date() && (
                      <div className="flex items-center space-x-2 p-2 bg-red-50 dark:bg-red-900 rounded">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-700 dark:text-red-300">Overdue</span>
                      </div>
                    )}
                    {workOrder.status === 'scheduled' && (
                      <div className="flex items-center space-x-2 p-2 bg-yellow-50 dark:bg-yellow-900 rounded">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-yellow-700 dark:text-yellow-300">Awaiting Start</span>
                      </div>
                    )}
                    {!workOrder.assigneeId && (
                      <div className="flex items-center space-x-2 p-2 bg-orange-50 dark:bg-orange-900 rounded">
                        <Users className="h-4 w-4 text-orange-500" />
                        <span className="text-sm text-orange-700 dark:text-orange-300">No Agent Assigned</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Project Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Title</label>
                  <p className="text-lg">{workOrder.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-700 dark:text-gray-300">{workOrder.description}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <p>{workOrder.location}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Company</label>
                    <p>{workOrder.companyName}</p>
                  </div>
                  {workOrder.estimatedHours && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Estimated Hours</label>
                      <p>{workOrder.estimatedHours} hours</p>
                    </div>
                  )}
                  {workOrder.budgetType && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Budget Type</label>
                      <p>{workOrder.budgetType.replace('_', ' ').toUpperCase()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Event History Tab */}
          <TabsContent value="events" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Event History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Event history will be displayed here when available
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  Analytics dashboard will be implemented in future updates
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}