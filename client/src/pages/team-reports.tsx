import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";

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
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

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
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Reports</h1>
          <p className="text-gray-600">Comprehensive analytics and performance metrics for your field operations team</p>
        </div>

        {/* Key Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                <i className="fas fa-stopwatch text-2xl text-purple-600"></i>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Reports */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performance">Agent Performance</TabsTrigger>
            <TabsTrigger value="completion">Completion Rates</TabsTrigger>
            <TabsTrigger value="status">Work Order Status</TabsTrigger>
            <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
          </TabsList>

          {/* Agent Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-user-friends mr-2 text-blue-600"></i>
                  Agent Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Avg Est. Hours</TableHead>
                      <TableHead>Avg Actual Hours</TableHead>
                      <TableHead>Efficiency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportsData?.agentPerformance.map((agent) => {
                      const efficiency = agent.avgEstimatedHours && agent.avgActualHours 
                        ? (Number(agent.avgEstimatedHours) / Number(agent.avgActualHours) * 100).toFixed(1)
                        : 'N/A';
                      
                      return (
                        <TableRow key={agent.agentId}>
                          <TableCell className="font-medium">{agent.agentName}</TableCell>
                          <TableCell className="text-gray-600">{agent.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{agent.totalAssigned}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              {agent.completedOrders}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatHours(agent.avgEstimatedHours)}</TableCell>
                          <TableCell>{formatHours(agent.avgActualHours)}</TableCell>
                          <TableCell>
                            <span className={efficiency !== 'N/A' && Number(efficiency) >= 90 ? 'text-green-600 font-medium' : 'text-gray-600'}>
                              {efficiency}%
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Completion Rates Tab */}
          <TabsContent value="completion" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-chart-line mr-2 text-green-600"></i>
                  Completion Rates by Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportsData?.completionRates.map((agent) => (
                    <div key={agent.agentId} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{agent.agentName}</span>
                        <span className="text-sm text-gray-600">
                          {agent.completed}/{agent.totalAssigned} completed ({agent.completionRate}%)
                        </span>
                      </div>
                      <Progress value={agent.completionRate} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Work Order Status Tab */}
          <TabsContent value="status" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-tasks mr-2 text-purple-600"></i>
                  Work Order Statistics by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Avg Estimated Hours</TableHead>
                      <TableHead>Avg Actual Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportsData?.workOrderStats.map((stat) => (
                      <TableRow key={stat.status}>
                        <TableCell>
                          <Badge className={getStatusColor(stat.status)}>
                            {stat.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{stat.count}</TableCell>
                        <TableCell>{formatHours(stat.avgEstimatedHours)}</TableCell>
                        <TableCell>{formatHours(stat.avgActualHours)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monthly Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <i className="fas fa-chart-area mr-2 text-orange-600"></i>
                  Monthly Trends (Last 6 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Completion Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportsData?.monthlyTrends.map((trend) => {
                      const completionRate = trend.created > 0 ? (trend.completed / trend.created * 100).toFixed(1) : '0';
                      return (
                        <TableRow key={trend.month}>
                          <TableCell className="font-medium">{trend.month}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{trend.created}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              {trend.completed}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Progress value={Number(completionRate)} className="h-2 flex-1" />
                              <span className="text-sm text-gray-600">{completionRate}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}