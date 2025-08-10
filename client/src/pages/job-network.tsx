import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Building2, Calendar, Clock, DollarSign, MapPin, User, Users, AlertCircle, CheckCircle, Send, ArrowLeft, Home } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { canViewJobNetwork, hasAnyRole } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  location: string;
  priority: string;
  status: string;
  dueDate: string;
  isClientCreated: boolean;
  budgetType?: string;
  budgetAmount?: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    clientCompanyName?: string;
  };
  requestStatus?: string;
  requestedAgent?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface FieldAgent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export default function JobNetwork() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [requestNotes, setRequestNotes] = useState("");
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);

  // Check if user can request assignments (service company roles only)
  const canRequestAssignment = hasAnyRole(user as any, ['administrator', 'manager', 'dispatcher']);

  // Access is already checked in App.tsx routing, so we can remove this duplicate check

  // Fetch client-created work orders
  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/job-network/work-orders"],
    retry: false,
  });

  // Fetch available field agents
  const { data: fieldAgents = [] } = useQuery<FieldAgent[]>({
    queryKey: ["/api/users/field-agents"],
    retry: false,
  });

  // Request work order assignment mutation
  const requestAssignmentMutation = useMutation({
    mutationFn: async (data: { workOrderId: string; agentId: string; notes: string }) => {
      return apiRequest("POST", "/api/job-network/request-assignment", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-network/work-orders"] });
      setIsRequestDialogOpen(false);
      setSelectedWorkOrder(null);
      setSelectedAgent("");
      setRequestNotes("");
    },
  });

  const handleRequestAssignment = () => {
    if (selectedWorkOrder && selectedAgent) {
      requestAssignmentMutation.mutate({
        workOrderId: selectedWorkOrder.id,
        agentId: selectedAgent,
        notes: requestNotes,
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_request': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'request_sent': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'request_accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'request_declined': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Job Network
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review client-created work orders and assign them to field agents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Work Orders Grid */}
      {workOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Client Work Orders</h3>
            <p className="text-gray-600 text-center">
              Client-created work orders will appear here for assignment to field agents.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workOrders.map((workOrder) => (
            <Card key={workOrder.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg leading-tight">{workOrder.title}</CardTitle>
                  <Badge className={getPriorityColor(workOrder.priority)}>
                    {workOrder.priority.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Client Info */}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Building2 className="h-4 w-4" />
                  <span>
                    {workOrder.createdBy.clientCompanyName || 
                     `${workOrder.createdBy.firstName} ${workOrder.createdBy.lastName}`}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{workOrder.location}</span>
                </div>

                {/* Due Date */}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(workOrder.dueDate), 'MMM dd, yyyy')}</span>
                </div>

                {/* Budget */}
                {workOrder.budgetAmount && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <DollarSign className="h-4 w-4" />
                    <span>
                      {workOrder.budgetType === 'fixed' && `$${parseFloat(workOrder.budgetAmount).toLocaleString()}`}
                      {workOrder.budgetType === 'hourly' && `$${workOrder.budgetAmount}/hour`}
                      {workOrder.budgetType === 'per_device' && `$${workOrder.budgetAmount}/device`}
                    </span>
                  </div>
                )}

                <Separator />

                {/* Description */}
                <p className="text-sm text-gray-700 line-clamp-3">
                  {workOrder.description}
                </p>

                {/* Request Status */}
                {workOrder.requestStatus && (
                  <div className="flex items-center justify-between">
                    <Badge className={getStatusColor(workOrder.requestStatus)}>
                      {workOrder.requestStatus.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {workOrder.requestedAgent && (
                      <div className="flex items-center space-x-1 text-xs text-gray-600">
                        <User className="h-3 w-3" />
                        <span>{workOrder.requestedAgent.firstName} {workOrder.requestedAgent.lastName}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Button - Only for service company roles */}
                {canRequestAssignment && (
                  <Dialog open={isRequestDialogOpen && selectedWorkOrder?.id === workOrder.id} 
                         onOpenChange={(open) => {
                           setIsRequestDialogOpen(open);
                           if (!open) {
                             setSelectedWorkOrder(null);
                             setSelectedAgent("");
                             setRequestNotes("");
                           }
                         }}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full"
                        disabled={workOrder.requestStatus === 'request_sent' || workOrder.requestStatus === 'request_accepted'}
                        onClick={() => setSelectedWorkOrder(workOrder)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {workOrder.requestStatus ? 'View Request' : 'Request Assignment'}
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Request Field Agent Assignment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Work Order: {workOrder.title}</h4>
                        <p className="text-sm text-gray-600">{workOrder.description}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Select Field Agent</label>
                        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a field agent" />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldAgents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.firstName} {agent.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Request Notes (Optional)</label>
                        <Textarea 
                          placeholder="Add any notes for the client about this assignment request..."
                          value={requestNotes}
                          onChange={(e) => setRequestNotes(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleRequestAssignment}
                          disabled={!selectedAgent || requestAssignmentMutation.isPending}
                        >
                          {requestAssignmentMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              Send Request
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}