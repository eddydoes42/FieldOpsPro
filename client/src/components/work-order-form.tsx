import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertWorkOrderSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { useState } from "react";

const workOrderFormSchema = insertWorkOrderSchema.extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  location: z.string().min(1, "Location is required"),
  scopeOfWork: z.string().optional(),
  requiredTools: z.string().optional(),
  pointOfContact: z.string().optional(),
  priority: z.string().min(1, "Priority is required"),
  dueDate: z.string().optional(),
  estimatedHours: z.string().optional(),
  // Budget fields
  budgetType: z.string().optional(),
  budgetAmount: z.string().optional(),
  devicesInstalled: z.string().optional(),
});

interface Task {
  title: string;
  description: string;
  category: 'pre_visit' | 'on_site' | 'post_site';
}

interface WorkOrderFormProps {
  onClose?: () => void;
  onSuccess: () => void;
  isClient?: boolean;
}

export default function WorkOrderForm({ onClose, onSuccess, isClient = false }: WorkOrderFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState<Task>({
    title: '',
    description: '',
    category: 'pre_visit'
  });

  const { data: fieldAgents } = useQuery({
    queryKey: ["/api/users/role/field_agent"],
  });

  const form = useForm({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      scopeOfWork: "",
      requiredTools: "",
      pointOfContact: "",
      priority: "medium",
      assigneeId: "",
      dueDate: "",
      estimatedHours: "",
      budgetType: "",
      budgetAmount: "",
      devicesInstalled: "",
    },
  });

  const createWorkOrderMutation = useMutation({
    mutationFn: async (workOrderData: any) => {
      const data = {
        ...workOrderData,
        dueDate: workOrderData.dueDate ? new Date(workOrderData.dueDate).toISOString() : null,
        estimatedHours: workOrderData.estimatedHours ? parseFloat(workOrderData.estimatedHours) : null,
        isClientCreated: isClient,
        // Include budget information if provided
        budgetType: workOrderData.budgetType || null,
        budgetAmount: workOrderData.budgetAmount ? parseFloat(workOrderData.budgetAmount) : null,
        devicesInstalled: workOrderData.devicesInstalled ? parseInt(workOrderData.devicesInstalled) : null,
      };
      const response = await apiRequest("POST", "/api/work-orders", data);
      const createdWorkOrder = await response.json();
      
      // Create tasks for the work order
      if (tasks.length > 0) {
        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];
          await apiRequest("POST", `/api/work-orders/${createdWorkOrder.id}/tasks`, {
            ...task,
            orderIndex: i
          });
        }
      }
      
      return createdWorkOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-network/work-orders"] });
      setTasks([]);
      onSuccess();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
        description: "Failed to create work order.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createWorkOrderMutation.mutate(data);
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    setTasks([...tasks, newTask]);
    setNewTask({ title: '', description: '', category: 'pre_visit' });
    toast({
      title: "Task Added",
      description: "Task has been added to the work order",
    });
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-1 overflow-y-auto">
      <Card className="max-w-2xl w-full min-h-fit my-1 flex flex-col bg-white dark:bg-gray-900 max-h-[98vh] overflow-hidden">
        <CardHeader className="pb-2 px-3 pt-3 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
              {isClient ? "Create Work Order Request" : "Create New Work Order"}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-3 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
              {isClient ? (
                // Simplified client form
                <>
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Title *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter work order title" 
                            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Description *</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={1}
                            placeholder="Describe the work to be performed"
                            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 min-h-[32px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Location *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter location details"
                            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Priority *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Due Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local"
                            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Budget Information for Client */}
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">💰 Budget Information (Optional)</h4>
                    <div className="space-y-2">
                      <FormField
                        control={form.control}
                        name="budgetType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-green-900 dark:text-green-100">Budget Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                                  <SelectValue placeholder="Select budget type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="fixed">Fixed Amount</SelectItem>
                                <SelectItem value="hourly">Hourly Rate</SelectItem>
                                <SelectItem value="per_device">Per Device</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {form.watch("budgetType") && (
                        <FormField
                          control={form.control}
                          name="budgetAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-green-900 dark:text-green-100">
                                {form.watch("budgetType") === "fixed" && "Fixed Amount ($)"}
                                {form.watch("budgetType") === "hourly" && "Hourly Rate ($)"}
                                {form.watch("budgetType") === "per_device" && "Price Per Device ($)"}
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="Enter amount"
                                  className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {form.watch("budgetType") === "per_device" && (
                        <FormField
                          control={form.control}
                          name="devicesInstalled"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-green-900 dark:text-green-100">Number of Devices</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  min="1"
                                  placeholder="Enter number of devices"
                                  className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                </>
              ) : (
                // Full management form
                <>
                  {/* Work Order Details */}
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Work Order Details</h3>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Title *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter work order title"
                                className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Description *</FormLabel>
                            <FormControl>
                              <Textarea 
                                rows={3}
                                placeholder="Describe the work to be performed"
                                className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Work Details */}
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Work Details</h3>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="scopeOfWork"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Scope of Work</FormLabel>
                            <FormControl>
                              <Textarea 
                                rows={3}
                                placeholder="Detailed breakdown of tasks and responsibilities" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="requiredTools"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Required Tools & Equipment</FormLabel>
                            <FormControl>
                              <Textarea 
                                rows={2}
                                placeholder="List tools, equipment, and materials needed" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pointOfContact"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Point of Contact</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Name and contact information of client/site contact" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Location & Scheduling */}
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Location & Scheduling</h3>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter location details" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl>
                              <Input type="datetime-local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="estimatedHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimated Hours</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0.5" 
                                max="40" 
                                step="0.5"
                                placeholder="Enter estimated hours" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Tasks Section - Only visible to management */}
              {!isClient && (
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">📋 Pre-Define Tasks</h3>
                  <Badge variant="secondary" className="bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200 text-xs">
                    {tasks.length} tasks ready
                  </Badge>
                </div>
                
                {/* Add Task Form */}
                <Card className="mb-3 border-dashed border-2 border-blue-300 dark:border-blue-700">
                  <CardContent className="pt-3 pb-3">
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-medium text-blue-900 dark:text-blue-100">Category</label>
                          <Select 
                            value={newTask.category} 
                            onValueChange={(value) => setNewTask({ ...newTask, category: value as any })}
                          >
                            <SelectTrigger className="mt-1 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pre_visit">🚗 Pre-Site</SelectItem>
                              <SelectItem value="on_site">🔧 On-Site</SelectItem>
                              <SelectItem value="post_site">📋 Post-Site</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-blue-900 dark:text-blue-100">Task Title</label>
                          <Input
                            value={newTask.title}
                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                            placeholder="Enter task title"
                            className="mt-1 h-8"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-blue-900 dark:text-blue-100">Description (Optional)</label>
                        <Textarea
                          value={newTask.description}
                          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                          placeholder="Enter task description"
                          rows={1}
                          className="mt-1 min-h-[32px]"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleAddTask}
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-8"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Task to Work Order
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Tasks List */}
                {tasks.length > 0 && (
                  <div className="space-y-1">
                    {['pre_visit', 'on_site', 'post_site'].map(category => {
                      const categoryTasks = tasks.filter(task => task.category === category);
                      if (categoryTasks.length === 0) return null;
                      
                      return (
                        <div key={category}>
                          <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                            {getCategoryLabel(category)} ({categoryTasks.length})
                          </h4>
                          <div className="space-y-1">
                            {categoryTasks.map((task, index) => {
                              const globalIndex = tasks.findIndex(t => t === task);
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
                                    onClick={() => handleRemoveTask(globalIndex)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
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
              )}

              {/* Assignment - Only visible to management */}
              {!isClient && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment</h3>
                  <FormField
                    control={form.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Agent</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select field agent" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {(fieldAgents as any)?.map((agent: any) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.firstName} {agent.lastName} - {agent.role === 'field_agent' ? 'FA' : agent.role?.replace('_', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}


              {/* Action Buttons */}
              <div className="flex space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700 mt-3 sticky bottom-0 bg-white dark:bg-gray-900 -mx-3 px-3 pb-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 dark:border-gray-600 h-9"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createWorkOrderMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 h-9"
                  size="sm"
                >
                  {createWorkOrderMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
