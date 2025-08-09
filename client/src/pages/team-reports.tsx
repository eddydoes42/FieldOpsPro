import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/navigation";
import { useEffect, useState } from "react";
import { Clock, MapPin, User, Calendar, ArrowLeft, Home } from "lucide-react";
import { useLocation } from "wouter";

interface TeamReportsData {
  agentPerformance: {
    agentId: string;
    agentName: string;
    email: string;
    totalAssigned: number;
    completedOrders: number;
    avgEstimatedHours: number;
    avgActualHours: number;
  }[];
  workOrderStats: {
    status: string;
    count: number;
    avgEstimatedHours: number;
    avgActualHours: number;
  }[];
  timeTrackingStats: {
    totalEntries: number;
    totalHoursWorked: number;
    avgSessionLength: number;
    activeEntries: number;
  };
  completionRates: {
    agentId: string;
    agentName: string;
    totalAssigned: number;
    completed: number;
    completionRate: number;
  }[];
  monthlyTrends: {
    month: string;
    created: number;
    completed: number;
  }[];
}

export default function TeamReports() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedCardData, setSelectedCardData] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: reportsData, isLoading: reportsLoading, error } = useQuery<TeamReportsData>({
    queryKey: ["/api/reports/team"],
    retry: false,
  });

  const { data: workOrdersData } = useQuery({
    queryKey: ["/api/work-orders"],
    enabled: !!user && ((user as any).role === 'manager' || (user as any).role === 'administrator'),
  });

  if (error && isUnauthorizedError(error as Error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  if (isLoading || reportsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <Navigation />
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-300';
    }
  };

  const formatHours = (hours: number | null) => {
    if (hours === null || hours === undefined) return 'N/A';
    return `${Number(hours).toFixed(1)}h`;
  };

  const getContributingWorkOrders = (type: string, status?: string, agentId?: string) => {
    if (!workOrdersData) return [];
    
    let filteredOrders = workOrdersData as any[];
    
    switch (type) {
      case 'total':
        return filteredOrders;
      case 'hours':
        return filteredOrders.filter((wo: any) => wo.actualHours && wo.actualHours > 0);
      case 'active':
        return filteredOrders.filter((wo: any) => wo.status === 'in_progress');
      case 'avg_session':
        return filteredOrders.filter((wo: any) => wo.actualHours && wo.actualHours > 0);
      case 'status':
        return filteredOrders.filter((wo: any) => wo.status === status);
      case 'agent':
        return filteredOrders.filter((wo: any) => wo.assigneeId === agentId);
      default:
        return filteredOrders;
    }
  };

  const openCardDetails = (cardType: string, title: string, additionalData?: any) => {
    const workOrders = getContributingWorkOrders(cardType, additionalData?.status, additionalData?.agentId);
    setSelectedCardData({
      type: cardType,
      title,
      workOrders,
      ...additionalData
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation */}
        <div className="flex items-center space-x-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const selectedRole = localStorage.getItem('selectedRole');
              if (selectedRole === 'operations_director' || (user as any).roles?.includes('operations_director')) {
                setLocation('/operations-dashboard');
              } else if ((user as any).roles?.includes('administrator')) {
                setLocation('/admin-dashboard');
              } else {
                setLocation('/dashboard');
              }
            }}
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

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Reports</h1>
        </div>
        
        {/* Filter Options */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-4">
            <select 
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Work Orders</option>
              <option value="completed">Completed Only</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
            </select>
            
            <select 
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              <option value="all">All Team Members</option>
              <option value="agent001">John Smith</option>
              <option value="agent002">Lisa Davis</option>
              <option value="agent003">Carlos Rodriguez</option>
            </select>
            
            <select 
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last Year</option>
              <option value="all">All Time</option>
            </select>
            
            <Button variant="outline" size="sm">
              📊 Export Report
            </Button>
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 gap-1 p-1">
            <TabsTrigger value="overview" className="text-xs px-1 py-2">Overview</TabsTrigger>
            <TabsTrigger value="workorders" className="text-xs px-1 py-2">Work Orders</TabsTrigger>
            <TabsTrigger value="team" className="text-xs px-1 py-2">Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => openCardDetails('total', 'Total Work Orders')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Work Orders</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {reportsData?.workOrderStats.reduce((sum, stat) => sum + stat.count, 0) || 0}
                      </p>
                    </div>
                    <span className="text-2xl text-blue-600 dark:text-blue-400">📋</span>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => openCardDetails('hours', 'Hours Worked')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Hours Worked</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatHours(reportsData?.timeTrackingStats.totalHoursWorked || 0)}
                      </p>
                    </div>
                    <span className="text-2xl text-green-600 dark:text-green-400">🕐</span>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => openCardDetails('active', 'Active Sessions')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Sessions</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {reportsData?.timeTrackingStats.activeEntries || 0}
                      </p>
                    </div>
                    <span className="text-2xl text-orange-600 dark:text-orange-400">▶️</span>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => openCardDetails('avg_session', 'Average Session Length')}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg Session</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatHours(reportsData?.timeTrackingStats.avgSessionLength || 0)}
                      </p>
                    </div>
                    <span className="text-2xl text-purple-600 dark:text-purple-400">⏳</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="workorders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-foreground">
                  <span className="mr-2 text-green-600 dark:text-green-400">📊</span>
                  Work Order Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportsData?.workOrderStats.map((stat) => (
                    <div 
                      key={stat.status} 
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => openCardDetails('status', `Work Orders: ${stat.status.replace('_', ' ').toUpperCase()}`, { status: stat.status })}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <Badge className={getStatusColor(stat.status)}>
                            {stat.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="font-medium text-foreground truncate">{stat.count} orders</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-2 text-xs text-gray-600 dark:text-gray-300">
                        <span>Est: {formatHours(stat.avgEstimatedHours)}</span>
                        <span>Act: {formatHours(stat.avgActualHours)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-foreground">
                  <span className="mr-2 text-blue-600 dark:text-blue-400">👥</span>
                  Agent Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportsData?.agentPerformance.map((agent) => {
                    const completionRate = agent.totalAssigned > 0 
                      ? (agent.completedOrders / agent.totalAssigned * 100).toFixed(1) 
                      : '0';
                    
                    return (
                      <div 
                        key={agent.agentId} 
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => openCardDetails('agent', `${agent.agentName} - Performance Details`, { agentId: agent.agentId, agentName: agent.agentName })}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0 pr-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">{agent.agentName}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{agent.email}</p>
                          </div>
                          <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 whitespace-nowrap flex-shrink-0">
                            {completionRate}% Complete
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Assigned:</span>
                            <span className="font-medium text-foreground">{agent.totalAssigned}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Completed:</span>
                            <span className="font-medium text-foreground">{agent.completedOrders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Est Hours:</span>
                            <span className="font-medium text-foreground">{formatHours(agent.avgEstimatedHours)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-300">Act Hours:</span>
                            <span className="font-medium text-foreground">{formatHours(agent.avgActualHours)}</span>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <Progress value={Number(completionRate)} className="h-2" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Work Order Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-blue-600 dark:text-blue-400">📊</span>
                {selectedCardData?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCardData?.workOrders && selectedCardData.workOrders.length > 0 ? (
                <>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Showing {selectedCardData.workOrders.length} work orders that contributed to this metric
                  </div>
                  <div className="grid gap-4">
                    {selectedCardData.workOrders.map((wo: any) => (
                      <Card key={wo.id} className="bg-gray-50 dark:bg-gray-800/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                {wo.title || 'Untitled Work Order'}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                {wo.description || 'No description'}
                              </p>
                            </div>
                            <Badge className={getStatusColor(wo.status)}>
                              {wo.status?.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 text-gray-500" />
                              <span className="text-gray-600 dark:text-gray-300">
                                {wo.assigneeName || wo.assigneeId || 'Unassigned'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-500" />
                              <span className="text-gray-600 dark:text-gray-300 truncate">
                                {wo.location || 'No location'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span className="text-gray-600 dark:text-gray-300">
                                Est: {formatHours(wo.estimatedHours)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-500" />
                              <span className="text-gray-600 dark:text-gray-300">
                                Act: {formatHours(wo.actualHours)}
                              </span>
                            </div>
                          </div>

                          {wo.priority && (
                            <div className="mt-2">
                              <Badge variant="outline" className={
                                wo.priority === 'high' ? 'border-red-300 text-red-700 dark:border-red-700 dark:text-red-300' :
                                wo.priority === 'medium' ? 'border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-300' :
                                'border-green-300 text-green-700 dark:border-green-700 dark:text-green-300'
                              }>
                                {wo.priority.toUpperCase()} Priority
                              </Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>No work orders found for this metric.</p>
                  <p className="text-sm">This could mean the data is still loading or no work orders match the criteria.</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}