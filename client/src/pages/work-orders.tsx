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
import WorkOrderTasks from "@/components/work-order-tasks";
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

interface WorkOrderTask {
  id: string;
  workOrderId: string;
  title: string;
  description: string | null;
  category: string; // pre_visit, on_site, post_site
  isCompleted: boolean;
  completedById: string | null;
  completedAt: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

interface NewTaskData {
  title: string;
  description: string;
  category: string;
}

interface Task {
  title: string;
  description: string;
  category: 'pre_visit' | 'on_site' | 'post_site';
}

export default function WorkOrders() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Selected items
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [selectedWorkOrderForTask, setSelectedWorkOrderForTask] = useState<string | null>(null);
  
  // Filter states
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  
  // Form states
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

  const [editWorkOrder, setEditWorkOrder] = useState<NewWorkOrderData>({
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

  const [newTask, setNewTask] = useState<NewTaskData>({
    title: "",
    description: "",
    category: "pre_visit"
  });

  // Task creation state for the work order form
  const [formTasks, setFormTasks] = useState<Task[]>([]);
  const [newFormTask, setNewFormTask] = useState<Task>({
    title: '',
    description: '',
    category: 'pre_visit'
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

  const { data: workOrderTasks, isLoading: tasksLoading } = useQuery<WorkOrderTask[]>({
    queryKey: ["/api/work-orders", selectedWorkOrder?.id, "tasks"],
    enabled: !!selectedWorkOrder?.id,
    retry: false,
  });

  // Status update mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ workOrderId, workStatus }: { workOrderId: string; workStatus: string }) => {
      return await apiRequest("PATCH", `/api/work-orders/${workOrderId}/status`, { workStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({
        title: "Status Updated",
        description: "Work order status has been updated successfully!",
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
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    },
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
      
      const response = await apiRequest("POST", "/api/work-orders", workOrderData);
      const createdWorkOrder = await response.json();
      
      // Create tasks for the work order
      if (formTasks.length > 0) {
        for (let i = 0; i < formTasks.length; i++) {
          const task = formTasks[i];
          await apiRequest("POST", `/api/work-orders/${createdWorkOrder.id}/tasks`, {
            ...task,
            orderIndex: i
          });
        }
      }
      
      return createdWorkOrder;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Work order created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      setFormTasks([]);
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

  const createTaskMutation = useMutation({
    mutationFn: async (data: NewTaskData) => {
      if (!selectedWorkOrder) throw new Error("No work order selected");
      
      const response = await apiRequest('POST', `/api/work-orders/${selectedWorkOrder.id}/tasks`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", selectedWorkOrder?.id, "tasks"] });
      setIsTaskDialogOpen(false);
      setNewTask({
        title: "",
        description: "",
        category: "pre_visit"
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
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest('PATCH', `/api/tasks/${taskId}/complete`, {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task marked as complete!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders", selectedWorkOrder?.id, "tasks"] });
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
        description: "Failed to complete task. Please try again.",
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
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-300';
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

  // Task management helper functions
  const handleAddFormTask = () => {
    if (!newFormTask.title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    setFormTasks([...formTasks, newFormTask]);
    setNewFormTask({ title: '', description: '', category: 'pre_visit' });
    toast({
      title: "Task Added",
      description: "Task has been added to the work order",
    });
  };

  const handleRemoveFormTask = (index: number) => {
    setFormTasks(formTasks.filter((_, i) => i !== index));
  };

  // Status button handlers
  const handleStatusUpdate = (workOrderId: string, newStatus: string) => {
    updateStatusMutation.mutate({ workOrderId, workStatus: newStatus });
  };

  const getStatusButtonText = (workOrder: WorkOrder) => {
    const status = (workOrder as any).workStatus || 'not_started';
    switch (status) {
      case 'not_started': return 'In Route';
      case 'in_route': return 'Check In';
      case 'checked_in': return 'Check Out';
      case 'checked_out': return 'Mark Complete';
      case 'completed': return 'Completed';
      default: return 'In Route';
    }
  };

  const getNextStatus = (workOrder: WorkOrder) => {
    const status = (workOrder as any).workStatus || 'not_started';
    switch (status) {
      case 'not_started': return 'in_route';
      case 'in_route': return 'checked_in';
      case 'checked_in': return 'checked_out';
      case 'checked_out': return 'completed';
      default: return 'in_route';
    }
  };

  const canMarkComplete = (workOrder: WorkOrder) => {
    // Only allow marking complete if all tasks are done
    if ((workOrder as any).workStatus !== 'checked_out') return false;
    // Check if all tasks are completed (this would require task data)
    return true; // For now, allow if checked out
  };

  const isStatusButtonDisabled = (workOrder: WorkOrder) => {
    const status = (workOrder as any).workStatus || 'not_started';
    if (status === 'completed') return true;
    if (status === 'checked_out') {
      return !canMarkComplete(workOrder);
    }
    return false;
  };

  // Edit functionality
  const handleEditClick = (workOrder: WorkOrder) => {
    setEditWorkOrder({
      title: workOrder.title,
      description: workOrder.description,
      priority: workOrder.priority,
      assignedTo: workOrder.assigneeId || "",
      estimatedHours: workOrder.estimatedHours?.toString() || "",
      dueDate: workOrder.dueDate ? new Date(workOrder.dueDate).toISOString().split('T')[0] : "",
      scopeOfWork: workOrder.scopeOfWork || "",
      requiredTools: workOrder.requiredTools || "",
      pointOfContact: workOrder.pointOfContact || ""
    });
    setSelectedWorkOrder(workOrder);
    setIsEditDialogOpen(true);
  };

  const updateWorkOrderMutation = useMutation({
    mutationFn: async (data: NewWorkOrderData) => {
      if (!selectedWorkOrder) throw new Error("No work order selected");
      return await apiRequest("PUT", `/api/work-orders/${selectedWorkOrder.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Work order updated successfully!",
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
        description: "Failed to update work order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'pre_visit': return '🚗 Pre-Site';
      case 'on_site': return '🔧 On-Site';
      case 'post_site': return '📋 Post-Site';
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'pre_visit': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'on_site': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'post_site': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleTaskInputChange = (field: keyof NewTaskData, value: string) => {
    setNewTask(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const groupedTasks = workOrderTasks?.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, WorkOrderTask[]>) || {};

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

  const canCompleteTask = (userRole: string) => {
    return userRole === 'administrator' || userRole === 'manager' || userRole === 'field_agent';
  };



  const TaskItem = ({ task, canComplete, onComplete, isCompleting }: {
    task: WorkOrderTask;
    canComplete: boolean;
    onComplete: (taskId: string) => void;
    isCompleting: boolean;
  }) => (
    <div className={`flex items-center justify-between p-3 border rounded-lg ${
      task.isCompleted 
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-center space-x-3">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
          task.isCompleted 
            ? 'bg-green-500 text-white' 
            : 'bg-gray-200 dark:bg-gray-600'
        }`}>
          {task.isCompleted && <i className="fas fa-check text-xs"></i>}
        </div>
        <div>
          <h5 className={`font-medium ${
            task.isCompleted 
              ? 'text-green-800 dark:text-green-300 line-through' 
              : 'text-foreground'
          }`}>
            {task.title}
          </h5>
          {task.description && (
            <p className={`text-sm mt-1 ${
              task.isCompleted 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-gray-600 dark:text-gray-300'
            }`}>
              {task.description}
            </p>
          )}
          {task.isCompleted && task.completedAt && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              Completed {new Date(task.completedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>
      {!task.isCompleted && canComplete && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onComplete(task.id)}
          disabled={isCompleting}
        >
          {isCompleting ? (
            <i className="fas fa-spinner fa-spin mr-1"></i>
          ) : (
            <i className="fas fa-check mr-1"></i>
          )}
          Complete
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation userRole={(user as any)?.role || 'manager'} />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Work Orders</h1>
            <p className="text-gray-600 dark:text-gray-300">Manage and track field operation work orders</p>
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

                  {/* Task Creation Section */}
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">📋 Pre-Define Tasks</h3>
                      <Badge variant="secondary" className="bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                        {formTasks.length} tasks ready
                      </Badge>
                    </div>
                    
                    {/* Add Task Form */}
                    <Card className="mb-4 border-dashed border-2 border-blue-300 dark:border-blue-700">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">Category</Label>
                              <Select 
                                value={newFormTask.category} 
                                onValueChange={(value) => setNewFormTask({ ...newFormTask, category: value as any })}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pre_visit">🚗 Pre-Site</SelectItem>
                                  <SelectItem value="on_site">🔧 On-Site</SelectItem>
                                  <SelectItem value="post_site">📋 Post-Site</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">Task Title</Label>
                              <Input
                                value={newFormTask.title}
                                onChange={(e) => setNewFormTask({ ...newFormTask, title: e.target.value })}
                                placeholder="Enter task title"
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-blue-900 dark:text-blue-100">Description (Optional)</Label>
                            <Textarea
                              value={newFormTask.description}
                              onChange={(e) => setNewFormTask({ ...newFormTask, description: e.target.value })}
                              placeholder="Enter task description"
                              rows={2}
                              className="mt-1"
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={handleAddFormTask}
                            size="sm"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <i className="fas fa-plus mr-2"></i>
                            Add Task to Work Order
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Tasks List */}
                    {formTasks.length > 0 && (
                      <div className="space-y-2">
                        {['pre_visit', 'on_site', 'post_site'].map(category => {
                          const categoryTasks = formTasks.filter(task => task.category === category);
                          if (categoryTasks.length === 0) return null;
                          
                          return (
                            <div key={category}>
                              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                                {getCategoryLabel(category)} ({categoryTasks.length})
                              </h4>
                              <div className="space-y-1">
                                {categoryTasks.map((task, index) => {
                                  const globalIndex = formTasks.findIndex(t => t === task);
                                  return (
                                    <div
                                      key={globalIndex}
                                      className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border shadow-sm"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <Badge className={getCategoryColor(task.category)} variant="secondary">
                                            {getCategoryLabel(task.category)}
                                          </Badge>
                                          <span className="font-medium text-sm">{task.title}</span>
                                        </div>
                                        {task.description && (
                                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                            {task.description}
                                          </p>
                                        )}
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveFormTask(globalIndex)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <i className="fas fa-trash text-sm"></i>
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                      <h3 className="font-semibold text-foreground mb-2">Basic Information</h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Title:</span>
                          <p className="text-foreground">{selectedWorkOrder.title}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Description:</span>
                          <p className="text-foreground">{selectedWorkOrder.description}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-600">Location:</span>
                          <p className="text-foreground">{'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">Assignment & Status</h3>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Status:</span>
                          <Badge className={`ml-2 ${getStatusColor(selectedWorkOrder.status)}`}>
                            {selectedWorkOrder.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Priority:</span>
                          <Badge className={`ml-2 ${getPriorityColor(selectedWorkOrder.priority)}`}>
                            {selectedWorkOrder.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-muted-foreground">Assigned To:</span>
                          <p className="text-foreground">{getAgentName(selectedWorkOrder.assigneeId)}</p>
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

                {/* Task Management Section */}
                <div className="space-y-4 border-t pt-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-foreground">Tasks</h3>
                    {canCreateWorkOrders && (
                      <Button 
                        onClick={() => setIsTaskDialogOpen(true)}
                        size="sm"
                        className="flex items-center"
                      >
                        Add Task
                      </Button>
                    )}
                  </div>

                  {tasksLoading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {['pre_visit', 'on_site', 'post_site'].map(category => (
                        <div key={category} className="space-y-3">
                          <h4 className="font-medium text-foreground flex items-center">
                            <Badge className={`mr-2 ${getCategoryColor(category)}`}>
                              {getCategoryLabel(category)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              ({groupedTasks[category]?.length || 0} tasks)
                            </span>
                          </h4>
                          
                          {groupedTasks[category]?.length ? (
                            <div className="space-y-2">
                              {groupedTasks[category].map(task => (
                                <div 
                                  key={task.id} 
                                  className="flex items-start justify-between p-3 border rounded-lg bg-background"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center">
                                      <div 
                                        className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center ${
                                          task.isCompleted 
                                            ? 'bg-green-500 border-green-500' 
                                            : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                      >
                                        {task.isCompleted && (
                                          <span className="text-white text-xs">✓</span>
                                        )}
                                      </div>
                                      <h5 className={`font-medium ${task.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                        {task.title}
                                      </h5>
                                    </div>
                                    {task.description && (
                                      <p className="text-sm text-muted-foreground mt-1 ml-7">
                                        {task.description}
                                      </p>
                                    )}
                                    {task.isCompleted && task.completedAt && (
                                      <p className="text-xs text-muted-foreground mt-1 ml-7">
                                        Completed on {new Date(task.completedAt).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                  
                                  {!task.isCompleted && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => completeTaskMutation.mutate(task.id)}
                                      disabled={completeTaskMutation.isPending}
                                      className="ml-3"
                                    >
                                      {completeTaskMutation.isPending ? "Completing..." : "Complete"}
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                              No {getCategoryLabel(category).toLowerCase()} tasks yet
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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

        {/* Add Task Dialog */}
        <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!newTask.title) {
                toast({
                  title: "Validation Error",
                  description: "Please enter a task title.",
                  variant: "destructive",
                });
                return;
              }
              createTaskMutation.mutate(newTask);
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taskTitle">Task Title *</Label>
                <Input
                  id="taskTitle"
                  value={newTask.title}
                  onChange={(e) => handleTaskInputChange('title', e.target.value)}
                  placeholder="Enter task title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taskDescription">Description</Label>
                <Textarea
                  id="taskDescription"
                  value={newTask.description}
                  onChange={(e) => handleTaskInputChange('description', e.target.value)}
                  placeholder="Optional task description"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taskCategory">Category *</Label>
                <Select 
                  value={newTask.category} 
                  onValueChange={(value) => handleTaskInputChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_visit">Pre-Visit Tasks</SelectItem>
                    <SelectItem value="on_site">On-Site Tasks</SelectItem>
                    <SelectItem value="post_site">Post-Site Tasks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? (
                    <div className="flex items-center">
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Creating...
                    </div>
                  ) : (
                    "Create Task"
                  )}
                </Button>
              </div>
            </form>
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
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Showing {filteredWorkOrders.length} of {workOrders?.length || 0} work orders
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="mr-2 text-blue-600 dark:text-blue-400">📋</span>
              <span className="text-foreground">Work Orders</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[25%]">Title</TableHead>
                    <TableHead className="w-[12%]">Status</TableHead>
                    <TableHead className="w-[12%]">Priority</TableHead>
                    <TableHead className="w-[18%]">Assigned</TableHead>
                    <TableHead className="w-[8%]">Hours</TableHead>
                    <TableHead className="w-[12%]">Due Date</TableHead>
                    <TableHead className="w-[13%]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{order.title}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(order.status)} text-xs`}>
                          {order.status === 'in_progress' ? 'Active' : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getPriorityColor(order.priority)} text-xs`}>
                          {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">
                        <div className="truncate text-sm">{getAgentName(order.assigneeId)}</div>
                      </TableCell>
                      <TableCell className="text-foreground text-sm">{order.estimatedHours ? `${order.estimatedHours}h` : 'N/A'}</TableCell>
                      <TableCell className="text-foreground">
                        <div className="truncate text-sm">
                          {order.dueDate 
                            ? new Date(order.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : 'None'
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-xs px-2 py-1"
                            onClick={() => {
                              console.log('View button clicked for order:', order.id);
                              setSelectedWorkOrder(order);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            View
                          </Button>
                          {canCreateWorkOrders && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs px-2 py-1"
                              onClick={() => handleEditClick(order)}
                            >
                              Edit
                            </Button>
                          )}
                          {/* Status tracking button */}
                          {(order.assigneeId === (user as any)?.id || canCreateWorkOrders) && (
                            <Button
                              size="sm"
                              className={`text-xs px-2 py-1 ${
                                (order as any).workStatus === 'completed'
                                  ? 'bg-green-600 hover:bg-green-700'
                                  : 'bg-blue-600 hover:bg-blue-700'
                              }`}
                              onClick={() => handleStatusUpdate(order.id, getNextStatus(order))}
                              disabled={isStatusButtonDisabled(order) || updateStatusMutation.isPending}
                            >
                              {updateStatusMutation.isPending ? 'Updating...' : getStatusButtonText(order)}
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

        {/* Work Order Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Work Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); updateWorkOrderMutation.mutate(editWorkOrder); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Title *</Label>
                  <Input
                    id="edit-title"
                    value={editWorkOrder.title}
                    onChange={(e) => setEditWorkOrder(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Work order title"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select value={editWorkOrder.priority} onValueChange={(value) => setEditWorkOrder(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  value={editWorkOrder.description}
                  onChange={(e) => setEditWorkOrder(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detailed description of the work"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-assignedTo">Assigned Agent</Label>
                  <Select value={editWorkOrder.assignedTo} onValueChange={(value) => setEditWorkOrder(prev => ({ ...prev, assignedTo: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent" />
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
                  <Label htmlFor="edit-estimatedHours">Estimated Hours</Label>
                  <Input
                    id="edit-estimatedHours"
                    type="number"
                    value={editWorkOrder.estimatedHours}
                    onChange={(e) => setEditWorkOrder(prev => ({ ...prev, estimatedHours: e.target.value }))}
                    placeholder="Hours"
                    min="0"
                    step="0.5"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-dueDate">Due Date</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={editWorkOrder.dueDate}
                  onChange={(e) => setEditWorkOrder(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-scopeOfWork">Scope of Work</Label>
                <Textarea
                  id="edit-scopeOfWork"
                  value={editWorkOrder.scopeOfWork}
                  onChange={(e) => setEditWorkOrder(prev => ({ ...prev, scopeOfWork: e.target.value }))}
                  placeholder="Detailed scope and requirements"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-requiredTools">Required Tools & Equipment</Label>
                <Textarea
                  id="edit-requiredTools"
                  value={editWorkOrder.requiredTools}
                  onChange={(e) => setEditWorkOrder(prev => ({ ...prev, requiredTools: e.target.value }))}
                  placeholder="List tools and equipment needed"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-pointOfContact">Point of Contact</Label>
                <Input
                  id="edit-pointOfContact"
                  value={editWorkOrder.pointOfContact}
                  onChange={(e) => setEditWorkOrder(prev => ({ ...prev, pointOfContact: e.target.value }))}
                  placeholder="Client contact information"
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateWorkOrderMutation.isPending}>
                  {updateWorkOrderMutation.isPending ? 'Updating...' : 'Update Work Order'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Work Order View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <i className="fas fa-clipboard-list mr-2 text-blue-600 dark:text-blue-400"></i>
                Work Order Details: {selectedWorkOrder?.title}
              </DialogTitle>
            </DialogHeader>
            {selectedWorkOrder && (
              <div className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="font-semibold">Title</Label>
                        <p className="text-foreground">{selectedWorkOrder.title}</p>
                      </div>
                      <div>
                        <Label className="font-semibold">Status</Label>
                        <div className="mt-1">
                          <Badge className={getStatusColor(selectedWorkOrder.status)}>
                            {selectedWorkOrder.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="font-semibold">Priority</Label>
                        <div className="mt-1">
                          <Badge className={getPriorityColor(selectedWorkOrder.priority)}>
                            {selectedWorkOrder.priority.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="font-semibold">Assigned To</Label>
                        <p className="text-foreground">{getAgentName(selectedWorkOrder.assigneeId)}</p>
                      </div>
                      <div>
                        <Label className="font-semibold">Estimated Hours</Label>
                        <p className="text-foreground">{selectedWorkOrder.estimatedHours ? `${selectedWorkOrder.estimatedHours}h` : 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="font-semibold">Due Date</Label>
                        <p className="text-foreground">
                          {selectedWorkOrder.dueDate 
                            ? new Date(selectedWorkOrder.dueDate).toLocaleDateString()
                            : 'No due date'
                          }
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label className="font-semibold">Description</Label>
                      <p className="text-foreground mt-1">{selectedWorkOrder.description}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Work Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Work Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="font-semibold">Scope of Work</Label>
                      <p className="text-foreground mt-1">{selectedWorkOrder.scopeOfWork || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Required Tools</Label>
                      <p className="text-foreground mt-1">{selectedWorkOrder.requiredTools || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Point of Contact</Label>
                      <p className="text-foreground mt-1">{selectedWorkOrder.pointOfContact || 'Not specified'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Tasks Section */}
                <WorkOrderTasks 
                  workOrderId={selectedWorkOrder.id} 
                  userRole={(user as any)?.role} 
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}