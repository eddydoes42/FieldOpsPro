import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Calendar, Users, DollarSign, MapPin, Clock, Briefcase, CheckSquare, AlertCircle, Home, ArrowLeft, Check } from 'lucide-react';
import { useLocation } from 'wouter';
import { canCreateProjects, canViewProjectNetwork, isOperationsDirector } from '@shared/schema';
import Navigation from '@/components/navigation';
import type { Project, InsertProject } from '@shared/schema';
import { DocumentUploader } from '@/components/DocumentUploader';

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  projectCode: z.string().min(7, "Project code must be at least 7 characters"),
  description: z.string().optional(),
  overview: z.string().min(1, "Overview is required"),
  startDate: z.string().min(1, "Start date is required"),
  expectedDuration: z.number().min(1, "Duration must be at least 1 day"),
  budget: z.number().min(0, "Budget must be non-negative"),
  workersNeeded: z.number().min(1, "At least 1 worker is required"),
  tools: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function ProjectNetwork() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Role Testing Components
  const ServiceCompanyRoleTester = () => {
    const [testingRole, setTestingRole] = useState<string>(localStorage.getItem('testingRole') || '');
    const [testingCompanyType, setTestingCompanyType] = useState<string>(localStorage.getItem('testingCompanyType') || '');

    const handleRoleChange = (newRole: string) => {
      setTestingRole(newRole);
      if (newRole) {
        localStorage.setItem('testingRole', newRole);
        localStorage.setItem('testingCompanyType', 'service');
        setTestingCompanyType('service');
        window.location.reload(); // Reload to apply role testing
      } else {
        localStorage.removeItem('testingRole');
        localStorage.removeItem('testingCompanyType');
        setTestingCompanyType('');
        window.location.reload();
      }
    };

    const handleStopTesting = () => {
      localStorage.removeItem('testingRole');
      localStorage.removeItem('testingCompanyType');
      setTestingRole('');
      setTestingCompanyType('');
      window.location.reload();
    };

    return (
      <div className="bg-purple-600 text-white px-4 py-2 mb-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Service Company Role Tester:</span>
            <select
              value={testingRole}
              onChange={(e) => handleRoleChange(e.target.value)}
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
          </div>
          {testingRole && testingCompanyType === 'service' && (
            <Button 
              onClick={handleStopTesting}
              variant="outline" 
              size="sm" 
              className="border-purple-300 text-purple-700 bg-white hover:bg-purple-50"
            >
              Stop Testing
            </Button>
          )}
        </div>
      </div>
    );
  };

  const ClientCompanyRoleTester = () => {
    const [testingRole, setTestingRole] = useState<string>(localStorage.getItem('testingRole') || '');
    const [testingCompanyType, setTestingCompanyType] = useState<string>(localStorage.getItem('testingCompanyType') || '');

    const handleRoleChange = (newRole: string) => {
      setTestingRole(newRole);
      if (newRole) {
        localStorage.setItem('testingRole', newRole);
        localStorage.setItem('testingCompanyType', 'client');
        setTestingCompanyType('client');
        window.location.reload(); // Reload to apply role testing
      } else {
        localStorage.removeItem('testingRole');
        localStorage.removeItem('testingCompanyType');
        setTestingCompanyType('');
        window.location.reload();
      }
    };

    const handleStopTesting = () => {
      localStorage.removeItem('testingRole');
      localStorage.removeItem('testingCompanyType');
      setTestingRole('');
      setTestingCompanyType('');
      window.location.reload();
    };

    return (
      <div className="bg-teal-600 text-white px-4 py-2 mb-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Client Company Role Tester:</span>
            <select
              value={testingRole}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="bg-teal-700 text-white border border-teal-500 rounded px-2 py-1 text-sm"
            >
              <option value="">Select a Role</option>
              <option value="administrator">Administrator</option>
              <option value="manager">Manager</option>
              <option value="dispatcher">Dispatcher</option>
            </select>
          </div>
          {testingRole && testingCompanyType === 'client' && (
            <Button 
              onClick={handleStopTesting}
              variant="outline" 
              size="sm" 
              className="border-teal-300 text-teal-700 bg-white hover:bg-teal-50"
            >
              Stop Testing
            </Button>
          )}
        </div>
      </div>
    );
  };
  const [activeTab, setActiveTab] = useState("available");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [newRequirement, setNewRequirement] = useState("");
  const [tools, setTools] = useState<string[]>([]);
  const [newTool, setNewTool] = useState("");
  const [showRequirementsDialog, setShowRequirementsDialog] = useState(false);
  const [projectRequirements, setProjectRequirements] = useState({
    preVisit: { requirements: [] as string[], documentsNeeded: 0 },
    onSite: { requirements: [] as string[], documentsNeeded: 0 },
    postVisit: { requirements: [] as string[], documentsNeeded: 0 }
  });
  const [currentStage, setCurrentStage] = useState<'preVisit' | 'onSite' | 'postVisit'>('preVisit');
  const [newStageRequirement, setNewStageRequirement] = useState("");
  const [completedRequirements, setCompletedRequirements] = useState<{[projectId: string]: {[requirementId: string]: boolean}}>({});

  // Reset form state function
  const resetFormState = () => {
    setRequirements([]);
    setNewRequirement("");
    setTools([]);
    setNewTool("");
    setProjectRequirements({
      preVisit: { requirements: [], documentsNeeded: 0 },
      onSite: { requirements: [], documentsNeeded: 0 },
      postVisit: { requirements: [], documentsNeeded: 0 }
    });
    setCurrentStage('preVisit');
    setNewStageRequirement("");
    form.reset();
  };

  // Check if user can access this page
  if (!canViewProjectNetwork(user as any)) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-4">You don't have permission to view the Project Network.</p>
        <Button onClick={() => setLocation('/dashboard')} variant="outline">
          <Home className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      projectCode: '',
      description: '',
      overview: '',
      startDate: '',
      expectedDuration: 1,
      budget: 0,
      workersNeeded: 1,
      tools: [],
      requirements: [],
    }
  });

  // Watch the name field to auto-populate project code
  const watchedName = form.watch("name");

  useEffect(() => {
    if (watchedName && watchedName.length >= 3) {
      // Take first 3 letters from project name (letters only, no spaces or special chars)
      const letters = watchedName.toLowerCase().replace(/[^a-z]/g, '').substring(0, 3);
      
      // Generate random 4-digit code
      const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Combine letters + random code
      const projectCode = letters + randomCode;
      form.setValue("projectCode", projectCode);
    }
  }, [watchedName, form]);

  // Fetch projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["/api/projects"],
    enabled: !!user,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Project creation failed:', response.status, errorText);
        throw new Error(`Failed to create project: ${response.status}`);
      }
      return response.json();
    },
    onSuccess: (createdProject) => {
      console.log('Project created successfully:', createdProject);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowCreateForm(false);
      resetFormState();
    },
    onError: (error) => {
      console.error('Project creation error:', error);
    },
  });

  // Request project assignment mutation
  const requestProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to request project');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });

  const handleCreateProject = (data: ProjectFormData) => {
    console.log("Creating project with data:", data);
    console.log("Requirements:", requirements);
    console.log("Tools:", tools);
    console.log("User data:", user);
    
    const projectData: InsertProject = {
      ...data,
      budget: data.budget?.toString() || "0",
      tools: tools.length > 0 ? tools : undefined,
      requirements: requirements.length > 0 ? requirements : undefined,
      createdById: (user as any)?.id,
      createdByCompanyId: (user as any)?.companyId,
      status: 'available',
      startDate: new Date(data.startDate),
      endDate: new Date(new Date(data.startDate).getTime() + ((data.expectedDuration || 1) * 24 * 60 * 60 * 1000)),
    };

    console.log("Sending project data:", projectData);
    createProjectMutation.mutate(projectData);
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      const updatedRequirements = [...requirements, newRequirement.trim()];
      setRequirements(updatedRequirements);
      form.setValue("requirements", updatedRequirements);
      setNewRequirement("");
    }
  };

  const removeRequirement = (index: number) => {
    const updatedRequirements = requirements.filter((_, i) => i !== index);
    setRequirements(updatedRequirements);
    form.setValue("requirements", updatedRequirements);
  };

  const addTool = () => {
    if (newTool.trim()) {
      const updatedTools = [...tools, newTool.trim()];
      setTools(updatedTools);
      form.setValue("tools", updatedTools);
      setNewTool("");
    }
  };

  const removeTool = (index: number) => {
    const updatedTools = tools.filter((_, i) => i !== index);
    setTools(updatedTools);
    form.setValue("tools", updatedTools);
  };

  // Functions for stage-based requirements
  const addStageRequirement = () => {
    if (newStageRequirement.trim()) {
      const updatedRequirements = {
        ...projectRequirements,
        [currentStage]: {
          ...projectRequirements[currentStage],
          requirements: [...projectRequirements[currentStage].requirements, newStageRequirement.trim()]
        }
      };
      setProjectRequirements(updatedRequirements);
      setNewStageRequirement("");
    }
  };

  const removeStageRequirement = (stage: 'preVisit' | 'onSite' | 'postVisit', index: number) => {
    const updatedRequirements = {
      ...projectRequirements,
      [stage]: {
        ...projectRequirements[stage],
        requirements: projectRequirements[stage].requirements.filter((_, i) => i !== index)
      }
    };
    setProjectRequirements(updatedRequirements);
  };

  const updateDocumentsNeeded = (stage: 'preVisit' | 'onSite' | 'postVisit', count: number) => {
    const updatedRequirements = {
      ...projectRequirements,
      [stage]: {
        ...projectRequirements[stage],
        documentsNeeded: Math.max(0, count)
      }
    };
    setProjectRequirements(updatedRequirements);
  };

  const applyToAllMembers = (stage: 'preVisit' | 'onSite' | 'postVisit', requirementIndex: number) => {
    const requirement = projectRequirements[stage].requirements[requirementIndex];
    const stagePrefix = stage === 'preVisit' ? 'Pre-Visit' : 
                        stage === 'onSite' ? 'On-Site' : 'Post-Visit';
    
    // Mark this requirement to be applied to all work orders
    const updatedRequirements = {
      ...projectRequirements,
      [stage]: {
        ...projectRequirements[stage],
        requirements: projectRequirements[stage].requirements.map((req, idx) => 
          idx === requirementIndex ? `${req} [ALL MEMBERS]` : req
        )
      }
    };
    setProjectRequirements(updatedRequirements);
    
    // Show confirmation
    alert(`Requirement "${requirement}" will be applied to all project members when the project is created.`);
  };

  const applyRequirements = () => {
    // Combine all stage requirements into a single array with checkbox structure
    const allRequirements = [
      ...projectRequirements.preVisit.requirements.map(req => ({
        stage: 'Pre-Visit',
        text: req,
        completed: false,
        applyToAll: req.includes('[ALL MEMBERS]')
      })),
      ...projectRequirements.onSite.requirements.map(req => ({
        stage: 'On-Site',
        text: req,
        completed: false,
        applyToAll: req.includes('[ALL MEMBERS]')
      })),
      ...projectRequirements.postVisit.requirements.map(req => ({
        stage: 'Post-Visit',
        text: req,
        completed: false,
        applyToAll: req.includes('[ALL MEMBERS]')
      }))
    ];
    
    // Add document requirements as structured requirements
    if (projectRequirements.preVisit.documentsNeeded > 0) {
      allRequirements.push({
        stage: 'Pre-Visit',
        text: `${projectRequirements.preVisit.documentsNeeded} document(s) required`,
        completed: false,
        applyToAll: false
      });
    }
    if (projectRequirements.onSite.documentsNeeded > 0) {
      allRequirements.push({
        stage: 'On-Site',
        text: `${projectRequirements.onSite.documentsNeeded} document(s) required`,
        completed: false,
        applyToAll: false
      });
    }
    if (projectRequirements.postVisit.documentsNeeded > 0) {
      allRequirements.push({
        stage: 'Post-Visit',
        text: `${projectRequirements.postVisit.documentsNeeded} document(s) required`,
        completed: false,
        applyToAll: false
      });
    }

    // Convert to string format for form (backwards compatibility)
    const stringRequirements = allRequirements.map(req => 
      `${req.stage}: ${req.text.replace(' [ALL MEMBERS]', '')}`
    );
    
    setRequirements(stringRequirements);
    form.setValue("requirements", stringRequirements);
    setShowRequirementsDialog(false);
  };

  // Toggle requirement completion
  const toggleRequirement = (projectId: string, requirementId: string) => {
    setCompletedRequirements(prev => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        [requirementId]: !prev[projectId]?.[requirementId]
      }
    }));
  };

  const handleRequestProject = (project: Project) => {
    requestProjectMutation.mutate(project.id);
  };

  const openProjectDetail = (project: Project) => {
    setSelectedProject(project);
    setShowDetailDialog(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'available': return 'default';
      case 'assigned': return 'secondary';
      case 'in_progress': return 'secondary';
      case 'completed': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'default';
    }
  };

  // Filter projects by tab
  const availableProjects = (projects as Project[]).filter((p: Project) => p.status === 'available');
  const myProjects = (projects as Project[]).filter((p: Project) => 
    p.assignedToCompanyId === (user as any)?.companyId || p.createdByCompanyId === (user as any)?.companyId
  );

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="p-6">
        {/* Role Testers - Always present for Operations Director */}
        <ServiceCompanyRoleTester />
        <ClientCompanyRoleTester />
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Try browser history first, fallback to appropriate dashboard
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  // Determine appropriate dashboard based on user role
                  if (isOperationsDirector(user as any)) {
                    setLocation('/operations-dashboard');
                  } else if ((user as any)?.roles?.includes('administrator')) {
                    setLocation('/admin-dashboard');
                  } else if ((user as any)?.roles?.includes('manager')) {
                    setLocation('/admin-dashboard');
                  } else if ((user as any)?.roles?.includes('dispatcher')) {
                    setLocation('/admin-dashboard');
                  } else {
                    setLocation('/dashboard');
                  }
                }
              }}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Project Network</h1>
          </div>
          {canCreateProjects(user as any) && (
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Create a new project for your team or for assignment to other companies.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateProject)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Dog Walker App" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="projectCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project Code</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., dowa1234" 
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  // Ensure it stays lowercase
                                  if (e.target.value !== e.target.value.toLowerCase()) {
                                    form.setValue("projectCode", e.target.value.toLowerCase());
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="overview"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Overview</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Brief description of the project..." {...field} />
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
                          <FormLabel>Detailed Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Detailed project description..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="expectedDuration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duration (Days)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1}
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="budget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Budget ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={0}
                                step="0.01"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                                onBlur={field.onBlur}
                                name={field.name}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="workersNeeded"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Workers Needed</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min={1}
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Requirements Section */}
                    <div>
                      <div className="flex items-center justify-between">
                        <FormLabel>Project Requirements</FormLabel>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowRequirementsDialog(true)}
                        >
                          Project Requirements
                        </Button>
                      </div>
                      {requirements.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {requirements.map((req, index) => (
                            <div key={index} className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm flex items-center justify-between">
                              <span>{req}</span>
                              <span className="text-xs text-gray-500 italic">Applied from requirements</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tools Section */}
                    <div>
                      <FormLabel>Required Tools</FormLabel>
                      <div className="mt-2">
                        <div className="flex gap-2 mb-2">
                          <Input
                            placeholder="Add a required tool..."
                            value={newTool}
                            onChange={(e) => setNewTool(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTool())}
                          />
                          <Button type="button" onClick={addTool} size="sm">
                            Add
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {tools.map((tool, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded">
                              <span className="text-sm">{tool}</span>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeTool(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Document Upload Section */}
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Project Documents</h3>
                        <span className="text-sm text-gray-500">Upload initial project files (optional)</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-blue-600">Pre-Visit Documents</h4>
                          <p className="text-xs text-gray-600">Site plans, requirements, specifications</p>
                          {/* We'll add pre-visit DocumentUploader here once project is created */}
                          <div className="text-xs text-gray-500 italic">
                            Upload documents after project creation
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-green-600">During-Visit Documents</h4>
                          <p className="text-xs text-gray-600">Work logs, photos, progress reports</p>
                          <div className="text-xs text-gray-500 italic">
                            Upload documents after project creation
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-purple-600">Post-Visit Documents</h4>
                          <p className="text-xs text-gray-600">Completion reports, certificates, invoices</p>
                          <div className="text-xs text-gray-500 italic">
                            Upload documents after project creation
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => { setShowCreateForm(false); resetFormState(); }}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createProjectMutation.isPending}>
                        {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}

          {/* Project Requirements Dialog */}
          <Dialog open={showRequirementsDialog} onOpenChange={setShowRequirementsDialog}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Project Requirements</DialogTitle>
                <DialogDescription>
                  Define requirements for each stage of the project and specify document needs.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Stage Selector */}
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant={currentStage === 'preVisit' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentStage('preVisit')}
                  >
                    Pre-Visit
                  </Button>
                  <Button
                    type="button"
                    variant={currentStage === 'onSite' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentStage('onSite')}
                  >
                    On-Site
                  </Button>
                  <Button
                    type="button"
                    variant={currentStage === 'postVisit' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentStage('postVisit')}
                  >
                    Post-Visit
                  </Button>
                </div>

                {/* Current Stage Requirements */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-4">
                    {currentStage === 'preVisit' ? 'Pre-Visit' : 
                     currentStage === 'onSite' ? 'On-Site' : 'Post-Visit'} Requirements
                  </h3>

                  {/* Add Requirement */}
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder={`Add ${currentStage === 'preVisit' ? 'pre-visit' : 
                                          currentStage === 'onSite' ? 'on-site' : 'post-visit'} requirement...`}
                      value={newStageRequirement}
                      onChange={(e) => setNewStageRequirement(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStageRequirement())}
                    />
                    <Button type="button" onClick={addStageRequirement} size="sm">
                      Add
                    </Button>
                  </div>

                  {/* Requirements List */}
                  <div className="space-y-2 mb-4">
                    {projectRequirements[currentStage].requirements.map((req, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-2 rounded">
                        <span className="text-sm flex-1">{req}</span>
                        <div className="flex items-center gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => applyToAllMembers(currentStage, index)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            All Members
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeStageRequirement(currentStage, index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Documents Needed */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Documents Required</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={projectRequirements[currentStage].documentsNeeded}
                        onChange={(e) => updateDocumentsNeeded(currentStage, parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-600">document(s) to be uploaded</span>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Requirements Summary</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-blue-600">Pre-Visit</div>
                      <div>{projectRequirements.preVisit.requirements.length} requirements</div>
                      <div>{projectRequirements.preVisit.documentsNeeded} documents</div>
                    </div>
                    <div>
                      <div className="font-medium text-green-600">On-Site</div>
                      <div>{projectRequirements.onSite.requirements.length} requirements</div>
                      <div>{projectRequirements.onSite.documentsNeeded} documents</div>
                    </div>
                    <div>
                      <div className="font-medium text-purple-600">Post-Visit</div>
                      <div>{projectRequirements.postVisit.requirements.length} requirements</div>
                      <div>{projectRequirements.postVisit.documentsNeeded} documents</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowRequirementsDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={applyRequirements}>
                    Apply Requirements
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">Available Projects</TabsTrigger>
          <TabsTrigger value="my-projects">My Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableProjects.map((project: Project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader onClick={() => openProjectDetail(project)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription className="font-mono text-sm">
                        {project.projectCode}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                  <CardDescription className="mt-2">
                    {project.overview}
                  </CardDescription>
                </CardHeader>
                
                <CardContent onClick={() => openProjectDetail(project)}>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(project.startDate)} ({project.expectedDuration} days)
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      {formatCurrency(parseFloat(project.budget || "0"))}
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      {project.workersNeeded} workers needed
                    </div>
                  </div>
                  
                  {/* Requirements Checklist */}
                  {project.requirements && project.requirements.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Requirements</h4>
                      <div className="space-y-2">
                        {project.requirements.slice(0, 3).map((requirement: string, index: number) => {
                          const requirementId = `${project.id}-${index}`;
                          const isCompleted = completedRequirements[project.id]?.[requirementId] || false;
                          return (
                            <div key={index} className="flex items-start gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRequirement(project.id, requirementId);
                                }}
                                className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                  isCompleted 
                                    ? 'bg-green-500 border-green-500 text-white' 
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                {isCompleted && <Check className="h-2.5 w-2.5" />}
                              </button>
                              <span className={`text-xs ${isCompleted ? 'line-through text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>
                                {requirement}
                              </span>
                            </div>
                          );
                        })}
                        {project.requirements.length > 3 && (
                          <div className="text-xs text-gray-500 mt-1">
                            +{project.requirements.length - 3} more requirements
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => handleRequestProject(project)}
                    disabled={requestProjectMutation.isPending}
                  >
                    Request Assignment
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {availableProjects.length === 0 && (
            <div 
              className="text-center py-12 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() => setShowCreateForm(true)}
              data-testid="empty-state-create-project"
            >
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Available Projects
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                There are currently no projects available for assignment.
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                Click here to create a new project
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-projects" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myProjects.map((project: Project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader onClick={() => openProjectDetail(project)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription className="font-mono text-sm">
                        {project.projectCode}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant(project.status)}>
                      {project.status}
                    </Badge>
                  </div>
                  <CardDescription className="mt-2">
                    {project.overview}
                  </CardDescription>
                </CardHeader>
                
                <CardContent onClick={() => openProjectDetail(project)}>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(project.startDate)} ({project.expectedDuration} days)
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-2" />
                      {formatCurrency(parseFloat(project.budget || "0"))}
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      {project.workersNeeded} workers needed
                    </div>
                  </div>
                  
                  {/* Requirements Checklist */}
                  {project.requirements && project.requirements.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Requirements</h4>
                      <div className="space-y-2">
                        {project.requirements.slice(0, 3).map((requirement: string, index: number) => {
                          const requirementId = `${project.id}-my-${index}`;
                          const isCompleted = completedRequirements[project.id]?.[requirementId] || false;
                          return (
                            <div key={index} className="flex items-start gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRequirement(project.id, requirementId);
                                }}
                                className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                  isCompleted 
                                    ? 'bg-green-500 border-green-500 text-white' 
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                {isCompleted && <Check className="h-2.5 w-2.5" />}
                              </button>
                              <span className={`text-xs ${isCompleted ? 'line-through text-gray-500' : 'text-gray-600 dark:text-gray-400'}`}>
                                {requirement}
                              </span>
                            </div>
                          );
                        })}
                        {project.requirements.length > 3 && (
                          <div className="text-xs text-gray-500 mt-1">
                            +{project.requirements.length - 3} more requirements
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter>
                  <Button className="w-full" variant="outline">
                    Manage Project
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {myProjects.length === 0 && (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Projects
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You don't have any assigned or created projects yet.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Project Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  {selectedProject.name}
                  <Badge variant={getStatusBadgeVariant(selectedProject.status)}>
                    {selectedProject.status}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="font-mono">
                  {selectedProject.projectCode}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Overview</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedProject.overview}
                  </p>
                </div>

                {selectedProject.description && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Description</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedProject.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center mb-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span className="font-semibold">Timeline</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Start: {formatDate(selectedProject.startDate)}<br />
                      Duration: {selectedProject.expectedDuration} days
                      {selectedProject.endDate && (
                        <>
                          <br />
                          End: {formatDate(selectedProject.endDate)}
                        </>
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-2">
                      <DollarSign className="h-4 w-4 mr-2" />
                      <span className="font-semibold">Budget</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatCurrency(parseFloat(selectedProject.budget || "0"))}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center mb-2">
                    <Users className="h-4 w-4 mr-2" />
                    <span className="font-semibold">Team Requirements</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedProject.workersNeeded} workers needed
                  </p>
                </div>

                {/* Project Documents Section */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-4">Project Documents</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Pre-Visit Documents */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-blue-600 flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Pre-Visit Documents
                      </h4>
                      <p className="text-xs text-gray-600">Site plans, requirements, specifications</p>
                      
                      <DocumentUploader
                        entityType="project"
                        entityId={selectedProject.id}
                        maxNumberOfFiles={10}
                        allowedFileTypes={['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png']}
                      />
                    </div>
                    
                    {/* During-Visit Documents */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-green-600 flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        During-Visit Documents
                      </h4>
                      <p className="text-xs text-gray-600">Work logs, photos, progress reports</p>
                      
                      <DocumentUploader
                        entityType="project"
                        entityId={selectedProject.id}
                        maxNumberOfFiles={20}
                        allowedFileTypes={['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']}
                      />
                    </div>
                    
                    {/* Post-Visit Documents */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-purple-600 flex items-center">
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Post-Visit Documents
                      </h4>
                      <p className="text-xs text-gray-600">Completion reports, certificates, invoices</p>
                      
                      <DocumentUploader
                        entityType="project"
                        entityId={selectedProject.id}
                        maxNumberOfFiles={15}
                        allowedFileTypes={['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png']}
                      />
                    </div>
                  </div>
                </div>

                {selectedProject.requirements && selectedProject.requirements.length > 0 && (
                  <div>
                    <div className="flex items-center mb-2">
                      <CheckSquare className="h-4 w-4 mr-2" />
                      <span className="font-semibold">Requirements</span>
                    </div>
                    <ul className="space-y-1">
                      {selectedProject.requirements.map((req, index) => (
                        <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                          <span className="w-2 h-2 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedProject.tools && selectedProject.tools.length > 0 && (
                  <div>
                    <div className="flex items-center mb-2">
                      <Briefcase className="h-4 w-4 mr-2" />
                      <span className="font-semibold">Required Tools</span>
                    </div>
                    <ul className="space-y-1">
                      {selectedProject.tools.map((tool, index) => (
                        <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                          <span className="w-2 h-2 bg-gray-400 rounded-full mr-2 flex-shrink-0"></span>
                          {tool}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  Close
                </Button>
                {selectedProject.status === 'available' && (
                  <Button onClick={() => handleRequestProject(selectedProject)}>
                    Request Assignment
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}