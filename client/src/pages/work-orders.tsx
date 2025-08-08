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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import WorkOrderTasks from "@/components/work-order-tasks";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Trash2 } from "lucide-react";

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

interface WorkOrderIssue {
  id: string;
  workOrderId: string;
  reason: string;
  explanation: string;
  createdById: string;
  status: string;
  createdAt: string;
}

interface NewIssueData {
  reason: string;
  explanation: string;
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
  const [, setLocation] = useLocation();
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateIssueDialogOpen, setIsCreateIssueDialogOpen] = useState(false);
  
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

  const [newIssue, setNewIssue] = useState<NewIssueData>({
    reason: "",
    explanation: ""
  });

  // Task creation state for the work order form
  const [formTasks, setFormTasks] = useState<Task[]>([]);
  const [newFormTask, setNewFormTask] = useState<Task>({
    title: '',
    description: '',
    category: 'pre_visit'
  });

  // Queries - these must be declared before any conditional returns
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

  // Query to fetch tasks for all work orders to check completion status
  const { data: allWorkOrderTasks } = useQuery<{ [workOrderId: string]: WorkOrderTask[] }>({
    queryKey: ["/api/work-orders/tasks/all"],
    queryFn: async () => {
      if (!workOrders) return {};
      
      const tasksData: { [workOrderId: string]: WorkOrderTask[] } = {};
      
      // Fetch tasks for each work order
      for (const workOrder of workOrders) {
        try {
          const response = await fetch(`/api/work-orders/${workOrder.id}/tasks`);
          if (response.ok) {
            tasksData[workOrder.id] = await response.json();
          } else {
            tasksData[workOrder.id] = [];
          }
        } catch (error) {
          tasksData[workOrder.id] = [];
        }
      }
      
      return tasksData;
    },
    enabled: !!workOrders && workOrders.length > 0,
    retry: false,
  });

  // Alias for easier reference
  const tasksData = allWorkOrderTasks;
  
  // Get current work order data (fresh from query) for the dialog
  const currentSelectedWorkOrder = selectedWorkOrder 
    ? workOrders?.find(wo => wo.id === selectedWorkOrder.id) || selectedWorkOrder
    : null;

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
    onError: (error: any) => {
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
      
      // Handle task completion validation errors
      if (error?.message?.includes('task(s) still incomplete')) {
        toast({
          title: "Cannot Mark Complete",
          description: error.message,
          variant: "destructive",
        });
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
        status: 'scheduled',
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

  const createIssueMutation = useMutation({
    mutationFn: async (data: NewIssueData) => {
      if (!selectedWorkOrder) throw new Error("No work order selected");
      return await apiRequest("POST", `/api/work-orders/${selectedWorkOrder.id}/issues`, data);
    },
    onSuccess: () => {
      setIsCreateIssueDialogOpen(false);
      setNewIssue({ reason: "", explanation: "" });
      toast({
        title: "Success",
        description: "Issue created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
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
        description: "Failed to create issue. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteWorkOrderMutation = useMutation({
    mutationFn: async (workOrderId: string) => {
      return await apiRequest("DELETE", `/api/work-orders/${workOrderId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({
        title: "Success",
        description: "Work order deleted permanently",
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
        description: "Failed to delete work order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const confirmWorkOrderMutation = useMutation({
    mutationFn: async ({ workOrderId }: { workOrderId: string }) => {
      return await apiRequest("PATCH", `/api/work-orders/${workOrderId}/confirm`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      toast({
        title: "Work Order Confirmed",
        description: "Work order has been confirmed successfully!",
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
        description: "Failed to confirm work order. Please try again.",
        variant: "destructive",
      });
    },
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

  // Handle unauthorized errors from queries
  useEffect(() => {
    if (ordersError && isUnauthorizedError(ordersError as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [ordersError, toast]);

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
      case 'scheduled': return 'bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-300';
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300';
      case 'in_progress': return 'bg-orange-100 text-orange-800 dark:bg-orange-800/20 dark:text-orange-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-300';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300';
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
    const workOrder = workOrders?.find(wo => wo.id === workOrderId);
    if (!workOrder) return;
    
    // Handle status confirmation for scheduled orders - update main status to confirmed
    if (workOrder.status === 'scheduled' && newStatus === 'confirmed') {
      confirmWorkOrderMutation.mutate({ 
        workOrderId
      });
    } else {
      // Handle work status updates for confirmed orders
      updateStatusMutation.mutate({ workOrderId, workStatus: newStatus });
    }
  };

  const confirmStatusUpdate = (workOrder: WorkOrder) => {
    const currentStatus = workOrder.status;
    const workStatus = (workOrder as any).workStatus || 'not_started';
    const nextStatus = getNextStatus(workOrder);
    
    if (currentStatus === 'scheduled' && nextStatus === 'confirmed') {
      return 'Are you sure you want to confirm this work order? This acknowledges that you will complete the work as scheduled.';
    } else if (workStatus === 'checked_out' && nextStatus === 'completed') {
      return 'Are you sure you want to mark this work order as complete? This will finalize the work order and mark it as finished.';
    } else if (workStatus === 'completed' && nextStatus === 'checked_out') {
      return 'Are you sure you want to mark this work order as incomplete? This will reopen the work order and set it back to checked out status.';
    }
    
    return null; // No confirmation needed for other status changes
  };

  const getStatusButtonText = (workOrder: WorkOrder) => {
    const status = workOrder.status;
    const workStatus = (workOrder as any).workStatus || 'not_started';
    
    // Handle main status flow first
    if (status === 'scheduled') return 'Confirm Work Order';
    if (status === 'confirmed' && (!workStatus || workStatus === 'not_started')) return 'In Route';
    
    // Handle work status flow for confirmed orders
    switch (workStatus) {
      case 'not_started': return 'In Route';
      case 'in_route': return 'Check In';
      case 'checked_in': return 'Check Out';
      case 'checked_out': {
        // Check if all tasks are completed before allowing completion
        const workOrderTasks = tasksData?.[workOrder.id] || [];
        if (workOrderTasks.length > 0 && !workOrderTasks.every(task => task.isCompleted)) {
          return 'Complete All Tasks First';
        }
        return 'Mark Complete';
      }
      case 'completed': return 'Mark Incomplete';
      default: return 'In Route';
    }
  };

  const getNextStatus = (workOrder: WorkOrder) => {
    const status = workOrder.status;
    const workStatus = (workOrder as any).workStatus || 'not_started';
    
    // Handle main status flow first
    if (status === 'scheduled') return 'confirmed';
    if (status === 'confirmed' && (!workStatus || workStatus === 'not_started')) return 'in_route';
    
    // Handle work status flow for confirmed orders
    switch (workStatus) {
      case 'not_started': return 'in_route';
      case 'in_route': return 'checked_in';
      case 'checked_in': return 'checked_out';
      case 'checked_out': return 'completed';
      case 'completed': return 'checked_out'; // Allow going back from completed
      default: return 'in_route';
    }
  };

  const canMarkComplete = (workOrder: WorkOrder) => {
    // Only allow marking complete if all tasks are done
    if ((workOrder as any).workStatus !== 'checked_out') return false;
    
    // Get tasks for this work order
    const workOrderTasks = tasksData?.[workOrder.id] || [];
    
    // If no tasks exist, allow completion
    if (workOrderTasks.length === 0) return true;
    
    // Check if all tasks are completed
    return workOrderTasks.every(task => task.isCompleted);
  };

  const isWithin24Hours = (dueDate: string | null) => {
    if (!dueDate) return false; // No due date, don't allow early confirmation
    
    const due = new Date(dueDate);
    const now = new Date();
    const timeDifference = due.getTime() - now.getTime();
    const hoursUntilDue = timeDifference / (1000 * 60 * 60); // Convert to hours
    
    // Allow if due date has passed or is within 24 hours
    return hoursUntilDue <= 24;
  };

  const isStatusButtonDisabled = (workOrder: WorkOrder) => {
    const status = workOrder.status;
    const workStatus = (workOrder as any).workStatus || 'not_started';
    const userRole = (user as any)?.role;
    
    // For scheduled work orders, check time restrictions and authorization
    if (status === 'scheduled') {
      // Administrators, managers, and dispatchers can confirm any work order
      if (userRole === 'administrator' || userRole === 'manager' || userRole === 'dispatcher') {
        return false; // Allow confirmation
      }
      
      // Field agents can only confirm their assigned work orders within time limits
      if (userRole === 'field_agent') {
        if (workOrder.assigneeId !== (user as any)?.id) {
          return true; // Not assigned to this agent
        }
        // Check if within 24 hours or past due date
        return !isWithin24Hours(workOrder.dueDate);
      }
      
      return true; // Default deny for other roles
    }
    
    // For all other status transitions, check task completion requirement
    if (workStatus === 'checked_out') {
      // Can only mark complete if all tasks are done
      return !canMarkComplete(workOrder);
    }
    
    // For any status transition beyond confirmation, require all tasks to be completed first
    if (status === 'confirmed' && workStatus !== 'completed') {
      const workOrderTasks = tasksData?.[workOrder.id] || [];
      if (workOrderTasks.length > 0 && !workOrderTasks.every(task => task.isCompleted)) {
        return true; // Block status changes until all tasks are completed
      }
    }
    
    return false; // Allow all other status changes
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
          <div className="flex-1 text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Work Orders</h1>
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
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => setIsCreateIssueDialogOpen(true)}
                        size="sm"
                        variant="outline"
                        className="flex items-center"
                      >
                        ⚠️ Create Issue
                      </Button>
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
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
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

        {/* Work Orders Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <span className="mr-2 text-blue-600 dark:text-blue-400">📋</span>
              Work Orders
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWorkOrders.map((order) => (
              <Card key={order.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer">
                <div onClick={() => {
                  setSelectedWorkOrder(order);
                  setIsViewDialogOpen(true);
                }}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {order.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                          {order.description}
                        </p>
                      </div>
                      <div className="ml-3 flex flex-col items-end space-y-2">
                        <Badge className={`${getPriorityColor(order.priority)} text-xs font-medium`}>
                          {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
                        </Badge>
                        <Badge className={`${getStatusColor(order.status)} text-xs font-medium`}>
                          {order.status === 'in_progress' ? 'Active' : 
                           order.status === 'scheduled' ? 'Scheduled' :
                           order.status === 'confirmed' ? 'Confirmed' :
                           order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {order.dueDate 
                            ? new Date(order.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : 'No due date'
                          }
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                
                  <CardContent className="pt-0 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Assigned To:</span>
                        <p className="text-gray-900 dark:text-white mt-1 font-medium">
                          {getAgentName(order.assigneeId)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Estimated Hours:</span>
                        <p className="text-gray-900 dark:text-white mt-1 font-medium">
                          {order.estimatedHours ? `${order.estimatedHours}h` : 'Not specified'}
                        </p>
                      </div>
                    </div>

                    {(order.scopeOfWork || order.requiredTools) && (
                      <div className="space-y-2">
                        {order.scopeOfWork && (
                          <div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Scope:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1 line-clamp-2">
                              {order.scopeOfWork}
                            </p>
                          </div>
                        )}
                        {order.requiredTools && (
                          <div>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Tools:</span>
                            <p className="text-sm text-gray-900 dark:text-white mt-1 line-clamp-2">
                              {order.requiredTools}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {order.pointOfContact && (
                      <div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Contact:</span>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">
                          {order.pointOfContact}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs px-3 whitespace-nowrap"
                        onClick={() => {
                          setSelectedWorkOrder(order);
                          setIsViewDialogOpen(true);
                        }}
                      >
                        <i className="fas fa-eye mr-1"></i>
                        View Details
                      </Button>
                    {canCreateWorkOrders && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs px-3"
                        onClick={() => handleEditClick(order)}
                      >
                        <i className="fas fa-edit mr-1"></i>
                        Edit
                      </Button>
                    )}
                    {(order.assigneeId === (user as any)?.id || canCreateWorkOrders || (user as any)?.role === 'dispatcher') && (
                      confirmStatusUpdate(order) ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <div className="relative">
                              <Button
                                size="sm"
                                className={`text-xs px-2 py-1 whitespace-nowrap min-w-0 flex-shrink-0 ${
                                  (order as any).workStatus === 'completed'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                                disabled={isStatusButtonDisabled(order) || updateStatusMutation.isPending || confirmWorkOrderMutation.isPending}
                                title={
                                  order.status === 'scheduled' && isStatusButtonDisabled(order) && order.assigneeId === (user as any)?.id
                                    ? `Can only confirm within 24 hours of due date${order.dueDate ? ` (${new Date(order.dueDate).toLocaleDateString()})` : ''}`
                                    : isStatusButtonDisabled(order) && order.status === 'confirmed'
                                    ? 'Complete all tasks before proceeding with work order status'
                                    : isStatusButtonDisabled(order) && (order as any).workStatus === 'checked_out'
                                    ? 'All tasks must be completed before marking work order as complete'
                                    : ''
                                }
                              >
                                {updateStatusMutation.isPending ? (
                                  <i className="fas fa-spinner fa-spin mr-1"></i>
                                ) : (
                                  <i className="fas fa-play mr-1"></i>
                                )}
                                {updateStatusMutation.isPending ? 'Updating...' : getStatusButtonText(order)}
                              </Button>
                            </div>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
                              <AlertDialogDescription>
                                {confirmStatusUpdate(order)}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleStatusUpdate(order.id, getNextStatus(order))}
                              >
                                Confirm
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button
                          size="sm"
                          className={`text-xs px-2 py-1 whitespace-nowrap min-w-0 flex-shrink-0 ${
                            (order as any).workStatus === 'completed'
                              ? 'bg-green-600 hover:bg-green-700'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                          onClick={() => handleStatusUpdate(order.id, getNextStatus(order))}
                          disabled={isStatusButtonDisabled(order) || updateStatusMutation.isPending || confirmWorkOrderMutation.isPending}
                          title={
                            order.status === 'scheduled' && isStatusButtonDisabled(order) && order.assigneeId === (user as any)?.id
                              ? `Can only confirm within 24 hours of due date${order.dueDate ? ` (${new Date(order.dueDate).toLocaleDateString()})` : ''}`
                              : isStatusButtonDisabled(order) && order.status === 'confirmed'
                              ? 'Complete all tasks before proceeding with work order status'
                              : isStatusButtonDisabled(order) && (order as any).workStatus === 'checked_out'
                              ? 'All tasks must be completed before marking work order as complete'
                              : ''
                          }
                        >
                          {updateStatusMutation.isPending ? (
                            <i className="fas fa-spinner fa-spin mr-1"></i>
                          ) : (
                            <i className="fas fa-play mr-1"></i>
                          )}
                          {updateStatusMutation.isPending ? 'Updating...' : getStatusButtonText(order)}
                        </Button>
                      )
                    )}
                    {canCreateWorkOrders && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="text-xs px-3"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Work Order</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{order.title}"? This action is irreversible and will permanently remove the work order from the system.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteWorkOrderMutation.mutate(order.id)}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={deleteWorkOrderMutation.isPending}
                            >
                              {deleteWorkOrderMutation.isPending ? 'Deleting...' : 'Delete Work Order'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>
          
          {filteredWorkOrders.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <i className="fas fa-clipboard-list text-4xl text-gray-400 dark:text-gray-500 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No work orders found</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {workOrders?.length === 0 
                  ? "No work orders have been created yet."
                  : "No work orders match the current filters."
                }
              </p>
            </div>
          )}
        </div>

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
                  <Label htmlFor="edit-assignedTo">Assigned Field Agent</Label>
                  <Select value={editWorkOrder.assignedTo} onValueChange={(value) => setEditWorkOrder(prev => ({ ...prev, assignedTo: value }))}>
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
              <DialogTitle className="text-center text-xl font-semibold mb-4">
                {currentSelectedWorkOrder?.title}
              </DialogTitle>
              <div className="flex justify-center gap-3 mb-6">
                <Button 
                  onClick={() => setIsCreateIssueDialogOpen(true)}
                  size="sm"
                  variant="outline"
                  className="flex items-center"
                >
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  Create Issue
                </Button>
                {canCreateWorkOrders && (
                  <Button 
                    onClick={() => setIsTaskDialogOpen(true)}
                    size="sm"
                    className="flex items-center"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Add Task
                  </Button>
                )}
              </div>
            </DialogHeader>
            {currentSelectedWorkOrder && (
              <div className="space-y-6">
                {/* Work Order Information */}
                <Card>
                  <CardContent className="space-y-4 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="font-semibold">Status</Label>
                        <div className="mt-1 flex items-center gap-3">
                          <Badge className={getStatusColor(currentSelectedWorkOrder.status)}>
                            {currentSelectedWorkOrder.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {(((user as any)?.role === 'field_agent' && currentSelectedWorkOrder.assigneeId === (user as any)?.id) || 
                           (user as any)?.role === 'administrator' || 
                           (user as any)?.role === 'manager') && (
                            confirmStatusUpdate(currentSelectedWorkOrder) ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    disabled={isStatusButtonDisabled(currentSelectedWorkOrder) || updateStatusMutation.isPending}
                                    size="sm"
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {updateStatusMutation.isPending ? 'Updating...' : getStatusButtonText(currentSelectedWorkOrder)}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {confirmStatusUpdate(currentSelectedWorkOrder)}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleStatusUpdate(currentSelectedWorkOrder.id, getNextStatus(currentSelectedWorkOrder))}
                                    >
                                      Confirm
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : (
                              <Button
                                onClick={() => handleStatusUpdate(currentSelectedWorkOrder.id, getNextStatus(currentSelectedWorkOrder))}
                                disabled={isStatusButtonDisabled(currentSelectedWorkOrder) || updateStatusMutation.isPending}
                                size="sm"
                                variant="outline"
                                className="text-xs"
                              >
                                {updateStatusMutation.isPending ? 'Updating...' : getStatusButtonText(currentSelectedWorkOrder)}
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="font-semibold">Priority</Label>
                        <div className="mt-1">
                          <Badge className={getPriorityColor(currentSelectedWorkOrder.priority)}>
                            {currentSelectedWorkOrder.priority.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="font-semibold">Assigned To</Label>
                        <p className="text-foreground">{getAgentName(currentSelectedWorkOrder.assigneeId)}</p>
                      </div>
                      <div>
                        <Label className="font-semibold">Estimated Hours</Label>
                        <p className="text-foreground">{currentSelectedWorkOrder.estimatedHours ? `${currentSelectedWorkOrder.estimatedHours}h` : 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="font-semibold">Due Date</Label>
                        <p className="text-foreground">
                          {currentSelectedWorkOrder.dueDate 
                            ? new Date(currentSelectedWorkOrder.dueDate).toLocaleDateString()
                            : 'No due date'
                          }
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label className="font-semibold">Description</Label>
                      <p className="text-foreground mt-1">{currentSelectedWorkOrder.description}</p>
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
                      <p className="text-foreground mt-1">{currentSelectedWorkOrder.scopeOfWork || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Required Tools</Label>
                      <p className="text-foreground mt-1">{currentSelectedWorkOrder.requiredTools || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Point of Contact</Label>
                      <p className="text-foreground mt-1">{currentSelectedWorkOrder.pointOfContact || 'Not specified'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Tasks Section */}
                <WorkOrderTasks 
                  workOrderId={currentSelectedWorkOrder.id} 
                  userRole={(user as any)?.role} 
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Issue Dialog */}
        <Dialog open={isCreateIssueDialogOpen} onOpenChange={setIsCreateIssueDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Issue Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="issue-reason">Issue Reason</Label>
                <Select
                  value={newIssue.reason}
                  onValueChange={(value) => setNewIssue({...newIssue, reason: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason for issue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="schedule">schedule</SelectItem>
                    <SelectItem value="access">access</SelectItem>
                    <SelectItem value="scope">scope</SelectItem>
                    <SelectItem value="personal/other">personal/other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="issue-explanation">Explanation</Label>
                <Textarea
                  id="issue-explanation"
                  placeholder="Provide a brief explanation of the issue..."
                  value={newIssue.explanation}
                  onChange={(e) => setNewIssue({...newIssue, explanation: e.target.value})}
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsCreateIssueDialogOpen(false);
                    setNewIssue({ reason: "", explanation: "" });
                  }}
                >
                  Cancel
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      disabled={!newIssue.reason || !newIssue.explanation || createIssueMutation.isPending}
                    >
                      {createIssueMutation.isPending ? "Creating..." : "Create Issue"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Issue Creation</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to create this issue for "{currentSelectedWorkOrder?.title}"? 
                        <br /><br />
                        <strong>Issue Reason:</strong> {newIssue.reason}
                        <br />
                        <strong>Explanation:</strong> {newIssue.explanation}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          createIssueMutation.mutate(newIssue);
                        }}
                        disabled={createIssueMutation.isPending}
                      >
                        {createIssueMutation.isPending ? "Creating..." : "Confirm Create Issue"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}