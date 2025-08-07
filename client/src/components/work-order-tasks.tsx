import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description?: string;
  category: 'pre_visit' | 'on_site' | 'post_site';
  isCompleted: boolean;
  completedAt?: string;
  completedById?: string;
  orderIndex: number;
}

interface WorkOrderTasksProps {
  workOrderId: string;
  userRole: string;
}

export default function WorkOrderTasks({ workOrderId, userRole }: WorkOrderTasksProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'pre_visit' as const
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['/api/work-orders', workOrderId, 'tasks'],
    queryFn: () => apiRequest(`/api/work-orders/${workOrderId}/tasks`),
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData: any) => 
      apiRequest(`/api/work-orders/${workOrderId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(taskData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders', workOrderId, 'tasks'] });
      setNewTask({ title: '', description: '', category: 'pre_visit' });
      setShowAddForm(false);
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: any }) =>
      apiRequest(`/api/work-order-tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders', workOrderId, 'tasks'] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) =>
      apiRequest(`/api/work-order-tasks/${taskId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders', workOrderId, 'tasks'] });
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  const handleCreateTask = () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    createTaskMutation.mutate({
      ...newTask,
      orderIndex: tasks.filter((t: Task) => t.category === newTask.category).length,
    });
  };

  const handleToggleComplete = (task: Task) => {
    updateTaskMutation.mutate({
      taskId: task.id,
      updates: {
        isCompleted: !task.isCompleted,
      },
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const getCategoryTasks = (category: string) => {
    return tasks.filter((task: Task) => task.category === category);
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'pre_visit': return '🚗 Pre-Site Tasks';
      case 'on_site': return '🔧 On-Site Tasks';
      case 'post_site': return '📋 Post-Site Tasks';
      default: return category;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'pre_visit': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'on_site': return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'post_site': return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      default: return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const canManageTasks = userRole === 'administrator' || userRole === 'manager';
  const canCompleTeTasks = userRole === 'administrator' || userRole === 'manager' || userRole === 'field_agent';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Task Management</h3>
        {canManageTasks && (
          <Button
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card className="border-dashed border-2">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category</label>
                <select
                  value={newTask.category}
                  onChange={(e) => setNewTask({ ...newTask, category: e.target.value as any })}
                  className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="pre_visit">Pre-Site Tasks</option>
                  <option value="on_site">On-Site Tasks</option>
                  <option value="post_site">Post-Site Tasks</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Title *</label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task title"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Enter task description (optional)"
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateTask}
                  disabled={createTaskMutation.isPending}
                  size="sm"
                >
                  {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewTask({ title: '', description: '', category: 'pre_visit' });
                  }}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Categories */}
      {['pre_visit', 'on_site', 'post_site'].map((category) => {
        const categoryTasks = getCategoryTasks(category);
        return (
          <Card key={category} className={`border-l-4 ${getCategoryColor(category)}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                {getCategoryTitle(category)}
                <Badge variant="secondary">
                  {categoryTasks.filter(t => t.isCompleted).length} / {categoryTasks.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryTasks.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No tasks in this category</p>
              ) : (
                <div className="space-y-3">
                  {categoryTasks.map((task: Task) => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-lg border ${
                        task.isCompleted
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-card border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {canCompleTeTasks && (
                          <Checkbox
                            checked={task.isCompleted}
                            onCheckedChange={() => handleToggleComplete(task)}
                            className="mt-0.5"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium ${task.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className={`text-sm mt-1 ${task.isCompleted ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                              {task.description}
                            </p>
                          )}
                          {task.isCompleted && task.completedAt && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Completed on {new Date(task.completedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {canManageTasks && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}