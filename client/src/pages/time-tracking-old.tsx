import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TimeTracker from "@/components/time-tracker";
import { ArrowLeft, Clock, Calendar, Home, Filter } from "lucide-react";
import { useLocation } from "wouter";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface TimeEntry {
  id: string;
  userId: string;
  workOrderId: string | null;
  workOrderTitle?: string | null;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
  createdAt: string;
}

interface WorkOrder {
  id: string;
  title: string;
}

export default function TimeTracking() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [timeFilter, setTimeFilter] = useState<'day' | 'week'>('day');

  // Get all time entries for the current user
  const { data: timeEntries, isLoading: entriesLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries"],
    enabled: !!user,
  });

  // Get work orders for title lookup
  const { data: workOrders } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders/assigned"],
    enabled: !!user,
  });

  // Get active time entry
  const activeTimeEntry = timeEntries?.find(entry => entry.isActive);

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Unauthorized</div>;

  // Calculate total hours based on filter
  const today = new Date().toDateString();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 }); // Saturday

  const filteredEntries = timeEntries?.filter(entry => {
    const entryDate = new Date(entry.startTime);
    if (timeFilter === 'day') {
      return entryDate.toDateString() === today;
    } else {
      return entryDate >= weekStart && entryDate <= weekEnd;
    }
  }) || [];

  const totalHours = filteredEntries.reduce((total, entry) => {
    const start = new Date(entry.startTime);
    const end = entry.endTime ? new Date(entry.endTime) : new Date();
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return total + hours;
  }, 0);

  // Helper function to get work order title
  const getWorkOrderTitle = (workOrderId: string | null) => {
    if (!workOrderId) return 'No Work Order';
    const workOrder = workOrders?.find(wo => wo.id === workOrderId);
    return workOrder?.title || `Work Order #${workOrderId}`;
  };

  // Group entries by work order for better display
  const entriesByWorkOrder = filteredEntries.reduce((acc, entry) => {
    const key = entry.workOrderId || 'no-work-order';
    if (!acc[key]) {
      acc[key] = {
        workOrderId: entry.workOrderId,
        title: getWorkOrderTitle(entry.workOrderId),
        entries: [],
        totalHours: 0
      };
    }
    acc[key].entries.push(entry);
    
    const start = new Date(entry.startTime);
    const end = entry.endTime ? new Date(entry.endTime) : new Date();
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    acc[key].totalHours += hours;
    
    return acc;
  }, {} as Record<string, { workOrderId: string | null; title: string; entries: TimeEntry[]; totalHours: number }>);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center gap-2">
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
              >
                <Home className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Time Tracking</h1>
            <p className="text-muted-foreground mt-2">Track your work hours and manage time entries</p>
          </div>
        </div>

        {/* Time Tracker Component */}
        <div className="mb-8">
          <TimeTracker activeTimeEntry={activeTimeEntry} />
        </div>

        {/* Time Filter and Summary */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Time Summary</h2>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={timeFilter} onValueChange={(value: 'day' | 'week') => setTimeFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {timeFilter === 'day' ? "Today's Hours" : "This Week's Hours"}
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
                <p className="text-xs text-muted-foreground">
                  {filteredEntries.length} session{filteredEntries.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Work Orders</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(entriesByWorkOrder).length}</div>
                <p className="text-xs text-muted-foreground">
                  Active {timeFilter === 'day' ? 'today' : 'this week'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Status</CardTitle>
                <div className={`h-3 w-3 rounded-full ${activeTimeEntry ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {activeTimeEntry ? 'Active' : 'Inactive'}
                </div>
                <p className="text-xs text-muted-foreground">
                {activeTimeEntry ? 'Currently tracking time' : 'Not tracking time'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Work Order Breakdown */}
        {Object.keys(entriesByWorkOrder).length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-6">Work Order Breakdown</h2>
            <div className="space-y-4">
              {Object.values(entriesByWorkOrder).map((group) => (
                <Card key={group.workOrderId || 'no-work-order'}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{group.title}</CardTitle>
                      <Badge variant="secondary">
                        {group.totalHours.toFixed(1)}h total
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {group.entries.map((entry) => {
                        const start = new Date(entry.startTime);
                        const end = entry.endTime ? new Date(entry.endTime) : new Date();
                        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                        
                        return (
                          <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${entry.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                              <div>
                                <div className="font-medium">
                                  {format(start, "MMM d, yyyy 'at' h:mm a")}
                                  {entry.endTime && ` - ${format(end, "h:mm a")}`}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {entry.isActive ? 'Currently active' : `${hours.toFixed(1)} hours`}
                                </div>
                              </div>
                            </div>
                            <Badge variant={entry.isActive ? "default" : "secondary"}>
                              {entry.isActive ? 'Active' : 'Completed'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Time Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Time Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {entriesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            ) : timeEntries && timeEntries.length > 0 ? (
              <div className="space-y-4">
                {timeEntries
                  .slice(0, 10)
                  .map((entry) => {
                    const start = new Date(entry.startTime);
                    const end = entry.endTime ? new Date(entry.endTime) : null;
                    const duration = end 
                      ? ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(1)
                      : 'Active';

                    return (
                      <div key={entry.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="flex flex-col">
                            <div className="font-medium">
                              {format(start, 'MMM dd, yyyy')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Started: {format(start, 'h:mm a')}
                              {end && ` • Ended: ${format(end, 'h:mm a')}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={entry.isActive ? "default" : "secondary"}>
                            {entry.isActive ? 'Active' : `${duration}h`}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No time entries found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start tracking time to see your entries here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}