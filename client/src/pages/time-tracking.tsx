import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TimeTracker from "@/components/time-tracker";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

interface TimeEntry {
  id: string;
  userId: string;
  workOrderId: string | null;
  startTime: string;
  endTime: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function TimeTracking() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();

  // Get all time entries for the current user
  const { data: timeEntries, isLoading: entriesLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries"],
    enabled: !!user,
  });

  // Get active time entry
  const activeTimeEntry = timeEntries?.find(entry => entry.isActive);

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Unauthorized</div>;

  // Calculate total hours for today
  const today = new Date().toDateString();
  const todayEntries = timeEntries?.filter(entry => 
    new Date(entry.startTime).toDateString() === today
  ) || [];

  const totalHoursToday = todayEntries.reduce((total, entry) => {
    const start = new Date(entry.startTime);
    const end = entry.endTime ? new Date(entry.endTime) : new Date();
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return total + hours;
  }, 0);

  // Calculate total hours this week
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const weekEntries = timeEntries?.filter(entry => 
    new Date(entry.startTime) >= startOfWeek
  ) || [];

  const totalHoursWeek = weekEntries.reduce((total, entry) => {
    const start = new Date(entry.startTime);
    const end = entry.endTime ? new Date(entry.endTime) : new Date();
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return total + hours;
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHoursToday.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">
                {todayEntries.length} session{todayEntries.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHoursWeek.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">
                {weekEntries.length} session{weekEntries.length !== 1 ? 's' : ''}
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