import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, MapPin, AlertTriangle, User, Calendar, Plus, UserPlus, Home } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/navigation";
import WorkOrderForm from "@/components/work-order-form";
import RatingSystem from "@/components/rating-system";
import WorkOrderCardPopup from "@/components/work-order-card-popup";
import { useRatingTrigger } from "@/hooks/useRatingTrigger";

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  location: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: string;
  workStatus?: string;
  dueDate?: string;
  assigneeId?: string;
  assignee?: {
    firstName: string;
    lastName: string;
  };
  createdBy?: {
    firstName: string;
    lastName: string;
  };
  isClientCreated: boolean;
  requestStatus?: string;
  createdAt: string;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "confirmed": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "in_progress": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    case "completed": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
};

const getRequestStatusColor = (status?: string) => {
  if (!status) return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  switch (status) {
    case "pending_request": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "request_sent": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "request_accepted": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "request_declined": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
};

export default function ClientWorkOrders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);

  // Fetch client's work orders
  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/client/work-orders"],
    retry: false,
    meta: {
      // Provide demo data when API fails (for role testing)
      demoData: [
        {
          id: "demo-order-1",
          title: "Network Infrastructure Upgrade",
          description: "Upgrade office network to support new equipment and improve connectivity speeds",
          location: "Seattle Office - Building A, Floor 3",
          priority: "high",
          status: "pending",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          isClientCreated: true,
          requestStatus: "pending_request",
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "demo-order-2",
          title: "Server Maintenance",
          description: "Quarterly server maintenance, updates, and performance optimization",
          location: "Data Center - Rack 15",
          priority: "medium",
          status: "confirmed",
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          assigneeId: "demo-agent-1",
          assignee: {
            firstName: "Alex",
            lastName: "Johnson"
          },
          isClientCreated: true,
          requestStatus: "request_accepted",
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "demo-order-3",
          title: "Printer Setup and Configuration",
          description: "Install and configure new multifunction printers across office floors",
          location: "Main Office - All Floors",
          priority: "low",
          status: "in_progress",
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          assigneeId: "demo-agent-2",
          assignee: {
            firstName: "Sarah",
            lastName: "Wilson"
          },
          isClientCreated: true,
          requestStatus: "request_accepted",
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    }
  });

  // Rating trigger hook
  const { ratingTrigger, closeRatingDialog, isRatingDialogOpen } = useRatingTrigger({
    workOrders: workOrders || []
  });

  // Filter work orders to show only relevant ones for clients
  const filteredWorkOrders = workOrders.filter(order => 
    order.isClientCreated && (
      // Show pending work orders waiting for assignment
      order.status === "pending" ||
      // Show assigned work orders
      order.assigneeId ||
      // Show work orders with active request status
      order.requestStatus
    )
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation testingRole="client" />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation testingRole="client" />
      
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Work Orders</h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Track your submitted work order requests and assignments</p>
            </div>
          </div>
          
          {/* Create Work Order Button */}
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Create Work Order
          </Button>
        </div>

        {/* Work Orders List */}
        {filteredWorkOrders.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent>
              <div className="text-gray-400 mb-4">
                <AlertTriangle className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Work Orders Found
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                You haven't created any work orders yet. Create your first work order from the dashboard.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredWorkOrders.map((order) => (
              <Card 
                key={order.id} 
                className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => setSelectedWorkOrder(order)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {order.title}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className={getPriorityColor(order.priority)} variant="secondary">
                          {order.priority.toUpperCase()}
                        </Badge>
                        <Badge className={getStatusColor(order.status)} variant="secondary">
                          {order.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {order.requestStatus && (
                          <Badge className={getRequestStatusColor(order.requestStatus)} variant="secondary">
                            {order.requestStatus.replace('_', ' ').toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Assignment Status Indicator */}
                    <div className="flex items-center gap-2 ml-4">
                      {order.assignee ? (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                          <User className="h-4 w-4" />
                          <span className="hidden sm:inline">{order.assignee.firstName} {order.assignee.lastName}</span>
                          <span className="sm:hidden">Assigned</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                          <UserPlus className="h-4 w-4" />
                          <span className="hidden sm:inline">Unassigned</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                    {order.description}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{order.location}</span>
                    </div>
                    
                    {order.dueDate && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Calendar className="h-4 w-4" />
                        <span>Due: {new Date(order.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <Clock className="h-4 w-4" />
                      <span>Created: {new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Status Information */}
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {order.status === "pending" && !order.assigneeId && (
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        📋 Your work order is pending assignment. Our team will review and assign a field agent soon.
                      </p>
                    )}
                    {order.requestStatus === "request_sent" && (
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        📤 Assignment request sent to field agent. Waiting for acceptance.
                      </p>
                    )}
                    {order.requestStatus === "request_accepted" && order.assignee && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        ✅ Work order accepted by {order.assignee.firstName} {order.assignee.lastName}. Work will begin as scheduled.
                      </p>
                    )}
                    {order.requestStatus === "request_declined" && (
                      <p className="text-sm text-orange-600 dark:text-orange-400">
                        ⏳ Assignment request was declined. Our team is finding an alternative field agent.
                      </p>
                    )}
                    {order.status === "in_progress" && (
                      <p className="text-sm text-orange-600 dark:text-orange-400">
                        🔧 Work is currently in progress. Your assigned agent is working on this request.
                      </p>
                    )}
                    {order.status === "completed" && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        ✅ Work order completed successfully. Thank you for using our services!
                      </p>
                    )}
                  </div>

                  {/* Click to view details hint */}
                  <div className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                    Click to view details and edit
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Work Order Creation Dialog */}
        {isCreateDialogOpen && (
          <WorkOrderForm 
            isClient={true}
            onClose={() => setIsCreateDialogOpen(false)}
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              // Refresh work orders list - the query will automatically refetch
            }}
          />
        )}

        {/* Work Order Details Popup */}
        {selectedWorkOrder && (
          <WorkOrderCardPopup
            workOrder={selectedWorkOrder}
            isOpen={true}
            onClose={() => setSelectedWorkOrder(null)}
            onUpdate={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/client/work-orders"] });
              setSelectedWorkOrder(null);
            }}
            canEdit={true}
            isClient={true}
          />
        )}

        {/* Rating System Dialog */}
        {ratingTrigger && (
          <RatingSystem
            workOrder={ratingTrigger.workOrder}
            isOpen={isRatingDialogOpen}
            onClose={closeRatingDialog}
          />
        )}
      </div>
    </div>
  );
}