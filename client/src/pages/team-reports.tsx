import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/navigation";
import { useEffect, useState } from "react";

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
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("30");

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
      <div className="min-h-screen bg-gray-50 p-6">
        <Navigation userRole={(user as any)?.role || 'manager'} />
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatHours = (hours: number | null) => {
    if (hours === null || hours === undefined) return 'N/A';
    return `${Number(hours).toFixed(1)}h`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userRole={(user as any)?.role || 'manager'} />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Reports</h1>
          <p className="text-gray-600">Comprehensive analytics and performance metrics for your field operations team</p>
          
          {/* Filter Options */}
          <div className="mt-4 flex flex-wrap gap-4">
            <select 
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Work Orders</option>
              <option value="completed">Completed Only</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
            </select>
            
            <select 
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              <option value="all">All Team Members</option>
              <option value="agent001">John Smith</option>
              <option value="agent002">Lisa Davis</option>
              <option value="agent003">Carlos Rodriguez</option>
            </select>
            
            <select 
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last Year</option>
              <option value="all">All Time</option>
            </select>
            
            <Button variant="outline" size="sm">
              <i className="fas fa-download mr-2"></i>
              Export Report
            </Button>
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="workorders">Work Orders</TabsTrigger>
            <TabsTrigger value="team">Team Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Work Orders</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {reportsData?.workOrderStats.reduce((sum, stat) => sum + stat.count, 0) || 0}
                      </p>
                    </div>
                    <i className="fas fa-clipboard-list text-2xl text-blue-600"></i>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Hours Worked</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatHours(reportsData?.timeTrackingStats.totalHoursWorked || 0)}
                      </p>
                    </div>
                    <i className="fas fa-clock text-2xl text-green-600"></i>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {reportsData?.timeTrackingStats.activeEntries || 0}
                      </p>
                    </div>
                    <i className="fas fa-play-circle text-2xl text-orange-600"></i>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Session</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatHours(reportsData?.timeTrackingStats.avgSessionLength || 0)}
                      </p>
                    </div>
                    <i className="fas fa-hourglass-half text-2xl text-purple-600"></i>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="workorders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-chart-pie mr-2 text-green-600"></i>
                  Work Order Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportsData?.workOrderStats.map((stat) => (
                    <div key={stat.status} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(stat.status)}>
                          {stat.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="font-medium">{stat.count} orders</span>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <div>Est: {formatHours(stat.avgEstimatedHours)}</div>
                        <div>Act: {formatHours(stat.avgActualHours)}</div>
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
                <CardTitle className="flex items-center">
                  <i className="fas fa-users mr-2 text-blue-600"></i>
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
                      <div key={agent.agentId} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{agent.agentName}</h4>
                            <p className="text-sm text-gray-600">{agent.email}</p>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {completionRate}% Complete
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Assigned:</span>
                            <span className="ml-2 font-medium">{agent.totalAssigned}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Completed:</span>
                            <span className="ml-2 font-medium">{agent.completedOrders}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Estimated:</span>
                            <span className="ml-2 font-medium">{formatHours(agent.avgEstimatedHours)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Actual:</span>
                            <span className="ml-2 font-medium">{formatHours(agent.avgActualHours)}</span>
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
      </div>
    </div>
  );
}