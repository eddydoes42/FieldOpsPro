import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/navigation";
import { useState, useMemo } from "react";
import { format, eachDayOfInterval, isSameDay, addWeeks, subWeeks, startOfWeek, endOfWeek, isToday, isSameWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  estimatedHours: number | null;
  createdAt: string;
  dueDate: string | null;
  scopeOfWork: string | null;
  requiredTools: string | null;
  pointOfContact: string | null;
  budgetType?: string | null;
  budgetAmount?: string | null;
  devicesInstalled?: number | null;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function Calendar() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterAgent, setFilterAgent] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [isWorkOrderDialogOpen, setIsWorkOrderDialogOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);

  // Queries
  const { data: workOrders, isLoading: ordersLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
    retry: false,
  });

  const { data: fieldAgents } = useQuery<User[]>({
    queryKey: ["/api/users/role/field_agent"],
    retry: false,
  });

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Unauthorized</div>;

  const userRole = (user as any)?.role;
  const isFieldAgent = userRole === 'field_agent';
  const canViewAllOrders = ['administrator', 'manager', 'dispatcher'].includes(userRole);

  // Filter work orders based on role and filters
  const filteredWorkOrders = useMemo(() => {
    if (!workOrders) return [];

    return workOrders.filter(order => {
      // Role-based filtering
      if (isFieldAgent && order.assigneeId !== (user as any)?.id) {
        return false;
      }

      // Additional filters (only for non-field agents)
      if (canViewAllOrders) {
        if (filterAgent !== 'all' && order.assigneeId !== filterAgent) return false;
        if (filterStatus !== 'all' && order.status !== filterStatus) return false;
        if (filterPriority !== 'all' && order.priority !== filterPriority) return false;
      }

      // Only include orders with due dates
      return !!order.dueDate;
    });
  }, [workOrders, userRole, user, filterAgent, filterStatus, filterPriority, isFieldAgent, canViewAllOrders]);

  // Weekly calendar calculations
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const calendarDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Get work orders for a specific date
  const getWorkOrdersForDate = (date: Date) => {
    return filteredWorkOrders.filter(order => 
      order.dueDate && isSameDay(new Date(order.dueDate), date)
    );
  };

  // Get agent name
  const getAgentName = (agentId: string | null) => {
    if (!agentId) return 'Unassigned';
    const agent = fieldAgents?.find(a => a.id === agentId);
    return agent ? `${agent.firstName} ${agent.lastName}` : 'Unknown Agent';
  };

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  // Priority color mapping
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handlePrevWeek = () => {
    setCurrentDate(subWeeks(currentDate, 1));
  };

  const handleNextWeek = () => {
    setCurrentDate(addWeeks(currentDate, 1));
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleWorkOrderClick = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setIsWorkOrderDialogOpen(true);
  };

  if (ordersLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation userRole={userRole} />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading calendar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={userRole} />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setLocation('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Work Order Calendar</h1>
            </div>
          </div>
        </div>

        {/* Filters - Only show for admins, managers, and dispatchers */}
        {canViewAllOrders && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center space-x-2">
                  <Label>Agent:</Label>
                  <Select value={filterAgent} onValueChange={setFilterAgent}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {fieldAgents?.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.firstName} {agent.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Label>Status:</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Label>Priority:</Label>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                  Showing {filteredWorkOrders.length} work orders
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">
                Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Weekly Calendar Grid - Simplified for readability */}
            <div className="grid grid-cols-7 gap-1 bg-muted/20 p-2 rounded-lg">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground bg-muted/30 rounded-t-lg">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {calendarDays.map(date => {
                const dayOrders = getWorkOrdersForDate(date);
                const isTodayDate = isToday(date);
                const isSelected = selectedDate && isSameDay(date, selectedDate);

                return (
                  <div
                    key={date.toISOString()}
                    className={`
                      min-h-40 p-2 border border-border rounded-b-lg cursor-pointer transition-colors bg-card
                      ${isTodayDate ? 'ring-1 ring-primary bg-primary/5' : ''}
                      ${isSelected ? 'bg-accent' : ''}
                      hover:bg-accent/50
                    `}
                    onClick={() => handleDateClick(date)}
                  >
                    <div className="text-center mb-2 pb-1 border-b border-border/30">
                      <span className="text-lg font-semibold text-foreground">{format(date, 'd')}</span>
                    </div>
                    
                    {/* Work orders for this date */}
                    <div className="space-y-1">
                      {dayOrders.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          No orders
                        </div>
                      ) : (
                        <>
                          {dayOrders.slice(0, 2).map(order => (
                            <div
                              key={order.id}
                              className="text-xs px-2 py-1 rounded-sm cursor-pointer bg-primary/10 hover:bg-primary/20 border-l-2 border-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWorkOrderClick(order);
                              }}
                            >
                              <div className="font-medium text-foreground truncate leading-tight">
                                {order.title.length > 15 ? order.title.substring(0, 15) + '...' : order.title}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {order.status.replace('_', ' ')}
                                {canViewAllOrders && order.assigneeId && (
                                  <span className="ml-1">• {getAgentName(order.assigneeId)?.split(' ')[0]}</span>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {dayOrders.length > 2 && (
                            <div 
                              className="text-xs text-center py-1 text-muted-foreground bg-muted/30 rounded-sm cursor-pointer hover:bg-muted/50"
                              onClick={() => handleDateClick(date)}
                            >
                              +{dayOrders.length - 2} more
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        {selectedDate && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>
                Work Orders for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getWorkOrdersForDate(selectedDate).length === 0 ? (
                <p className="text-muted-foreground">No work orders scheduled for this date.</p>
              ) : (
                <div className="space-y-3">
                  {getWorkOrdersForDate(selectedDate).map(order => (
                    <div
                      key={order.id}
                      className="p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleWorkOrderClick(order)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{order.title}</h3>
                            <div className={`w-3 h-3 rounded-full ${getPriorityColor(order.priority)}`} />
                            <Badge className={getStatusColor(order.status)}>
                              {order.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{order.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {canViewAllOrders && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {getAgentName(order.assigneeId)}
                              </div>
                            )}
                            {order.estimatedHours && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {order.estimatedHours}h estimated
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
        )}

        {/* Work Order Details Dialog */}
        <Dialog open={isWorkOrderDialogOpen} onOpenChange={setIsWorkOrderDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Work Order Details</DialogTitle>
            </DialogHeader>
            {selectedWorkOrder && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium">{selectedWorkOrder.title}</h3>
                  <div className={`w-3 h-3 rounded-full ${getPriorityColor(selectedWorkOrder.priority)}`} />
                  <Badge className={getStatusColor(selectedWorkOrder.status)}>
                    {selectedWorkOrder.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-sm text-muted-foreground mt-1">{selectedWorkOrder.description}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Due Date</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedWorkOrder.dueDate ? format(new Date(selectedWorkOrder.dueDate), 'PPP') : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Assigned To</Label>
                    <p className="text-sm text-muted-foreground mt-1">{getAgentName(selectedWorkOrder.assigneeId)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <p className="text-sm text-muted-foreground mt-1 capitalize">{selectedWorkOrder.priority}</p>
                  </div>
                  {selectedWorkOrder.estimatedHours && (
                    <div>
                      <Label className="text-sm font-medium">Estimated Hours</Label>
                      <p className="text-sm text-muted-foreground mt-1">{selectedWorkOrder.estimatedHours}h</p>
                    </div>
                  )}
                  {selectedWorkOrder.pointOfContact && (
                    <div>
                      <Label className="text-sm font-medium">Point of Contact</Label>
                      <p className="text-sm text-muted-foreground mt-1">{selectedWorkOrder.pointOfContact}</p>
                    </div>
                  )}
                </div>
                
                {selectedWorkOrder.scopeOfWork && (
                  <div>
                    <Label className="text-sm font-medium">Scope of Work</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{selectedWorkOrder.scopeOfWork}</p>
                  </div>
                )}
                
                {selectedWorkOrder.requiredTools && (
                  <div>
                    <Label className="text-sm font-medium">Required Tools</Label>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{selectedWorkOrder.requiredTools}</p>
                  </div>
                )}
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsWorkOrderDialogOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setIsWorkOrderDialogOpen(false);
                    setLocation('/work-orders');
                  }}>
                    View in Work Orders
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}