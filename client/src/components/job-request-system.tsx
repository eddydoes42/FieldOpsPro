import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  MapPin, 
  DollarSign, 
  Clock, 
  Calendar, 
  User, 
  Building, 
  AlertCircle,
  CheckCircle,
  Search,
  Filter
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatBudget, formatCurrency } from "@/lib/utils";

interface JobRequest {
  id: string;
  title: string;
  description: string;
  location: string;
  budget: string;
  budgetType: string;
  priority: string;
  urgencyLevel: string;
  requiredSkills: string[];
  serviceCategory: string;
  estimatedDuration: string;
  estimatedStartDate: string;
  estimatedEndDate: string;
  equipmentProvided: boolean;
  accessInstructions: string;
  specialRequirements: string;
  approvalRequired: boolean;
  maxBudget: string;
  status: string;
  clientCompanyId: string;
  postedById: string;
  assignedToCompanyId?: string;
  assignedById?: string;
  assignedAt?: string;
  routedToCompanyId?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  company?: {
    name: string;
  };
  postedBy?: {
    firstName: string;
    lastName: string;
  };
}

interface JobRequestSystemProps {
  companyId?: string;
  canCreateRequests?: boolean;
  canAssignRequests?: boolean;
  viewMode?: 'client' | 'service' | 'network';
}

export default function JobRequestSystem({ 
  companyId, 
  canCreateRequests = false, 
  canAssignRequests = false,
  viewMode = 'network'
}: JobRequestSystemProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  // Job request form state
  const [jobRequestForm, setJobRequestForm] = useState({
    title: "",
    description: "",
    location: "",
    budget: "",
    budgetType: "fixed",
    priority: "normal",
    urgencyLevel: "normal",
    requiredSkills: "",
    serviceCategory: "",
    estimatedDuration: "",
    estimatedStartDate: "",
    estimatedEndDate: "",
    equipmentProvided: false,
    accessInstructions: "",
    specialRequirements: "",
    approvalRequired: false,
    maxBudget: "",
    isPublic: true,
  });

  // Fetch job requests
  const { data: jobRequests, isLoading } = useQuery({
    queryKey: ['/api/job-requests', { 
      companyId, 
      viewMode, 
      search: searchQuery,
      status: filterStatus,
      priority: filterPriority,
      category: filterCategory
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (viewMode) params.append('viewMode', viewMode);
      if (searchQuery) params.append('search', searchQuery);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterPriority !== 'all') params.append('priority', filterPriority);
      if (filterCategory !== 'all') params.append('category', filterCategory);
      
      const response = await fetch(`/api/job-requests?${params}`);
      if (!response.ok) throw new Error('Failed to fetch job requests');
      return response.json();
    },
  });

  // Create job request mutation
  const createJobRequestMutation = useMutation({
    mutationFn: async (requestData: any) => {
      const skillsArray = requestData.requiredSkills 
        ? requestData.requiredSkills.split(',').map((s: string) => s.trim())
        : [];
      
      return apiRequest("POST", "/api/job-requests", {
        ...requestData,
        requiredSkills: skillsArray,
      });
    },
    onSuccess: () => {
      toast({
        title: "Job Request Created",
        description: "Your job request has been posted to the network."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/job-requests'] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create job request",
        description: error.message || "Could not create job request",
        variant: "destructive",
      });
    }
  });

  // Assign request mutation
  const assignRequestMutation = useMutation({
    mutationFn: async ({ requestId, serviceCompanyId }: { requestId: string; serviceCompanyId: string }) => {
      return apiRequest("POST", `/api/job-requests/${requestId}/assign`, {
        serviceCompanyId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Job Request Assigned",
        description: "The job request has been assigned to the service company."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/job-requests'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to assign job request",
        description: error.message || "Could not assign job request",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setJobRequestForm({
      title: "",
      description: "",
      location: "",
      budget: "",
      budgetType: "fixed",
      priority: "normal",
      urgencyLevel: "normal",
      requiredSkills: "",
      serviceCategory: "",
      estimatedDuration: "",
      estimatedStartDate: "",
      estimatedEndDate: "",
      equipmentProvided: false,
      accessInstructions: "",
      specialRequirements: "",
      approvalRequired: false,
      maxBudget: "",
      isPublic: true,
    });
  };

  const handleCreateJobRequest = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!jobRequestForm.title || !jobRequestForm.description) {
      toast({
        title: "Incomplete form",
        description: "Please fill in title and description",
        variant: "destructive",
      });
      return;
    }

    createJobRequestMutation.mutate(jobRequestForm);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'normal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'normal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'high': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'assigned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="job-request-system">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {viewMode === 'client' ? 'My Job Requests' : viewMode === 'service' ? 'Available Jobs' : 'Job Network'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {viewMode === 'client' 
              ? 'Manage your posted job requests and track their progress'
              : viewMode === 'service'
              ? 'Browse and bid on available job opportunities'
              : 'Public job network marketplace'}
          </p>
        </div>
        
        {canCreateRequests && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-job-request">
                <Plus className="w-4 h-4 mr-2" />
                Post Job Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-minimal">
              <DialogHeader>
                <DialogTitle>Create New Job Request</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateJobRequest} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="title">Job Title *</Label>
                    <Input
                      id="title"
                      value={jobRequestForm.title}
                      onChange={(e) => setJobRequestForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Network installation at downtown office"
                      required
                      data-testid="input-job-title"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={jobRequestForm.description}
                      onChange={(e) => setJobRequestForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Detailed description of the work required..."
                      rows={3}
                      required
                      data-testid="textarea-job-description"
                    />
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={jobRequestForm.location}
                      onChange={(e) => setJobRequestForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="123 Main St, City, State"
                      data-testid="input-job-location"
                    />
                  </div>

                  <div>
                    <Label htmlFor="serviceCategory">Service Category</Label>
                    <Select 
                      value={jobRequestForm.serviceCategory} 
                      onValueChange={(value) => setJobRequestForm(prev => ({ ...prev, serviceCategory: value }))}
                    >
                      <SelectTrigger data-testid="select-service-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="network_installation">Network Installation</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="troubleshooting">Troubleshooting</SelectItem>
                        <SelectItem value="security_setup">Security Setup</SelectItem>
                        <SelectItem value="hardware_replacement">Hardware Replacement</SelectItem>
                        <SelectItem value="software_configuration">Software Configuration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="budget">Budget</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={jobRequestForm.budget}
                      onChange={(e) => setJobRequestForm(prev => ({ ...prev, budget: e.target.value }))}
                      placeholder="1500"
                      data-testid="input-job-budget"
                    />
                  </div>

                  <div>
                    <Label htmlFor="budgetType">Budget Type</Label>
                    <Select 
                      value={jobRequestForm.budgetType} 
                      onValueChange={(value) => setJobRequestForm(prev => ({ ...prev, budgetType: value }))}
                    >
                      <SelectTrigger data-testid="select-budget-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Price</SelectItem>
                        <SelectItem value="hourly">Hourly Rate</SelectItem>
                        <SelectItem value="per_device">Per Device</SelectItem>
                        <SelectItem value="materials_labor">Materials + Labor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select 
                      value={jobRequestForm.priority} 
                      onValueChange={(value) => setJobRequestForm(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="urgencyLevel">Urgency Level</Label>
                    <Select 
                      value={jobRequestForm.urgencyLevel} 
                      onValueChange={(value) => setJobRequestForm(prev => ({ ...prev, urgencyLevel: value }))}
                    >
                      <SelectTrigger data-testid="select-urgency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="estimatedDuration">Estimated Duration</Label>
                    <Input
                      id="estimatedDuration"
                      value={jobRequestForm.estimatedDuration}
                      onChange={(e) => setJobRequestForm(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                      placeholder="2-3 hours"
                      data-testid="input-estimated-duration"
                    />
                  </div>

                  <div>
                    <Label htmlFor="estimatedStartDate">Estimated Start Date</Label>
                    <Input
                      id="estimatedStartDate"
                      type="datetime-local"
                      value={jobRequestForm.estimatedStartDate}
                      onChange={(e) => setJobRequestForm(prev => ({ ...prev, estimatedStartDate: e.target.value }))}
                      data-testid="input-start-date"
                    />
                  </div>

                  <div>
                    <Label htmlFor="estimatedEndDate">Estimated End Date</Label>
                    <Input
                      id="estimatedEndDate"
                      type="datetime-local"
                      value={jobRequestForm.estimatedEndDate}
                      onChange={(e) => setJobRequestForm(prev => ({ ...prev, estimatedEndDate: e.target.value }))}
                      data-testid="input-end-date"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="requiredSkills">Required Skills (comma separated)</Label>
                    <Input
                      id="requiredSkills"
                      value={jobRequestForm.requiredSkills}
                      onChange={(e) => setJobRequestForm(prev => ({ ...prev, requiredSkills: e.target.value }))}
                      placeholder="Network Configuration, Cisco Equipment, WiFi Setup"
                      data-testid="input-required-skills"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="accessInstructions">Access Instructions</Label>
                    <Textarea
                      id="accessInstructions"
                      value={jobRequestForm.accessInstructions}
                      onChange={(e) => setJobRequestForm(prev => ({ ...prev, accessInstructions: e.target.value }))}
                      placeholder="Security desk on ground floor, ask for IT badge..."
                      rows={2}
                      data-testid="textarea-access-instructions"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="specialRequirements">Special Requirements</Label>
                    <Textarea
                      id="specialRequirements"
                      value={jobRequestForm.specialRequirements}
                      onChange={(e) => setJobRequestForm(prev => ({ ...prev, specialRequirements: e.target.value }))}
                      placeholder="Background check required, must have own tools..."
                      rows={2}
                      data-testid="textarea-special-requirements"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createJobRequestMutation.isPending} data-testid="button-submit-job-request">
                    {createJobRequestMutation.isPending ? "Creating..." : "Post Job Request"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search job requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-jobs"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-32" data-testid="select-priority-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Job Requests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobRequests?.map((request: JobRequest) => (
          <Card key={request.id} className="hover:shadow-lg transition-shadow" data-testid={`job-request-card-${request.id}`}>
            <CardHeader className="space-y-3">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-lg leading-tight">{request.title}</h3>
                <div className="flex flex-col gap-1">
                  <Badge className={getStatusColor(request.status)}>
                    {request.status.replace('_', ' ')}
                  </Badge>
                  <Badge className={getPriorityColor(request.priority)}>
                    {request.priority}
                  </Badge>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {request.description}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{request.location || 'Remote'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span>{formatBudget(request.budget, request.budgetType)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{request.estimatedDuration || 'TBD'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{request.company?.name || 'Client'}</span>
                </div>
              </div>

              {request.urgencyLevel && request.urgencyLevel !== 'normal' && (
                <Badge className={getUrgencyColor(request.urgencyLevel)}>
                  {request.urgencyLevel} urgency
                </Badge>
              )}

              {request.requiredSkills && request.requiredSkills.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium">Required Skills:</p>
                  <div className="flex flex-wrap gap-1">
                    {request.requiredSkills.slice(0, 3).map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {request.requiredSkills.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{request.requiredSkills.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-xs text-gray-500">
                  Posted {formatDistanceToNow(new Date(request.createdAt))} ago
                </span>
                
                {canAssignRequests && request.status === 'open' && (
                  <Button
                    size="sm"
                    onClick={() => assignRequestMutation.mutate({ 
                      requestId: request.id, 
                      serviceCompanyId: companyId! 
                    })}
                    disabled={assignRequestMutation.isPending}
                    data-testid={`button-assign-${request.id}`}
                  >
                    {assignRequestMutation.isPending ? "Assigning..." : "Request Assignment"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {jobRequests?.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No job requests found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {viewMode === 'client' 
                ? 'You haven\'t posted any job requests yet.'
                : 'No job requests match your current filters.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}