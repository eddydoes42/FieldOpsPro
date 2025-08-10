import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Edit, 
  Save, 
  X, 
  User, 
  UserPlus, 
  Calendar, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  FileText,
  Wrench,
  Phone,
  DollarSign,
  Plus,
  CheckSquare,
  Square
} from "lucide-react";

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
  scopeOfWork?: string;
  requiredTools?: string;
  pointOfContact?: string;
  budgetType?: string;
  budgetAmount?: string;
  estimatedHours?: number;
  devicesInstalled?: number;
}

interface WorkOrderCardPopupProps {
  workOrder: WorkOrder;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  canEdit?: boolean;
}

export default function WorkOrderCardPopup({ 
  workOrder, 
  isOpen, 
  onClose, 
  onUpdate,
  canEdit = true 
}: WorkOrderCardPopupProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    category: 'on_site' as 'pre_visit' | 'on_site' | 'post_site'
  });

  // Calculate total available budget based on budget type
  const calculateTotalBudget = () => {
    const budgetAmount = parseFloat(editForm.budgetAmount || workOrder.budgetAmount || '0');
    const estimatedHours = parseFloat(editForm.estimatedHours || workOrder.estimatedHours?.toString() || '0');
    const devicesInstalled = parseInt(editForm.devicesInstalled || workOrder.devicesInstalled?.toString() || '0');
    const budgetType = editForm.budgetType || workOrder.budgetType;

    switch (budgetType) {
      case 'fixed':
        return budgetAmount;
      case 'hourly':
        return budgetAmount * estimatedHours;
      case 'per_device':
        return budgetAmount * devicesInstalled;
      case 'materials_plus_labor':
        return budgetAmount; // Base amount for materials + labor
      default:
        return budgetAmount;
    }
  };
  const [editForm, setEditForm] = useState({
    title: workOrder.title || '',
    description: workOrder.description || '',
    location: workOrder.location || '',
    priority: (workOrder.priority as "low" | "medium" | "high" | "urgent") || 'medium',
    dueDate: workOrder.dueDate ? workOrder.dueDate.split('T')[0] : '',
    budgetType: workOrder.budgetType || '',
    budgetAmount: workOrder.budgetAmount || '',
    devicesInstalled: workOrder.devicesInstalled?.toString() || '',
    scopeOfWork: workOrder.scopeOfWork || '',
    requiredTools: workOrder.requiredTools || '',
    pointOfContact: workOrder.pointOfContact || '',
    estimatedHours: workOrder.estimatedHours?.toString() || '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", `/api/work-orders/${workOrder.id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Work order updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/client/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setIsEditing(false);
      onUpdate?.();
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update work order",
        variant: "destructive"
      });
    }
  });

  // Fetch work order tasks
  const { data: tasks, refetch: refetchTasks } = useQuery({
    queryKey: [`/api/work-orders/${workOrder.id}/tasks`],
    enabled: isOpen,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return apiRequest("POST", `/api/work-orders/${workOrder.id}/tasks`, taskData);
    },
    onSuccess: () => {
      refetchTasks();
      setShowAddTaskForm(false);
      setNewTaskForm({ title: '', description: '', category: 'on_site' });
      toast({ title: "Task created successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create task",
        description: error.message || "Could not create task",
        variant: "destructive",
      });
    }
  });

  // Toggle task completion mutation
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, isCompleted }: { taskId: string; isCompleted: boolean }) => {
      return apiRequest("PATCH", `/api/work-order-tasks/${taskId}`, { isCompleted });
    },
    onSuccess: () => {
      refetchTasks();
      toast({ title: "Task updated successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update task",
        description: error.message || "Could not update task",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    const updateData = {
      ...editForm,
      estimatedHours: editForm.estimatedHours ? parseFloat(editForm.estimatedHours) : null,
      budgetAmount: editForm.budgetAmount ? parseFloat(editForm.budgetAmount) : null,
      devicesInstalled: editForm.devicesInstalled ? parseInt(editForm.devicesInstalled) : null,
    };
    updateMutation.mutate(updateData);
  };

  const handleCancel = () => {
    setEditForm({
      title: workOrder.title || '',
      description: workOrder.description || '',
      location: workOrder.location || '',
      priority: (workOrder.priority as "low" | "medium" | "high" | "urgent") || 'medium',
      budgetType: workOrder.budgetType || '',
      budgetAmount: workOrder.budgetAmount || '',
      devicesInstalled: workOrder.devicesInstalled?.toString() || '',
      dueDate: workOrder.dueDate ? workOrder.dueDate.split('T')[0] : '',
      scopeOfWork: workOrder.scopeOfWork || '',
      requiredTools: workOrder.requiredTools || '',
      pointOfContact: workOrder.pointOfContact || '',
      estimatedHours: workOrder.estimatedHours?.toString() || '',
    });
    setIsEditing(false);
  };

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              {isEditing ? 'Edit Work Order' : 'Work Order Details'}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {canEdit && !isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {isEditing && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCancel}
                    disabled={updateMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={editForm.title}
                        onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                        className="text-lg font-semibold"
                      />
                    </div>
                  ) : (
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                      {workOrder.title}
                    </CardTitle>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge className={getPriorityColor(isEditing ? editForm.priority as any : workOrder.priority)} variant="secondary">
                      {(isEditing ? editForm.priority : workOrder.priority).toUpperCase()}
                    </Badge>
                    <Badge className={getStatusColor(workOrder.status)} variant="secondary">
                      {workOrder.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {workOrder.requestStatus && (
                      <Badge variant="outline">
                        {workOrder.requestStatus.replace('_', ' ').toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Assignment Status */}
                <div className="flex items-center gap-2 ml-4">
                  {workOrder.assignee ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                      <User className="h-4 w-4" />
                      <span>Assigned to: {workOrder.assignee.firstName} {workOrder.assignee.lastName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg">
                      <UserPlus className="h-4 w-4" />
                      <span>Unassigned</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description">Description</Label>
                {isEditing ? (
                  <Textarea
                    id="description"
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                    rows={3}
                  />
                ) : (
                  <p className="text-gray-600 dark:text-gray-300 mt-1">{workOrder.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <Input
                        id="location"
                        value={editForm.location}
                        onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">{workOrder.location}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  {isEditing ? (
                    <Select value={editForm.priority} onValueChange={(value) => setEditForm({...editForm, priority: value})}>
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
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <AlertTriangle className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">{workOrder.priority}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <Input
                        id="dueDate"
                        type="date"
                        value={editForm.dueDate}
                        onChange={(e) => setEditForm({...editForm, dueDate: e.target.value})}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">
                        {workOrder.dueDate ? new Date(workOrder.dueDate).toLocaleDateString() : 'No due date'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="estimatedHours">Estimated Hours</Label>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <Input
                        id="estimatedHours"
                        type="number"
                        step="0.5"
                        value={editForm.estimatedHours}
                        onChange={(e) => setEditForm({...editForm, estimatedHours: e.target.value})}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">
                        {workOrder.estimatedHours ? `${workOrder.estimatedHours} hours` : 'Not specified'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="h-4 w-4" />
                Work Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="scopeOfWork">Scope of Work</Label>
                {isEditing ? (
                  <Textarea
                    id="scopeOfWork"
                    value={editForm.scopeOfWork}
                    onChange={(e) => setEditForm({...editForm, scopeOfWork: e.target.value})}
                    rows={3}
                    placeholder="Describe the work to be performed..."
                  />
                ) : (
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    {workOrder.scopeOfWork || 'No scope of work specified'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="requiredTools">Required Tools</Label>
                {isEditing ? (
                  <Textarea
                    id="requiredTools"
                    value={editForm.requiredTools}
                    onChange={(e) => setEditForm({...editForm, requiredTools: e.target.value})}
                    rows={2}
                    placeholder="List any special tools or equipment needed..."
                  />
                ) : (
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    {workOrder.requiredTools || 'No special tools required'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="pointOfContact">Point of Contact</Label>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <Input
                      id="pointOfContact"
                      value={editForm.pointOfContact}
                      onChange={(e) => setEditForm({...editForm, pointOfContact: e.target.value})}
                      placeholder="Name and contact information"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {workOrder.pointOfContact || 'No point of contact specified'}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Budget Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" />
                Budget Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budgetType">Budget Type</Label>
                  {isEditing ? (
                    <Select value={editForm.budgetType} onValueChange={(value) => setEditForm({...editForm, budgetType: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="hourly">Hourly Rate</SelectItem>
                        <SelectItem value="per_device">Per Device</SelectItem>
                        <SelectItem value="materials_plus_labor">Materials + Labor</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">
                        {workOrder.budgetType || 'Not specified'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="budgetAmount">Budget Amount</Label>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <Input
                        id="budgetAmount"
                        type="number"
                        step="0.01"
                        value={editForm.budgetAmount}
                        onChange={(e) => setEditForm({...editForm, budgetAmount: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-300">
                        {workOrder.budgetAmount ? `$${workOrder.budgetAmount}` : 'Not specified'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Devices Field - only show for per_device budget type */}
                {(editForm.budgetType === 'per_device' || workOrder.budgetType === 'per_device') && (
                  <div className="grid grid-cols-1 gap-4 mt-4">
                    <div>
                      <Label htmlFor="devicesInstalled">Number of Devices</Label>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <Input
                            id="devicesInstalled"
                            type="number"
                            min="0"
                            value={editForm.devicesInstalled}
                            onChange={(e) => setEditForm({...editForm, devicesInstalled: e.target.value})}
                            placeholder="0"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-300">
                            {workOrder.devicesInstalled || 'Not specified'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Total Available Budget Display */}
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Total Available Budget:</span>
                    <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      ${calculateTotalBudget().toFixed(2)}
                    </span>
                  </div>
                  {(editForm.budgetType === 'hourly' || workOrder.budgetType === 'hourly') && (
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                      ${editForm.budgetAmount || workOrder.budgetAmount || '0'}/hour × {editForm.estimatedHours || workOrder.estimatedHours || '0'} hours
                    </p>
                  )}
                  {(editForm.budgetType === 'per_device' || workOrder.budgetType === 'per_device') && (
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                      ${editForm.budgetAmount || workOrder.budgetAmount || '0'}/device × {editForm.devicesInstalled || workOrder.devicesInstalled || '0'} devices
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Tasks
                </div>
                {canEdit && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAddTaskForm(true)}
                    disabled={showAddTaskForm}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Add Task Form */}
                {showAddTaskForm && (
                  <div className="p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="taskTitle">Task Title</Label>
                        <Input
                          id="taskTitle"
                          value={newTaskForm.title}
                          onChange={(e) => setNewTaskForm({...newTaskForm, title: e.target.value})}
                          placeholder="Enter task title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="taskDescription">Description</Label>
                        <Input
                          id="taskDescription"
                          value={newTaskForm.description}
                          onChange={(e) => setNewTaskForm({...newTaskForm, description: e.target.value})}
                          placeholder="Enter task description"
                        />
                      </div>
                      <div>
                        <Label htmlFor="taskCategory">Category</Label>
                        <Select
                          value={newTaskForm.category}
                          onValueChange={(value) => setNewTaskForm({...newTaskForm, category: value as 'pre_visit' | 'on_site' | 'post_site'})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pre_visit">Pre-Visit</SelectItem>
                            <SelectItem value="on_site">On-Site</SelectItem>
                            <SelectItem value="post_site">Post-Site</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => createTaskMutation.mutate(newTaskForm)}
                          disabled={!newTaskForm.title || createTaskMutation.isPending}
                          size="sm"
                        >
                          Create Task
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowAddTaskForm(false);
                            setNewTaskForm({ title: '', description: '', category: 'on_site' });
                          }}
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing Tasks */}
                {tasks && tasks.length > 0 ? (
                  tasks.map((task: any) => (
                    <div key={task.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => toggleTaskMutation.mutate({ taskId: task.id, isCompleted: !task.isCompleted })}
                          disabled={toggleTaskMutation.isPending}
                        >
                          {task.isCompleted ? (
                            <CheckSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                          )}
                        </button>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        {task.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {task.category === 'pre_visit' ? 'Pre-Visit' : 
                             task.category === 'on_site' ? 'On-Site' : 'Post-Site'}
                          </Badge>
                          {task.isCompleted && task.completedAt && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Completed {new Date(task.completedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge 
                        variant={task.isCompleted ? "secondary" : "outline"} 
                        className={`text-xs ${task.isCompleted ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : ''}`}
                      >
                        {task.isCompleted ? 'Completed' : 'Pending'}
                      </Badge>
                    </div>
                  ))
                ) : !showAddTaskForm ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                    No tasks added yet. Click "Add Task" to create one.
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div>
                  <span className="font-medium">Created:</span>{' '}
                  {new Date(workOrder.createdAt).toLocaleString()}
                </div>
                {workOrder.createdBy && (
                  <div>
                    <span className="font-medium">Created by:</span>{' '}
                    {workOrder.createdBy.firstName} {workOrder.createdBy.lastName}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}