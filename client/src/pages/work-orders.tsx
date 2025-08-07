import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import { useEffect, useState } from "react";

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
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface NewWorkOrderData {
  title: string;
  description: string;
  priority: string;
  assignedTo: string;
  estimatedHours: string;
  dueDate: string;
  scopeOfWork: string;
  requiredTools: string;
  pointOfContact: string;
}

export default function WorkOrders() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [newWorkOrder, setNewWorkOrder] = useState<NewWorkOrderData>({
    title: "",
    description: "",
    priority: "medium",
    assignedTo: "",
    estimatedHours: "",
    dueDate: "",
    scopeOfWork: "",
    requiredTools: "",
    pointOfContact: ""
  });

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

  const { data: workOrders, isLoading: ordersLoading, error: ordersError } = useQuery<WorkOrder[]>({
    queryKey: ["/api/work-orders"],
    retry: false,
  });

  const { data: fieldAgents, isLoading: agentsLoading } = useQuery<User[]>({
    queryKey: ["/api/users/role/field_agent"],
    retry: false,
  });

  const createWorkOrderMutation = useMutation({
    mutationFn: async (data: NewWorkOrderData) => {
      const workOrderData = {
        ...data,
        id: `wo-${Date.now()}`,
        status: 'pending',
        estimatedHours: data.estimatedHours ? parseInt(data.estimatedHours) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdAt: new Date(),
      };
      
      const response = await apiRequest('POST', '/api/work-orders', workOrderData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Work order created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      setIsCreateDialogOpen(false);
      setNewWorkOrder({
        title: "",
        description: "",
        priority: "medium",
        assignedTo: "",
        estimatedHours: "",
        dueDate: "",
        scopeOfWork: "",
        requiredTools: "",
        pointOfContact: ""
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
      toast({
        title: "Error",
        description: "Failed to create work order. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (ordersError && isUnauthorizedError(ordersError as Error)) {
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

  if (isLoading || ordersLoading || agentsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Navigation userRole={(user as any)?.role || 'manager'} />
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return 'Unassigned';
    const agent = fieldAgents?.find(a => a.id === agentId);
    return agent ? `${agent.firstName} ${agent.lastName}` : 'Unknown Agent';
  };

  const filteredWorkOrders = workOrders?.filter(order => {
    if (filterStatus !== 'all' && order.status !== filterStatus) return false;
    if (filterAssignee !== 'all' && order.assigneeId !== filterAssignee) return false;
    return true;
  }) || [];

  const handleInputChange = (field: keyof NewWorkOrderData, value: string) => {
    setNewWorkOrder(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkOrder.title || !newWorkOrder.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in required fields (Title and Description).",
        variant: "destructive",
      });
      return;
    }
    createWorkOrderMutation.mutate(newWorkOrder);
  };

  const canCreateWorkOrders = (user as any)?.role === 'administrator' || (user as any)?.role === 'manager';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userRole={(user as any)?.role || 'manager'} />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Work Orders</h1>
            <p className="text-gray-600">Manage and track field operation work orders</p>
          </div>
          {canCreateWorkOrders && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center">
                  <i className="fas fa-plus mr-2"></i>
                  Create Work Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Work Order</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={newWorkOrder.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="Enter work order title"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={newWorkOrder.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={newWorkOrder.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Detailed description of the work to be performed"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assignedTo">Assign To</Label>
                      <Select value={newWorkOrder.assignedTo} onValueChange={(value) => handleInputChange('assignedTo', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select field agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldAgents?.map(agent => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.firstName} {agent.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimatedHours">Estimated Hours</Label>
                      <Input
                        id="estimatedHours"
                        type="number"
                        value={newWorkOrder.estimatedHours}
                        onChange={(e) => handleInputChange('estimatedHours', e.target.value)}
                        placeholder="Estimated completion time"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newWorkOrder.dueDate}
                      onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scopeOfWork">Scope of Work</Label>
                    <Textarea
                      id="scopeOfWork"
                      value={newWorkOrder.scopeOfWork}
                      onChange={(e) => handleInputChange('scopeOfWork', e.target.value)}
                      placeholder="Detailed scope and requirements"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requiredTools">Required Tools</Label>
                    <Textarea
                      id="requiredTools"
                      value={newWorkOrder.requiredTools}
                      onChange={(e) => handleInputChange('requiredTools', e.target.value)}
                      placeholder="List of tools and equipment needed"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pointOfContact">Point of Contact</Label>
                    <Input
                      id="pointOfContact"
                      value={newWorkOrder.pointOfContact}
                      onChange={(e) => handleInputChange('pointOfContact', e.target.value)}
                      placeholder="Client contact information"
                    />
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createWorkOrderMutation.isPending}>
                      {createWorkOrderMutation.isPending ? (
                        <div className="flex items-center">
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Creating...
                        </div>
                      ) : (
                        "Create Work Order"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* View Work Order Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Work Order Details</DialogTitle>
            </DialogHeader>
            {selectedWorkOrder && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Basic Information</h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-600">Title:</span>
                          <p className="text-gray-900">{selectedWorkOrder.title}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Description:</span>
                          <p className="text-gray-900">{selectedWorkOrder.description}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Location:</span>
                          <p className="text-foreground">{'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Assignment & Status</h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-600">Status:</span>
                          <Badge className={`ml-2 ${getStatusColor(selectedWorkOrder.status)}`}>
                            {selectedWorkOrder.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Priority:</span>
                          <Badge className={`ml-2 ${getPriorityColor(selectedWorkOrder.priority)}`}>
                            {selectedWorkOrder.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Assigned To:</span>
                          <p className="text-gray-900">{getAgentName(selectedWorkOrder.assigneeId)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Schedule & Timing</h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-gray-600">Estimated Hours:</span>
                          <p className="text-gray-900">{selectedWorkOrder.estimatedHours ? `${selectedWorkOrder.estimatedHours}h` : 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Due Date:</span>
                          <p className="text-gray-900">
                            {selectedWorkOrder.dueDate 
                              ? new Date(selectedWorkOrder.dueDate).toLocaleDateString()
                              : 'No due date'
                            }
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Created:</span>
                          <p className="text-gray-900">
                            {selectedWorkOrder.createdAt 
                              ? new Date(selectedWorkOrder.createdAt).toLocaleDateString()
                              : 'Unknown'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Contact Information</h3>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Point of Contact:</span>
                        <p className="text-gray-900">{selectedWorkOrder.pointOfContact || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Scope of Work</h3>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-gray-900">{selectedWorkOrder.scopeOfWork || 'No scope details provided'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Required Tools & Equipment</h3>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-gray-900">{selectedWorkOrder.requiredTools || 'No tools specified'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Close
                  </Button>
                  {canCreateWorkOrders && (
                    <Button>
                      <i className="fas fa-edit mr-2"></i>
                      Edit Work Order
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <Label htmlFor="statusFilter">Status:</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="assigneeFilter">Assignee:</Label>
                <Select value={filterAssignee} onValueChange={setFilterAssignee}>
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
              <div className="text-sm text-gray-600">
                Showing {filteredWorkOrders.length} of {workOrders?.length || 0} work orders
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-clipboard-list mr-2 text-blue-600"></i>
              Work Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Est. Hours</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{order.title}</div>
                          <div className="text-sm text-gray-600 truncate max-w-xs">
                            {order.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(order.priority)}>
                          {order.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{getAgentName(order.assigneeId)}</TableCell>
                      <TableCell>{order.estimatedHours ? `${order.estimatedHours}h` : 'N/A'}</TableCell>
                      <TableCell>
                        {order.dueDate 
                          ? new Date(order.dueDate).toLocaleDateString()
                          : 'No due date'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedWorkOrder(order);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <i className="fas fa-eye mr-1"></i>
                            View
                          </Button>
                          {canCreateWorkOrders && (
                            <Button variant="outline" size="sm">
                              <i className="fas fa-edit mr-1"></i>
                              Edit
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}