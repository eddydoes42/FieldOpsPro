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
import { DatePicker } from "@/components/ui/date-picker";

const workOrderFormSchema = insertWorkOrderSchema.extend({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  location: z.string().min(1, "Location is required"), // Keep for backwards compatibility
  // Address fields
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "Zip code is required"),
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
  // Documents Required field
  documentsRequired: z.string().optional(),
});

interface Task {
  title: string;
  description: string;
  category: 'pre_visit' | 'on_site' | 'post_site';
}

interface Tool {
  name: string;
  description: string;
  category: 'hardware' | 'software' | 'safety' | 'testing' | 'other';
  isRequired: boolean;
}

interface Document {
  name: string;
  description: string;
  category: 'reference' | 'procedure' | 'checklist' | 'form' | 'other';
  fileUrl?: string;
  isRequired: boolean;
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

  const [tools, setTools] = useState<Tool[]>([]);
  const [newTool, setNewTool] = useState<Tool>({
    name: '',
    description: '',
    category: 'hardware',
    isRequired: true
  });

  const [documents, setDocuments] = useState<Document[]>([]);
  const [newDocument, setNewDocument] = useState<Document>({
    name: '',
    description: '',
    category: 'reference',
    fileUrl: '',
    isRequired: true
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
      address: "",
      city: "",
      state: "",
      zipCode: "",
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
      documentsRequired: "",
    },
  });

  const createWorkOrderMutation = useMutation({
    mutationFn: async (workOrderData: any) => {
      // Combine address fields into a single location for backwards compatibility
      const fullLocation = [
        workOrderData.address,
        workOrderData.city,
        workOrderData.state,
        workOrderData.zipCode
      ].filter(Boolean).join(', ');
      
      const data = {
        ...workOrderData,
        location: fullLocation, // Combined location for backwards compatibility
        dueDate: workOrderData.dueDate ? new Date(workOrderData.dueDate).toISOString() : null,
        estimatedHours: workOrderData.estimatedHours ? parseFloat(workOrderData.estimatedHours) : null,
        isClientCreated: isClient,
        // Include budget information if provided
        budgetType: workOrderData.budgetType || null,
        budgetAmount: workOrderData.budgetAmount ? parseFloat(workOrderData.budgetAmount) : null,
        devicesInstalled: workOrderData.devicesInstalled ? parseInt(workOrderData.devicesInstalled) : null,
        // Include documents required if provided
        documentsRequired: workOrderData.documentsRequired ? parseInt(workOrderData.documentsRequired) : 0,
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
    onError: (error: any) => {
      console.error("Work order creation error:", error);
      
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
      
      // Try to extract specific error message
      let errorMessage = "Failed to create work order.";
      if (error?.response?.text) {
        try {
          const errorData = JSON.parse(error.response.text);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Use default message if parsing fails
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    const submissionData = {
      ...data,
      isClient,
      tasks,
      tools,
      documents
    };
    console.log("Submitting work order data:", submissionData);
    createWorkOrderMutation.mutate(submissionData);
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

  const handleAddTool = () => {
    if (!newTool.name.trim()) {
      toast({
        title: "Error",
        description: "Tool name is required",
        variant: "destructive",
      });
      return;
    }

    setTools([...tools, newTool]);
    setNewTool({ name: '', description: '', category: 'hardware', isRequired: true });
    toast({
      title: "Tool Added",
      description: "Tool has been added to the work order",
    });
  };

  const handleRemoveTool = (index: number) => {
    setTools(tools.filter((_, i) => i !== index));
  };

  const handleAddDocument = () => {
    if (!newDocument.name.trim()) {
      toast({
        title: "Error",
        description: "Document name is required",
        variant: "destructive",
      });
      return;
    }

    setDocuments([...documents, newDocument]);
    setNewDocument({ name: '', description: '', category: 'reference', fileUrl: '', isRequired: true });
    toast({
      title: "Document Added",
      description: "Document has been added to the work order",
    });
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'pre_visit': return 'Pre-Site';
      case 'on_site': return 'On-Site';
      case 'post_site': return 'Post-Site';
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

  const getToolCategoryLabel = (category: string) => {
    switch (category) {
      case 'hardware': return 'Hardware';
      case 'software': return 'Software';
      case 'safety': return 'Safety';
      case 'testing': return 'Testing';
      case 'other': return 'Other';
      default: return category;
    }
  };

  const getToolCategoryColor = (category: string) => {
    switch (category) {
      case 'hardware': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'software': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'safety': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'testing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'other': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  const getDocumentCategoryLabel = (category: string) => {
    switch (category) {
      case 'reference': return 'Reference';
      case 'procedure': return 'Procedure';
      case 'checklist': return 'Checklist';
      case 'form': return 'Form';
      case 'other': return 'Other';
      default: return category;
    }
  };

  const getDocumentCategoryColor = (category: string) => {
    switch (category) {
      case 'reference': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'procedure': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'checklist': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'form': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'other': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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
        
        <CardContent className="flex-1 p-3 overflow-y-auto scrollbar-minimal">
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
                  {/* Address Fields */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Address *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter street address"
                            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">City *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter city"
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
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">State *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter state"
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
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Zip Code *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter zip code"
                              className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
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
                          <DatePicker
                            date={field.value ? new Date(field.value) : undefined}
                            onDateChange={(date) => field.onChange(date ? date.toISOString() : '')}
                            placeholder="Select due date & time"
                            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            includeTime={true}
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
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value === '' ? '' : e.target.value)}
                                  onBlur={field.onBlur}
                                  name={field.name}
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

                  {/* Task Management for Client */}
                  <div className="form-section-minimal border-t border-gray-200 dark:border-gray-700 pt-3">
                    <h4 className="form-label-minimal mb-2">Add Tasks (Optional)</h4>
                    <div className="form-minimal">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="form-label-minimal">Category</label>
                          <Select 
                            value={newTask.category} 
                            onValueChange={(value) => setNewTask({ ...newTask, category: value as any })}
                          >
                            <SelectTrigger className="form-select-minimal">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pre_visit">Pre-Site</SelectItem>
                              <SelectItem value="on_site">On-Site</SelectItem>
                              <SelectItem value="post_site">Post-Site</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="form-label-minimal">Task Title</label>
                          <Input
                            value={newTask.title}
                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                            placeholder="Enter task title"
                            className="form-input-minimal"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="form-label-minimal">Description (Optional)</label>
                        <Textarea
                          value={newTask.description}
                          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                          placeholder="Enter task description"
                          rows={1}
                          className="form-textarea-minimal min-h-[32px]"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleAddTask}
                        className="form-button-primary-minimal w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task to Work Order
                      </Button>
                    </div>

                    {/* Tasks List for Client */}
                    {tasks.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {['pre_visit', 'on_site', 'post_site'].map(category => {
                          const categoryTasks = tasks.filter(task => task.category === category);
                          if (categoryTasks.length === 0) return null;
                          
                          return (
                            <div key={category}>
                              <h5 className="form-label-minimal text-xs mb-1">
                                {getCategoryLabel(category)} ({categoryTasks.length})
                              </h5>
                              <div className="space-y-1">
                                {categoryTasks.map((task, index) => {
                                  const globalIndex = tasks.findIndex(t => t === task);
                                  return (
                                    <div
                                      key={globalIndex}
                                      className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded-md"
                                    >
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <Badge className={getCategoryColor(task.category)} variant="secondary">
                                            {getCategoryLabel(task.category)}
                                          </Badge>
                                          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{task.title}</span>
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
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
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
                              <DatePicker
                                date={field.value ? new Date(field.value) : undefined}
                                onDateChange={(date) => field.onChange(date ? date.toISOString() : '')}
                                placeholder="Select due date & time"
                                className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                                includeTime={true}
                              />
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
                      <FormField
                        control={form.control}
                        name="documentsRequired"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Documents Required</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                max="20" 
                                step="1"
                                placeholder="0"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-xs text-muted-foreground">
                              document(s) to be uploaded by Service Company users
                            </p>
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
                  <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">Pre-Define Tasks</h3>
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
                              <SelectItem value="pre_visit">Pre-Site</SelectItem>
                              <SelectItem value="on_site">On-Site</SelectItem>
                              <SelectItem value="post_site">Post-Site</SelectItem>
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

              {/* Tools Management - Only visible to management */}
              {!isClient && (
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100">Required Tools</h3>
                    <Badge variant="secondary" className="bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200 text-xs">
                      {tools.length} tools specified
                    </Badge>
                  </div>
                  
                  {/* Add Tool Form */}
                  <Card className="mb-3 border-dashed border-2 border-blue-300 dark:border-blue-700">
                    <CardContent className="pt-3 pb-3">
                      <div className="form-minimal">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="form-label-minimal">Category</label>
                            <Select 
                              value={newTool.category} 
                              onValueChange={(value) => setNewTool({ ...newTool, category: value as any })}
                            >
                              <SelectTrigger className="form-select-minimal">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hardware">Hardware</SelectItem>
                                <SelectItem value="software">Software</SelectItem>
                                <SelectItem value="safety">Safety</SelectItem>
                                <SelectItem value="testing">Testing</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="form-label-minimal">Tool Name</label>
                            <Input
                              value={newTool.name}
                              onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
                              placeholder="Enter tool name"
                              className="form-input-minimal"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="form-label-minimal">Description (Optional)</label>
                          <Textarea
                            value={newTool.description}
                            onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
                            placeholder="Enter tool description"
                            rows={1}
                            className="form-textarea-minimal"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={newTool.isRequired}
                            onChange={(e) => setNewTool({ ...newTool, isRequired: e.target.checked })}
                            className="w-3 h-3"
                          />
                          <label className="form-label-minimal">Required Tool</label>
                        </div>
                        <Button
                          type="button"
                          onClick={handleAddTool}
                          size="sm"
                          className="form-button-primary-minimal w-full"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Tool to Work Order
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tools List */}
                  {tools.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {['hardware', 'software', 'safety', 'testing', 'other'].map(category => {
                        const categoryTools = tools.filter(tool => tool.category === category);
                        if (categoryTools.length === 0) return null;
                        
                        return (
                          <div key={category}>
                            <h5 className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">
                              {getToolCategoryLabel(category)} ({categoryTools.length})
                            </h5>
                            <div className="space-y-1">
                              {categoryTools.map((tool, index) => {
                                const globalIndex = tools.findIndex(t => t === tool);
                                return (
                                  <div
                                    key={globalIndex}
                                    className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border shadow-sm"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <Badge className={getToolCategoryColor(tool.category)} variant="secondary">
                                          {getToolCategoryLabel(tool.category)}
                                        </Badge>
                                        <span className="font-medium text-sm">{tool.name}</span>
                                        {tool.isRequired && (
                                          <Badge variant="destructive" className="text-xs">Required</Badge>
                                        )}
                                      </div>
                                      {tool.description && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                          {tool.description}
                                        </p>
                                      )}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveTool(globalIndex)}
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

              {/* Documents Management - Only visible to management */}
              {!isClient && (
                <div className="bg-indigo-50 dark:bg-indigo-950 p-3 rounded-lg border-2 border-indigo-200 dark:border-indigo-800">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-indigo-900 dark:text-indigo-100">📄 Required Documents</h3>
                    <Badge variant="secondary" className="bg-indigo-200 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-200 text-xs">
                      {documents.length} documents specified
                    </Badge>
                  </div>
                  
                  {/* Add Document Form */}
                  <Card className="mb-3 border-dashed border-2 border-indigo-300 dark:border-indigo-700">
                    <CardContent className="pt-3 pb-3">
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-medium text-indigo-900 dark:text-indigo-100">Category</label>
                            <Select 
                              value={newDocument.category} 
                              onValueChange={(value) => setNewDocument({ ...newDocument, category: value as any })}
                            >
                              <SelectTrigger className="mt-1 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="reference">📖 Reference</SelectItem>
                                <SelectItem value="procedure">Procedure</SelectItem>
                                <SelectItem value="checklist">✅ Checklist</SelectItem>
                                <SelectItem value="form">📄 Form</SelectItem>
                                <SelectItem value="other">📎 Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-indigo-900 dark:text-indigo-100">Document Name</label>
                            <Input
                              value={newDocument.name}
                              onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
                              placeholder="Enter document name"
                              className="mt-1 h-8"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-indigo-900 dark:text-indigo-100">Description (Optional)</label>
                          <Textarea
                            value={newDocument.description}
                            onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                            placeholder="Enter document description"
                            rows={1}
                            className="mt-1 min-h-[32px]"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-indigo-900 dark:text-indigo-100">File URL (Optional)</label>
                          <Input
                            value={newDocument.fileUrl || ''}
                            onChange={(e) => setNewDocument({ ...newDocument, fileUrl: e.target.value })}
                            placeholder="Enter document URL or file path"
                            className="mt-1 h-8"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={newDocument.isRequired}
                            onChange={(e) => setNewDocument({ ...newDocument, isRequired: e.target.checked })}
                            className="w-3 h-3"
                          />
                          <label className="text-xs font-medium text-indigo-900 dark:text-indigo-100">Required Document</label>
                        </div>
                        <Button
                          type="button"
                          onClick={handleAddDocument}
                          size="sm"
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-8"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Document to Work Order
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Documents List */}
                  {documents.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {['reference', 'procedure', 'checklist', 'form', 'other'].map(category => {
                        const categoryDocs = documents.filter(doc => doc.category === category);
                        if (categoryDocs.length === 0) return null;
                        
                        return (
                          <div key={category}>
                            <h5 className="text-xs font-semibold text-indigo-800 dark:text-indigo-200 mb-1">
                              {getDocumentCategoryLabel(category)} ({categoryDocs.length})
                            </h5>
                            <div className="space-y-1">
                              {categoryDocs.map((doc, index) => {
                                const globalIndex = documents.findIndex(d => d === doc);
                                return (
                                  <div
                                    key={globalIndex}
                                    className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border shadow-sm"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <Badge className={getDocumentCategoryColor(doc.category)} variant="secondary">
                                          {getDocumentCategoryLabel(doc.category)}
                                        </Badge>
                                        <span className="font-medium text-sm">{doc.name}</span>
                                        {doc.isRequired && (
                                          <Badge variant="destructive" className="text-xs">Required</Badge>
                                        )}
                                      </div>
                                      {doc.description && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                          {doc.description}
                                        </p>
                                      )}
                                      {doc.fileUrl && (
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                          📎 {doc.fileUrl}
                                        </p>
                                      )}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveDocument(globalIndex)}
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
