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
import { User, canPostToJobNetwork, isAdminTeam, isClient, insertJobNetworkPostSchema } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import Navigation from '@/components/navigation';

const createJobSchema = insertJobNetworkPostSchema.extend({
  requiredSkills: z.array(z.string()).optional(),
});

interface JobNetworkProps {
  user: User;
}

export default function JobNetwork({ user }: JobNetworkProps) {
  const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
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

  // Query for job network posts
  const { data: jobPosts = [], isLoading } = useQuery({
    queryKey: ['/api/job-network'],
  });

  // Query for service companies
  const { data: serviceCompanies = [] } = useQuery({
    queryKey: ['/api/companies/service'],
  });

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/job-network', {
        method: 'POST',
        body: JSON.stringify(data),
      });
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

  // Assign job mutation
  const assignJobMutation = useMutation({
    mutationFn: async ({ jobId, companyId }: { jobId: string; companyId: string }) => {
      return apiRequest(`/api/job-network/${jobId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedToCompanyId: companyId, assignedById: user.id }),
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

  const onSubmit = (data: any) => {
    createJobMutation.mutate({
      ...data,
      budget: data.budget ? parseFloat(data.budget) : null,
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate).toISOString() : null,
    });
  };

  const filteredJobs = jobPosts.filter((job: any) => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400">
                  <Home className="h-4 w-4" />
                </Button>
              </Link>
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
                        onClick={() => assignJobMutation.mutate({ 
                          jobId: job.id, 
                          companyId: user.companyId || '' 
                        })}
                        disabled={assignJobMutation.isPending}
                      >
                        {assignJobMutation.isPending ? 'Assigning...' : 'Accept Job'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="text-center py-12">
              <Network className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Jobs Found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No jobs match your current filters.' 
                  : 'No jobs have been posted to the network yet.'
                }
              </p>
              {canPostToJobNetwork(user) && (
                <Button onClick={() => setIsCreateJobOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Post First Job
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Job Details Modal */}
        {selectedJob && (
          <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedJob.title}</span>
                  <Badge variant={selectedJob.status === 'open' ? 'default' : 'secondary'}>
                    {selectedJob.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Description</h4>
                  <p className="text-gray-600 dark:text-gray-400">{selectedJob.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Location</h4>
                    <p className="text-gray-600 dark:text-gray-400">{selectedJob.location}</p>
                  </div>
                  
                  {selectedJob.budget && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Budget</h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        ${selectedJob.budget} ({selectedJob.budgetType})
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {selectedJob.scheduledDate && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Scheduled Date</h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        {new Date(selectedJob.scheduledDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  
                  {selectedJob.estimatedDuration && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Duration</h4>
                      <p className="text-gray-600 dark:text-gray-400">{selectedJob.estimatedDuration}</p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Priority</h4>
                  <Badge variant={selectedJob.priority === 'urgent' ? 'destructive' : selectedJob.priority === 'high' ? 'default' : 'secondary'}>
                    {selectedJob.priority}
                  </Badge>
                </div>

                {selectedJob.assignedToCompanyId && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Assignment Status</h4>
                    <p className="text-green-700 dark:text-green-300">
                      This job has been assigned to a service company.
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setSelectedJob(null)}>
                    Close
                  </Button>
                  {isAdminTeam(user) && selectedJob.status === 'open' && !selectedJob.assignedToCompanyId && (
                    <Button
                      onClick={() => {
                        assignJobMutation.mutate({ 
                          jobId: selectedJob.id, 
                          companyId: user.companyId || '' 
                        });
                        setSelectedJob(null);
                      }}
                      disabled={assignJobMutation.isPending}
                    >
                      {assignJobMutation.isPending ? 'Assigning...' : 'Accept Job'}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}