import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar, MapPin, DollarSign, User, Star, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/navigation";

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  location: string;
  priority: string;
  status: string;
  dueDate: string;
  budgetType?: string;
  budgetAmount?: string;
  requestStatus?: string;
  requestedAgent?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface AgentPerformance {
  id: string;
  agentId: string;
  agent: {
    firstName: string;
    lastName: string;
  };
  workOrderId: string;
  completionSuccess: boolean;
  timeliness: string;
  issuesReported: number;
  clientRating?: number;
  clientFeedback?: string;
  createdAt: string;
}

interface AssignmentRequest {
  id: string;
  workOrderId: string;
  workOrder: {
    title: string;
    description: string;
  };
  requestedAgent: {
    id: string;
    firstName: string;
    lastName: string;
  };
  requestedBy: {
    firstName: string;
    lastName: string;
  };
  requestedAt: string;
  performance: AgentPerformance[];
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedRequest, setSelectedRequest] = useState<AssignmentRequest | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [responseNotes, setResponseNotes] = useState("");

  // Fetch client's work orders - with demo data for testing
  const { data: workOrders = [], isLoading: ordersLoading } = useQuery<WorkOrder[]>({
    queryKey: ["/api/client/work-orders"],
    retry: false,
    meta: {
      // Provide demo data when API fails (for role testing)
      demoData: [
        {
          id: "demo-order-1",
          title: "Network Infrastructure Upgrade",
          description: "Upgrade office network to support new equipment",
          location: "Seattle Office - Building A",
          priority: "high",
          status: "request_sent",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          budgetType: "fixed",
          budgetAmount: "$2,500",
          requestStatus: "request_sent",
          requestedAgent: {
            id: "demo-agent-1",
            firstName: "Alex",
            lastName: "Johnson"
          }
        },
        {
          id: "demo-order-2",
          title: "Server Maintenance",
          description: "Quarterly server maintenance and updates",
          location: "Data Center - Rack 15",
          priority: "medium",
          status: "pending_request",
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          budgetType: "hourly",
          budgetAmount: "$85/hr"
        }
      ]
    }
  });

  // Fetch pending assignment requests - with demo data for testing
  const { data: requests = [], isLoading: requestsLoading } = useQuery<AssignmentRequest[]>({
    queryKey: ["/api/client/assignment-requests"],
    retry: false,
    meta: {
      // Provide demo data when API fails (for role testing)
      demoData: [
        {
          id: "demo-request-1",
          workOrderId: "demo-order-1",
          workOrder: {
            title: "Network Infrastructure Upgrade",
            description: "Upgrade office network to support new equipment"
          },
          requestedAgent: {
            id: "demo-agent-1",
            firstName: "Alex",
            lastName: "Johnson"
          },
          requestedAt: new Date().toISOString(),
          performance: [
            {
              id: "demo-perf-1",
              agentId: "demo-agent-1",
              agent: {
                firstName: "Alex",
                lastName: "Johnson"
              },
              workOrderId: "past-order-1",
              completionSuccess: true,
              timeliness: "on_time",
              issuesReported: 0,
              clientRating: 5,
              clientFeedback: "Excellent work, very professional",
              createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
            }
          ]
        }
      ]
    }
  });

  // Respond to assignment request mutation
  const respondToRequestMutation = useMutation({
    mutationFn: async (data: { requestId: string; action: 'accept' | 'decline'; notes: string }) => {
      const response = await fetch("/api/client/respond-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to respond to request");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/assignment-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/work-orders"] });
      setIsReviewDialogOpen(false);
      setSelectedRequest(null);
      setResponseNotes("");
    },
  });

  const handleRespondToRequest = (action: 'accept' | 'decline') => {
    if (selectedRequest) {
      respondToRequestMutation.mutate({
        requestId: selectedRequest.id,
        action,
        notes: responseNotes,
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

  const getRequestStatusColor = (status: string) => {
    switch (status) {
      case 'pending_request': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'request_sent': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'request_accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'request_declined': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTimelinessColor = (timeliness: string) => {
    switch (timeliness) {
      case 'early': return 'text-green-600';
      case 'on_time': return 'text-blue-600';
      case 'late': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div>
      <Navigation testingRole="client" />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Client Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome, {(user as any)?.firstName} {(user as any)?.lastName}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Assignment Requests - Priority Column */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Assignment Requests
          </h2>
          
          {requestsLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <User className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 text-center">
                  No assignment requests pending
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">{request.workOrder.title}</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>
                          {request.requestedAgent.firstName} {request.requestedAgent.lastName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>{format(new Date(request.requestedAt), 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => {
                        setSelectedRequest(request);
                        setIsReviewDialogOpen(true);
                      }}
                    >
                      Review Request
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Work Orders - Main Content */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            My Work Orders
          </h2>
          
          {ordersLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          ) : workOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Plus className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Work Orders</h3>
                <p className="text-gray-600 text-center mb-4">
                  Create your first work order to get started
                </p>
                <Link href="/client/work-orders">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    View Work Orders
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {workOrders.map((workOrder) => (
                <Card key={workOrder.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{workOrder.title}</CardTitle>
                      <div className="flex space-x-2">
                        <Badge className={getPriorityColor(workOrder.priority)}>
                          {workOrder.priority.toUpperCase()}
                        </Badge>
                        {workOrder.requestStatus && (
                          <Badge className={getRequestStatusColor(workOrder.requestStatus)}>
                            {workOrder.requestStatus.replace('_', ' ').toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-gray-700">{workOrder.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{workOrder.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(workOrder.dueDate), 'MMM dd, yyyy')}</span>
                      </div>
                      {workOrder.budgetAmount && (
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4" />
                          <span>
                            {workOrder.budgetType === 'fixed' && `$${parseFloat(workOrder.budgetAmount).toLocaleString()}`}
                            {workOrder.budgetType === 'hourly' && `$${workOrder.budgetAmount}/hour`}
                            {workOrder.budgetType === 'per_device' && `$${workOrder.budgetAmount}/device`}
                          </span>
                        </div>
                      )}
                    </div>

                    {workOrder.requestedAgent && (
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              Requested: {workOrder.requestedAgent.firstName} {workOrder.requestedAgent.lastName}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assignment Request Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={(open) => {
        setIsReviewDialogOpen(open);
        if (!open) {
          setSelectedRequest(null);
          setResponseNotes("");
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Assignment Request</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              {/* Work Order Details */}
              <div>
                <h4 className="font-medium mb-2">Work Order: {selectedRequest.workOrder.title}</h4>
                <p className="text-sm text-gray-600">{selectedRequest.workOrder.description}</p>
              </div>

              {/* Requested Agent */}
              <div>
                <h4 className="font-medium mb-2">Requested Field Agent</h4>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{selectedRequest.requestedAgent.firstName} {selectedRequest.requestedAgent.lastName}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Requested by {selectedRequest.requestedBy.firstName} {selectedRequest.requestedBy.lastName} 
                  on {format(new Date(selectedRequest.requestedAt), 'MMM dd, yyyy')}
                </p>
              </div>

              {/* Agent Performance History */}
              <div>
                <h4 className="font-medium mb-3">Agent Performance History</h4>
                {selectedRequest.performance.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No previous work history available</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedRequest.performance.map((perf) => (
                      <Card key={perf.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {perf.completionSuccess ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-sm font-medium">
                              {perf.completionSuccess ? 'Successful' : 'Issues Reported'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {format(new Date(perf.createdAt), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center justify-between">
                            <span>Timeliness:</span>
                            <span className={`font-medium ${getTimelinessColor(perf.timeliness)}`}>
                              {perf.timeliness.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Issues Reported:</span>
                            <span className={perf.issuesReported > 0 ? 'text-red-600' : 'text-green-600'}>
                              {perf.issuesReported}
                            </span>
                          </div>
                          {perf.clientRating && (
                            <div className="flex items-center justify-between">
                              <span>Client Rating:</span>
                              <div className="flex items-center space-x-1">
                                {renderStars(perf.clientRating)}
                                <span className="text-xs text-gray-500 ml-1">
                                  ({perf.clientRating}/5)
                                </span>
                              </div>
                            </div>
                          )}
                          {perf.clientFeedback && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                              <strong>Previous Feedback:</strong> {perf.clientFeedback}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Response Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Response Notes (Optional)
                </label>
                <Textarea 
                  placeholder="Add any notes about your decision..."
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsReviewDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleRespondToRequest('decline')}
                  disabled={respondToRequestMutation.isPending}
                >
                  {respondToRequestMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => handleRespondToRequest('accept')}
                  disabled={respondToRequestMutation.isPending}
                >
                  {respondToRequestMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept
                    </>
                  )}
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