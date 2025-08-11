import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { Home, Clock, MapPin, Calendar, Users, AlertTriangle, FileText, CheckCircle, Settings } from "lucide-react";
import { useLocation } from "wouter";
import Navigation from "@/components/navigation";
import { WorkOrder, WorkOrderRequest, hasRole, isAdminTeam } from "../../../shared/schema";

interface MyWorkProps {
  user?: any;
}

export default function MyWork({ user: propsUser }: MyWorkProps) {
  const [, setLocation] = useLocation();
  const { user: authUser } = useAuth();
  const user = propsUser || authUser;

  const { data: workOrders = [] } = useQuery<WorkOrder[]>({
    queryKey: ['/api/work-orders'],
  });

  // Query work order requests for client companies
  const { data: workOrderRequests = [] } = useQuery<WorkOrderRequest[]>({
    queryKey: ['/api/work-order-requests/client', user?.companyId],
    enabled: !!user?.companyId && hasRole(user, 'client'),
  });

  // Determine what work orders to show based on user role
  const getRelevantWorkOrders = () => {
    if (hasRole(user, 'field_agent')) {
      // Field agents see only their assigned work orders
      return workOrders.filter(order => order.assigneeId === user?.id);
    } else if (isAdminTeam(user) || hasRole(user, 'client')) {
      // Admin team and clients see company work orders
      return workOrders.filter(order => order.companyId === user?.companyId);
    }
    return [];
  };

  const myWorkOrders = getRelevantWorkOrders();

  // Categorize work orders for clients and admin teams
  const categorizeWorkOrders = () => {
    const created = myWorkOrders.filter(order => order.createdById === user?.id);
    const assigned = myWorkOrders.filter(order => order.assigneeId && order.status !== 'completed' && order.status !== 'cancelled');
    const inProgress = myWorkOrders.filter(order => order.status === 'in_progress');
    const pending = myWorkOrders.filter(order => order.status === 'pending' || order.status === 'scheduled');
    const requested = workOrderRequests.filter(request => request.status === 'pending');

    return { created, assigned, inProgress, pending, requested };
  };

  const { created, assigned, inProgress, pending, requested } = categorizeWorkOrders();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300';
      case 'pending': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getRequestStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300';
      case 'declined': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'low': return <AlertTriangle className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Work Order Card Component
  const WorkOrderCard = ({ order }: { order: WorkOrder }) => (
    <Card className="hover:shadow-lg transition-shadow border-2 dark:border-gray-700 dark:bg-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            {order.title}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {getPriorityIcon(order.priority)}
            <Badge className={getStatusColor(order.status)}>
              {order.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
          {order.description}
        </p>
        
        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Due: {formatDate(order.scheduledDate)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>{order.location}</span>
          </div>
          {order.assignedAgent && (
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Assigned to: {order.assignedAgent.firstName} {order.assignedAgent.lastName}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Work Order Request Card Component
  const WorkOrderRequestCard = ({ request }: { request: WorkOrderRequest }) => (
    <Card className="hover:shadow-lg transition-shadow border-2 dark:border-gray-700 dark:bg-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Request from {request.requestingCompany?.name}
          </CardTitle>
          <Badge className={getRequestStatusColor(request.status)}>
            {request.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Work Order Title:</p>
            <p className="text-gray-600 dark:text-gray-300">{request.workOrderTitle}</p>
          </div>
          {request.message && (
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Message:</p>
              <p className="text-gray-600 dark:text-gray-300">{request.message}</p>
            </div>
          )}
          {request.proposedAgent && (
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Proposed Agent:</p>
              <p className="text-gray-600 dark:text-gray-300">
                {request.proposedAgent.firstName} {request.proposedAgent.lastName}
              </p>
            </div>
          )}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span>Requested: {formatDate(request.createdAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/dashboard')}
              className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
            >
              <Home className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {hasRole(user, 'field_agent') ? 'My Work Orders' : 'Work Management'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {hasRole(user, 'field_agent') 
                  ? 'Work orders assigned to you'
                  : hasRole(user, 'client')
                  ? 'Your work orders and requests'
                  : 'Manage work orders and assignments'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{myWorkOrders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-300" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {myWorkOrders.filter(order => order.status === 'in_progress').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Scheduled</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {myWorkOrders.filter(order => order.status === 'scheduled').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {hasRole(user, 'client') && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <FileText className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Requests</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{requested.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Content */}
        {hasRole(user, 'field_agent') ? (
          // Simple list view for field agents
          <div className="space-y-6">
            {myWorkOrders.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-gray-400 dark:text-gray-600 mb-4">
                    <FileText className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Work Orders Assigned
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    You don't have any work orders assigned to you at the moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myWorkOrders.map((order) => (
                  <WorkOrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Tab view for clients and admin teams
          <Tabs defaultValue="created" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <TabsTrigger value="created" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Created ({created.length})</span>
              </TabsTrigger>
              <TabsTrigger value="assigned" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Assigned ({assigned.length})</span>
              </TabsTrigger>
              <TabsTrigger value="in-progress" className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>In Progress ({inProgress.length})</span>
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Pending ({pending.length})</span>
              </TabsTrigger>
              {hasRole(user, 'client') && (
                <TabsTrigger value="requested" className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Requested ({requested.length})</span>
                </TabsTrigger>
              )}
            </TabsList>

            {/* Created Work Orders */}
            <TabsContent value="created" className="space-y-6">
              {created.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="text-gray-400 dark:text-gray-600 mb-4">
                      <FileText className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Created Work Orders
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      You haven't created any work orders yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {created.map((order) => (
                    <WorkOrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Assigned Work Orders */}
            <TabsContent value="assigned" className="space-y-6">
              {assigned.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="text-gray-400 dark:text-gray-600 mb-4">
                      <Users className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Assigned Work Orders
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      No work orders have been assigned to agents yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {assigned.map((order) => (
                    <WorkOrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* In Progress Work Orders */}
            <TabsContent value="in-progress" className="space-y-6">
              {inProgress.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="text-gray-400 dark:text-gray-600 mb-4">
                      <Clock className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Work Orders In Progress
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      No work orders are currently being worked on.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inProgress.map((order) => (
                    <WorkOrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Pending Work Orders */}
            <TabsContent value="pending" className="space-y-6">
              {pending.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="text-gray-400 dark:text-gray-600 mb-4">
                      <AlertTriangle className="h-12 w-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Pending Work Orders
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      No work orders are pending or scheduled.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pending.map((order) => (
                    <WorkOrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Requested Work Orders (Client only) */}
            {hasRole(user, 'client') && (
              <TabsContent value="requested" className="space-y-6">
                {requested.length === 0 ? (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <div className="text-gray-400 dark:text-gray-600 mb-4">
                        <Settings className="h-12 w-12 mx-auto" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No Pending Requests
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        No service companies have requested to work on your job postings.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {requested.map((request) => (
                      <WorkOrderRequestCard key={request.id} request={request} />
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
}