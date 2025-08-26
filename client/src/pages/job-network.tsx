import { useState, useEffect } from 'react';
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
  Home
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

const createJobSchema = insertJobNetworkPostSchema.extend({
  requiredSkills: z.array(z.string()).optional(),
});

const requestJobSchema = z.object({
  workOrderId: z.string(),
  workOrderTitle: z.string(),
  clientCompanyId: z.string(),
  requestingCompanyId: z.string(),
  requestedById: z.string(),
  message: z.string().optional(),
  proposedAgentId: z.string().optional(),
});

const createWorkOrderSchema = insertWorkOrderSchema.extend({
  budget: z.string().optional(),
});

interface JobNetworkProps {
  user: User;
  testingRole?: string;
  onRoleSwitch?: (role: string) => void;
}

export default function JobNetwork({ user, testingRole, onRoleSwitch }: JobNetworkProps) {
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [isCreateWorkOrderOpen, setIsCreateWorkOrderOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isRequestJobOpen, setIsRequestJobOpen] = useState(false);
  const [selectedJobForRequest, setSelectedJobForRequest] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      budget: '',
      budgetType: 'fixed',
      priority: 'normal',
      estimatedDuration: '',
      scheduledDate: '',
      requiredSkills: [],
      clientCompanyId: user.companyId || '',
      postedById: user.id,
      isPublic: true,
    },
  });

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

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/job-network', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-network'] });
      setIsCreateJobOpen(false);
      form.reset();
      toast({
        title: 'Success',
        description: 'Job posted to network successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to post job',
        variant: 'destructive',
      });
    },
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
      return apiRequest('/api/work-orders', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      setIsCreateWorkOrderOpen(false);
      workOrderForm.reset();
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

  const onSubmit = (data: any) => {
    createJobMutation.mutate({
      ...data,
      budget: data.budget ? parseFloat(data.budget) : null,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate).toISOString() : null,
    });
  };

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
      budget: data.budget ? parseFloat(parseCurrency(data.budget)) : null,
      estimatedHours: data.estimatedHours ? parseInt(data.estimatedHours) : null,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
    });
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
                                    value={field.value ? formatCurrency(field.value) : ''}
                                    onChange={(e) => {
                                      const formattedValue = formatCurrency(e.target.value);
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
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

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
              
              {canPostToJobNetwork(user) && (
                <Dialog open={isCreateJobOpen} onOpenChange={setIsCreateJobOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Post Job
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Post New Job to Network</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter job title" {...field} />
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
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Describe the work needed" rows={4} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location</FormLabel>
                              <FormControl>
                                <Input placeholder="Work location" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="estimatedDuration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estimated Duration</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., 2 hours, 1 day" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="budget"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Budget</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
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
                          control={form.control}
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
                                  <SelectItem value="normal">Normal</SelectItem>
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
                          name="scheduledDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Scheduled Date</FormLabel>
                              <FormControl>
                                <Input type="datetime-local" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-end space-x-3">
                        <Button type="button" variant="outline" onClick={() => setIsCreateJobOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createJobMutation.isPending}>
                          {createJobMutation.isPending ? 'Posting...' : 'Post Job'}
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