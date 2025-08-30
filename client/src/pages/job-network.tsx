import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Network,
  Plus,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  Users,
  Building2,
  Search,
  Filter,
  Eye,
  ArrowLeft,
  Home,
  Trash2,
  Upload,
  FileText,
  X
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, canPostToJobNetwork, isAdminTeam, isClient, insertJobNetworkPostSchema, isOperationsDirector, canManageWorkOrders, insertWorkOrderSchema } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import Navigation from '@/components/navigation';
import RoleSwitcher from '@/components/role-switcher';
import { DocumentUploader } from '@/components/DocumentUploader';



const requestJobSchema = z.object({
  workOrderId: z.string(),
  workOrderTitle: z.string(),
  clientCompanyId: z.string(),
  requestingCompanyId: z.string(),
  requestedById: z.string(),
  message: z.string().optional(),
  proposedAgentId: z.string().optional(),
});

const createWorkOrderSchema = insertWorkOrderSchema.omit({ 
  dueDate: true,
  budgetAmount: true,
  estimatedHours: true 
}).extend({
  budget: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.string().optional(),
  clientCompanyId: z.string().optional(), // For Operations Director posting on behalf of client
});

interface Task {
  title: string;
  description: string;
  category: 'pre_visit' | 'on_site' | 'post_site';
  documentsRequired: number;
}

interface Tool {
  name: string;
  description: string;
  category: 'hardware' | 'software' | 'safety' | 'testing' | 'other';
  isRequired: boolean;
}

interface JobNetworkProps {
  user: User;
  testingRole?: string;
  onRoleSwitch?: (role: string) => void;
}

export default function JobNetwork({ user, testingRole, onRoleSwitch }: JobNetworkProps) {

  const [isCreateWorkOrderOpen, setIsCreateWorkOrderOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isRequestJobOpen, setIsRequestJobOpen] = useState(false);
  const [selectedJobForRequest, setSelectedJobForRequest] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Task and Tool Management State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState<Task>({
    title: '',
    description: '',
    category: 'pre_visit',
    documentsRequired: 0
  });
  const [tools, setTools] = useState<Tool[]>([]);
  const [newTool, setNewTool] = useState<Tool>({
    name: '',
    description: '',
    category: 'hardware',
    isRequired: true
  });

  // Initial File Upload State
  const [initialFiles, setInitialFiles] = useState<File[]>([]);
  const [showInitialFileUploader, setShowInitialFileUploader] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);



  const requestForm = useForm({
    resolver: zodResolver(requestJobSchema),
    defaultValues: {
      workOrderId: '',
      workOrderTitle: '',
      clientCompanyId: '',
      requestingCompanyId: user.companyId || '',
      requestedById: user.id,
      message: '',
      proposedAgentId: '',
    },
  });

  const workOrderForm = useForm({
    resolver: zodResolver(createWorkOrderSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      priority: 'normal',
      status: 'scheduled',
      budget: '',
      budgetType: 'fixed',
      estimatedHours: '',
      dueDate: '',
      companyId: user.companyId || '',
      createdById: user.id,
      clientCompanyId: '', // For Operations Director to select client company
    },
  });

  // Query for job network posts
  const { data: jobPosts = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/job-network'],
  });

  // Query for service companies
  const { data: serviceCompanies = [] } = useQuery<any[]>({
    queryKey: ['/api/companies/service'],
  });

  // Query for field agents (for service companies to propose agents)
  const { data: fieldAgents = [] } = useQuery<any[]>({
    queryKey: ['/api/users/field-agents'],
    enabled: isAdminTeam(user),
  });

  // Query for client companies (for Operations Director)
  const { data: clientCompanies = [] } = useQuery<any[]>({
    queryKey: ['/api/companies/client'],
    enabled: isOperationsDirector(user) && !testingRole,
  });

  // Request job mutation
  const requestJobMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/work-order-requests', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-order-requests'] });
      setIsRequestJobOpen(false);
      requestForm.reset();
      toast({
        title: 'Success',
        description: 'Work order request sent successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send request',
        variant: 'destructive',
      });
    },
  });

  // Assign job mutation
  const assignJobMutation = useMutation({
    mutationFn: async ({ jobId, companyId }: { jobId: string; companyId: string }) => {
      return apiRequest(`/api/job-network/${jobId}/assign`, 'PATCH', { 
        assignedToCompanyId: companyId, 
        assignedById: user.id 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-network'] });
      toast({
        title: 'Success',
        description: 'Job assigned successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign job',
        variant: 'destructive',
      });
    },
  });

  // Create work order mutation
  const createWorkOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/work-orders', data);
      const createdWorkOrder = await response.json();
      
      // Create tasks for the work order
      if (tasks.length > 0) {
        for (let i = 0; i < tasks.length; i++) {
          const task = tasks[i];
          await apiRequest('POST', `/api/work-orders/${createdWorkOrder.id}/tasks`, {
            ...task,
            orderIndex: i
          });
        }
      }
      
      return createdWorkOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/job-network'] });
      setIsCreateWorkOrderOpen(false);
      workOrderForm.reset();
      setTasks([]);
      setTools([]);
      setInitialFiles([]);
      toast({
        title: 'Success',
        description: 'Work order created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create work order',
        variant: 'destructive',
      });
    },
  });



  const onRequestSubmit = (data: any) => {
    requestJobMutation.mutate(data);
  };

  // Currency formatting utility
  const formatCurrency = (value: string) => {
    // Remove all non-digit characters
    const numericValue = value.replace(/[^\d]/g, '');
    
    if (!numericValue) return '';
    
    // Convert to number and format with commas
    const number = parseInt(numericValue);
    return `$${number.toLocaleString()}`;
  };

  const parseCurrency = (value: string) => {
    // Remove currency symbol and commas, return numeric value
    return value.replace(/[$,]/g, '');
  };

  const onWorkOrderSubmit = (data: any) => {
    createWorkOrderMutation.mutate({
      ...data,
      budgetAmount: data.budget ? parseFloat(parseCurrency(data.budget)) : null,
      estimatedHours: data.estimatedHours ? parseInt(data.estimatedHours) : null,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      tasks,
      tools
    });
  };

  // Task Management Functions
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
    setNewTask({ title: '', description: '', category: 'pre_visit', documentsRequired: 0 });
    toast({
      title: "Task Added",
      description: "Task has been added to the work order",
    });
  };

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  // Tool Management Functions
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

  // Initial File Upload Handlers
  const handleUploadClick = () => {
    // Trigger native file picker directly
    fileInputRef.current?.click();
  };

  const handleInitialFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setInitialFiles(prev => [...prev, ...files]);
      toast({
        title: "Files Selected",
        description: `${files.length} file(s) added for upload when work order is created`,
      });
    }
    // Reset so selecting the same file again still triggers onChange
    event.target.value = '';
  };

  const handleRemoveInitialFile = (index: number) => {
    setInitialFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Category Label Functions
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

  const getToolCategoryLabel = (category: string) => {
    switch (category) {
      case 'hardware': return '⚙️ Hardware';
      case 'software': return '💻 Software';
      case 'safety': return '🦺 Safety';
      case 'testing': return '🔍 Testing';
      case 'other': return '🔧 Other';
      default: return category;
    }
  };

  const getToolCategoryColor = (category: string) => {
    switch (category) {
      case 'hardware': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'software': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'safety': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'testing': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'other': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const handleRequestJob = (job: any) => {
    setSelectedJobForRequest(job);
    requestForm.setValue('workOrderId', job.id);
    requestForm.setValue('workOrderTitle', job.title);
    requestForm.setValue('clientCompanyId', job.clientCompanyId);
    setIsRequestJobOpen(true);
  };

  const filteredJobs = jobPosts.filter((job: any) => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Role Testers
  const ServiceCompanyRoleTester = () => {
    const [localTestingRole, setLocalTestingRole] = useState<string>(
      localStorage.getItem('testingCompanyType') === 'service' ? localStorage.getItem('testingRole') || '' : ''
    );

    const stopTesting = () => {
      localStorage.removeItem('testingRole');
      localStorage.removeItem('testingCompanyType');
      setLocalTestingRole('');
      if (onRoleSwitch) onRoleSwitch('');
      window.location.href = '/operations-dashboard';
    };

    return (
      <div className="bg-purple-600 text-white px-4 py-2 mb-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Service Company Role Tester:</span>
          <select
            value={localTestingRole}
            onChange={(e) => {
              const role = e.target.value;
              setLocalTestingRole(role);
              if (role) {
                localStorage.setItem('testingRole', role);
                localStorage.setItem('testingCompanyType', 'service');
                if (onRoleSwitch) onRoleSwitch(role);
                // Automatically redirect to appropriate dashboard for role testing
                window.location.href = '/dashboard';
              }
            }}
            className="bg-purple-700 text-white border border-purple-500 rounded px-2 py-1 text-sm"
          >
            <option value="">Select a Role</option>
            <option value="administrator">Administrator</option>
            <option value="project_manager">Project Manager</option>
            <option value="manager">Manager</option>
            <option value="dispatcher">Dispatcher</option>
            <option value="field_engineer">Field Engineer</option>
            <option value="field_agent">Field Agent</option>
          </select>
          {localTestingRole && (
            <Button
              onClick={stopTesting}
              size="sm"
              variant="outline"
              className="bg-purple-800 hover:bg-purple-900 text-white border-purple-400"
            >
              Stop Testing
            </Button>
          )}
        </div>
      </div>
    );
  };

  const ClientCompanyRoleTester = () => {
    const [localTestingRole, setLocalTestingRole] = useState<string>(
      localStorage.getItem('testingCompanyType') === 'client' ? localStorage.getItem('testingRole') || '' : ''
    );

    const stopTesting = () => {
      localStorage.removeItem('testingRole');
      localStorage.removeItem('testingCompanyType');
      setLocalTestingRole('');
      if (onRoleSwitch) onRoleSwitch('');
      window.location.href = '/operations-dashboard';
    };

    return (
      <div className="bg-teal-600 text-white px-4 py-2 mb-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Client Company Role Tester:</span>
          <select
            value={localTestingRole}
            onChange={(e) => {
              const role = e.target.value;
              setLocalTestingRole(role);
              if (role) {
                localStorage.setItem('testingRole', role);
                localStorage.setItem('testingCompanyType', 'client');
                if (onRoleSwitch) onRoleSwitch(role);
                // Automatically redirect to appropriate dashboard for role testing
                window.location.href = '/client-dashboard';
              }
            }}
            className="bg-teal-700 text-white border border-teal-500 rounded px-2 py-1 text-sm"
          >
            <option value="">Select a Role</option>
            <option value="administrator">Administrator</option>
            <option value="project_manager">Project Manager</option>
            <option value="manager">Manager</option>
            <option value="dispatcher">Dispatcher</option>
          </select>
          {localTestingRole && (
            <Button
              onClick={stopTesting}
              size="sm"
              variant="outline"
              className="bg-teal-800 hover:bg-teal-900 text-white border-teal-400"
            >
              Stop Testing
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      {/* Role Testers - Always present for Operations Director */}
      {isOperationsDirector(user) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <ServiceCompanyRoleTester />
          <ClientCompanyRoleTester />
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const selectedRole = localStorage.getItem('selectedRole');
                  const testingRole = localStorage.getItem('testingRole');
                  if (testingRole === 'operations_director' || selectedRole === 'operations_director') {
                    window.location.href = '/operations-dashboard';
                  } else {
                    window.location.href = '/dashboard';
                  }
                }}
                className="flex items-center space-x-1"
              >
                <Home className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.history.back()}
                className="flex items-center space-x-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                  <Network className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  <span>Job Network</span>
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Public work order postings for all Admin Teams
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Create Work Order Button - for Administrators, Project Managers, Managers, and Operations Director (when not role testing) */}
              {((canManageWorkOrders(user) || (isOperationsDirector(user) && !testingRole)) || 
                (user as any)?.roles?.includes('project_manager')) && (
                <Dialog open={isCreateWorkOrderOpen} onOpenChange={setIsCreateWorkOrderOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Work Order
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Work Order</DialogTitle>
                    </DialogHeader>
                    <Form {...workOrderForm}>
                      <form onSubmit={workOrderForm.handleSubmit(onWorkOrderSubmit)} className="space-y-6">
                        <FormField
                          control={workOrderForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Work Order Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter work order title" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={workOrderForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Enter work order description"
                                  className="min-h-[100px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Client Company Selection for Operations Director */}
                        {isOperationsDirector(user) && !testingRole && (
                          <FormField
                            control={workOrderForm.control}
                            name="clientCompanyId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Posting on Behalf of Client</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select client company or post as Operations Director" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="operations_director">Operations Director (Self)</SelectItem>
                                    {clientCompanies.map((company: any) => (
                                      <SelectItem key={company.id} value={company.id}>
                                        {company.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={workOrderForm.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter location" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={workOrderForm.control}
                            name="priority"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Priority</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={workOrderForm.control}
                            name="budget"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Budget</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter budget amount" 
                                    type="text"
                                    value={field.value || ''}
                                    onChange={(e) => {
                                      const rawValue = e.target.value;
                                      // Allow complete clearing of the field
                                      if (rawValue === '' || rawValue === '$' || rawValue === '$0') {
                                        field.onChange('');
                                        return;
                                      }
                                      const formattedValue = formatCurrency(rawValue);
                                      field.onChange(formattedValue);
                                    }}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={workOrderForm.control}
                            name="budgetType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Budget Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select budget type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="fixed">Fixed</SelectItem>
                                    <SelectItem value="hourly">Hourly</SelectItem>
                                    <SelectItem value="per_device">Per Device</SelectItem>
                                    <SelectItem value="materials_labor">Materials + Labor</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={workOrderForm.control}
                            name="estimatedHours"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Estimated Hours</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Enter estimated hours" 
                                    type="number"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={workOrderForm.control}
                            name="dueDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Due Date</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="datetime-local"
                                    className="text-white dark:text-white bg-gray-800 dark:bg-gray-800 [&::-webkit-calendar-picker-indicator]:brightness-0 [&::-webkit-calendar-picker-indicator]:invert"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Tasks Section */}
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
                                <div>
                                  <label className="text-xs font-medium text-blue-900 dark:text-blue-100">Documents Required</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={newTask.documentsRequired}
                                    onChange={(e) => setNewTask({ ...newTask, documentsRequired: parseInt(e.target.value) || 0 })}
                                    placeholder="0"
                                    className="mt-1 h-8"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Number of documents Service Company users must upload for this task (0 = none required)
                                  </p>
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
                                                {task.documentsRequired > 0 && (
                                                  <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                                                    📄 {task.documentsRequired} doc{task.documentsRequired !== 1 ? 's' : ''} required
                                                  </Badge>
                                                )}
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

                        {/* Tools Section */}
                        <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-base font-semibold text-purple-900 dark:text-purple-100">🔧 Required Tools</h3>
                            <Badge variant="secondary" className="bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200 text-xs">
                              {tools.length} tools specified
                            </Badge>
                          </div>
                          
                          {/* Add Tool Form */}
                          <Card className="mb-3 border-dashed border-2 border-purple-300 dark:border-purple-700">
                            <CardContent className="pt-3 pb-3">
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs font-medium text-purple-900 dark:text-purple-100">Category</label>
                                    <Select 
                                      value={newTool.category} 
                                      onValueChange={(value) => setNewTool({ ...newTool, category: value as any })}
                                    >
                                      <SelectTrigger className="mt-1 h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="hardware">⚙️ Hardware</SelectItem>
                                        <SelectItem value="software">💻 Software</SelectItem>
                                        <SelectItem value="safety">🦺 Safety</SelectItem>
                                        <SelectItem value="testing">🔍 Testing</SelectItem>
                                        <SelectItem value="other">🔧 Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-purple-900 dark:text-purple-100">Tool Name</label>
                                    <Input
                                      value={newTool.name}
                                      onChange={(e) => setNewTool({ ...newTool, name: e.target.value })}
                                      placeholder="Enter tool name"
                                      className="mt-1 h-8"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-purple-900 dark:text-purple-100">Description (Optional)</label>
                                  <Textarea
                                    value={newTool.description}
                                    onChange={(e) => setNewTool({ ...newTool, description: e.target.value })}
                                    placeholder="Enter tool description"
                                    rows={1}
                                    className="mt-1 min-h-[32px]"
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    checked={newTool.isRequired}
                                    onChange={(e) => setNewTool({ ...newTool, isRequired: e.target.checked })}
                                    className="w-3 h-3"
                                  />
                                  <label className="text-xs font-medium text-purple-900 dark:text-purple-100">Required Tool</label>
                                </div>
                                <Button
                                  type="button"
                                  onClick={handleAddTool}
                                  size="sm"
                                  className="w-full bg-purple-600 hover:bg-purple-700 text-white h-8"
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
                                    <h5 className="text-xs font-semibold text-purple-800 dark:text-purple-200 mb-1">
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

                        {/* Document Upload Section */}
                        <div className="space-y-4 border-t pt-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Work Order Documents</h3>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleUploadClick}
                              className="flex items-center gap-2"
                            >
                              <Upload className="h-4 w-4" />
                              Upload Files
                            </Button>

                            {/* Hidden file input for native dialog */}
                            <input
                              type="file"
                              ref={fileInputRef}
                              style={{ display: 'none' }}
                              accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.txt"
                              multiple
                              onChange={handleInitialFileSelect}
                            />
                          </div>
                          
                          {/* Show uploaded initial files */}
                          {initialFiles.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-gray-700">Initial Files ({initialFiles.length})</h4>
                              <div className="space-y-1">
                                {initialFiles.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-blue-600" />
                                      <span className="text-sm font-medium">{file.name}</span>
                                      <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                                        {(file.size / 1024 / 1024).toFixed(1)}MB
                                      </Badge>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveInitialFile(index)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-blue-600">Pre-Visit Documents</h4>
                              <p className="text-xs text-gray-600">Job specifications, site plans, requirements</p>
                              <div className="text-xs text-gray-500 italic">
                                Upload documents after work order creation
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-green-600">During-Visit Documents</h4>
                              <p className="text-xs text-gray-600">Work logs, photos, progress reports</p>
                              <div className="text-xs text-gray-500 italic">
                                Upload documents after work order creation
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-purple-600">Post-Visit Documents</h4>
                              <p className="text-xs text-gray-600">Completion reports, certificates, invoices</p>
                              <div className="text-xs text-gray-500 italic">
                                Upload documents after work order creation
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Initial File Upload Modal */}
                        {showInitialFileUploader && (
                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Upload Initial Files</h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowInitialFileUploader(false)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="space-y-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Select files to be automatically uploaded when the work order is created and posted to the network.
                                </p>
                                <Input
                                  type="file"
                                  multiple
                                  accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.txt"
                                  onChange={handleInitialFileSelect}
                                  className="cursor-pointer"
                                />
                                <p className="text-xs text-gray-500">
                                  Allowed types: PDF, DOCX, XLSX, JPG, PNG, TXT
                                </p>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => setShowInitialFileUploader(false)}
                                  >
                                    Done
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsCreateWorkOrderOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createWorkOrderMutation.isPending}
                          >
                            {createWorkOrderMutation.isPending ? 'Creating...' : 'Create Work Order'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}

            </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Job Posts Grid */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Loading jobs...</p>
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job: any) => (
              <Card key={job.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                      {job.title}
                    </CardTitle>
                    <Badge 
                      variant={job.status === 'open' ? 'default' : job.status === 'assigned' ? 'secondary' : 'outline'}
                      className={
                        job.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        job.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                        ''
                      }
                    >
                      {job.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                    {job.description}
                  </p>
                  
                  <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {job.location}
                    </div>
                    
                    {job.budget && (
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        ${job.budget} ({job.budgetType})
                      </div>
                    )}
                    
                    {job.scheduledDate && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(job.scheduledDate).toLocaleDateString()}
                      </div>
                    )}
                    
                    {job.estimatedDuration && (
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        {job.estimatedDuration}
                      </div>
                    )}

                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-2" />
                      Public
                    </div>
                  </div>

                  {job.assignedToCompanyId && (
                    <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center text-green-700 dark:text-green-300">
                        <Building2 className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">
                          Assigned to Service Company
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 flex justify-between items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedJob(job)}
                    >
                      View Details
                    </Button>
                    
                    {isAdminTeam(user) && job.status === 'open' && !job.assignedToCompanyId && (
                      <Button
                        size="sm"
                        onClick={() => handleRequestJob(job)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Request Job
                      </Button>
                    )}
                    
                    {isClient(user) && job.createdById === user.id && job.status === 'open' && !job.assignedToCompanyId && (
                      <Select onValueChange={(companyId) => assignJobMutation.mutate({ jobId: job.id, companyId })}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Assign to..." />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceCompanies.map((company: any) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Network className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Jobs Available
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No jobs match your search criteria.' 
                  : 'No jobs have been posted to the network yet.'
                }
              </p>
            </CardContent>
          </Card>
        )}

        {/* Request Job Dialog */}
        <Dialog open={isRequestJobOpen} onOpenChange={setIsRequestJobOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Request Work Order</DialogTitle>
            </DialogHeader>
            <Form {...requestForm}>
              <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-6">
                {selectedJobForRequest && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Requesting: {selectedJobForRequest.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedJobForRequest.description}
                    </p>
                  </div>
                )}

                <FormField
                  control={requestForm.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message to Client (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Explain why your company is the best fit for this job..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={requestForm.control}
                  name="proposedAgentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proposed Field Agent (Optional)</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an agent to propose for this job" />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldAgents.map((agent: any) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.firstName} {agent.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={() => setIsRequestJobOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={requestJobMutation.isPending}>
                    {requestJobMutation.isPending ? 'Sending Request...' : 'Send Request'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Job Details Modal */}
        {selectedJob && (
          <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>{selectedJob.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Badge 
                    variant={selectedJob.status === 'open' ? 'default' : selectedJob.status === 'assigned' ? 'secondary' : 'outline'}
                    className={
                      selectedJob.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      selectedJob.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      ''
                    }
                  >
                    {selectedJob.status}
                  </Badge>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Priority: {selectedJob.priority}
                  </span>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Description</h4>
                  <p className="text-gray-600 dark:text-gray-400">{selectedJob.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Location</h4>
                    <p className="text-gray-600 dark:text-gray-400 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {selectedJob.location}
                    </p>
                  </div>

                  {selectedJob.budget && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Budget</h4>
                      <p className="text-gray-600 dark:text-gray-400 flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        ${selectedJob.budget} ({selectedJob.budgetType})
                      </p>
                    </div>
                  )}

                  {selectedJob.scheduledDate && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Scheduled Date</h4>
                      <p className="text-gray-600 dark:text-gray-400 flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(selectedJob.scheduledDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {selectedJob.estimatedDuration && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Duration</h4>
                      <p className="text-gray-600 dark:text-gray-400 flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        {selectedJob.estimatedDuration}
                      </p>
                    </div>
                  )}
                </div>

                {selectedJob.assignedToCompanyId && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Assignment Status</h4>
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center text-green-700 dark:text-green-300">
                        <Building2 className="h-4 w-4 mr-2" />
                        <span>Assigned to Service Company</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>
    </div>
  );
}