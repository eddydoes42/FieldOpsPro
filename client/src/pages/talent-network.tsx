import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import Navigation from "@/components/navigation";
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Star, 
  Building, 
  Calendar,
  Clock,
  Search,
  Filter,
  UserCheck,
  Award,
  UserPlus,
  CheckCircle,
  Home,
  ArrowLeft,
  AlertTriangle,
  TrendingUp,
  Settings
} from "lucide-react";
import UserOnboardingForm from "@/components/user-onboarding-form";

interface FieldAgent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  company?: {
    id: string;
    name: string;
  };
  specializations?: string[];
  rating?: number;
  completedJobs?: number;
  yearsExperience?: number;
  certifications?: string[];
  availability?: string;
  lastActive?: string;
  unresolvedIssues?: number;
  roles?: string[];
}

export default function TalentNetwork() {
  const [selectedAgent, setSelectedAgent] = useState<FieldAgent | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [assignmentWorkOrderId, setAssignmentWorkOrderId] = useState<string | null>(null);
  const [assignmentWorkOrderTitle, setAssignmentWorkOrderTitle] = useState<string>('');
  const [confirmAssignAgent, setConfirmAssignAgent] = useState<FieldAgent | null>(null);
  
  // Advanced filters for talent management
  const [ratingFilter, setRatingFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [workOrderFilter, setWorkOrderFilter] = useState("all");
  const [issuesFilter, setIssuesFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  
  // User creation state
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user to check if Operations Director
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
  });

  // Check if user is Operations Director (not role testing)
  const isOperationsDirector = (user as any)?.roles?.includes('operations_director') && 
    typeof window !== 'undefined' && 
    !window.location.search.includes('testing_role') &&
    !window.location.search.includes('company_type');

  // Import role testing components
  const ServiceCompanyRoleTester = () => {
    const [testingRole, setTestingRole] = useState<string>('');

    return (
      <div className="bg-purple-600 text-white px-4 py-2 mb-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Service Company Role Tester:</span>
          <select
            value={testingRole}
            onChange={(e) => setTestingRole(e.target.value)}
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
      </div>
    );
  };

  const ClientCompanyRoleTester = () => {
    const [testingRole, setTestingRole] = useState<string>('');

    return (
      <div className="bg-teal-600 text-white px-4 py-2 mb-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Client Company Role Tester:</span>
          <select
            value={testingRole}
            onChange={(e) => setTestingRole(e.target.value)}
            className="bg-teal-700 text-white border border-teal-500 rounded px-2 py-1 text-sm"
          >
            <option value="">Select a Role</option>
            <option value="administrator">Administrator</option>
            <option value="manager">Manager</option>
            <option value="dispatcher">Dispatcher</option>
          </select>
        </div>
      </div>
    );
  };

  // Check if we're in assignment mode
  useEffect(() => {
    const workOrderId = sessionStorage.getItem('assignmentWorkOrderId');
    const workOrderTitle = sessionStorage.getItem('assignmentWorkOrderTitle');
    if (workOrderId) {
      setAssignmentWorkOrderId(workOrderId);
      setAssignmentWorkOrderTitle(workOrderTitle || '');
    }
  }, []);

  // Fetch field agents from all companies
  const { data: fieldAgents, isLoading } = useQuery<FieldAgent[]>({
    queryKey: ['/api/users/field-agents'],
  });

  // Get unique companies with agent counts
  const companiesWithAgents = fieldAgents && Array.isArray(fieldAgents) ? 
    fieldAgents.reduce((acc: any[], agent: FieldAgent) => {
      if (!agent.company) return acc;
      
      const existingCompany = acc.find(c => c.name === agent.company!.name);
      if (existingCompany) {
        existingCompany.agents.push(agent);
        existingCompany.agentCount++;
      } else {
        acc.push({
          id: agent.company.id,
          name: agent.company.name,
          agents: [agent],
          agentCount: 1
        });
      }
      return acc;
    }, []) : [];

  // Get agents for selected company
  const selectedCompanyAgents = selectedCompany 
    ? companiesWithAgents.find((c: any) => c.name === selectedCompany)?.agents || []
    : [];

  // Advanced filtering logic for agents
  const filteredAgents = selectedCompany 
    ? selectedCompanyAgents.filter((agent: FieldAgent) => {
        // Search filter
        const matchesSearch = !searchTerm || 
          `${agent.firstName} ${agent.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.specializations?.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()));

        // Rating filter
        const matchesRating = ratingFilter === "all" || 
          (ratingFilter === "5star" && (agent.rating || 0) >= 4.5) ||
          (ratingFilter === "4star" && (agent.rating || 0) >= 4.0 && (agent.rating || 0) < 4.5) ||
          (ratingFilter === "3star" && (agent.rating || 0) >= 3.0 && (agent.rating || 0) < 4.0) ||
          (ratingFilter === "unrated" && !agent.rating);

        // Experience filter
        const matchesExperience = experienceFilter === "all" ||
          (experienceFilter === "senior" && (agent.yearsExperience || 0) >= 5) ||
          (experienceFilter === "mid" && (agent.yearsExperience || 0) >= 2 && (agent.yearsExperience || 0) < 5) ||
          (experienceFilter === "junior" && (agent.yearsExperience || 0) < 2);

        // Work order completion filter
        const matchesWorkOrders = workOrderFilter === "all" ||
          (workOrderFilter === "high" && (agent.completedJobs || 0) >= 50) ||
          (workOrderFilter === "medium" && (agent.completedJobs || 0) >= 10 && (agent.completedJobs || 0) < 50) ||
          (workOrderFilter === "low" && (agent.completedJobs || 0) < 10);

        // Issues filter
        const matchesIssues = issuesFilter === "all" ||
          (issuesFilter === "none" && (agent.unresolvedIssues || 0) === 0) ||
          (issuesFilter === "few" && (agent.unresolvedIssues || 0) >= 1 && (agent.unresolvedIssues || 0) <= 2) ||
          (issuesFilter === "many" && (agent.unresolvedIssues || 0) > 2);

        // Role filter
        const matchesRole = roleFilter === "all" ||
          (agent.roles && agent.roles.includes(roleFilter));

        return matchesSearch && matchesRating && matchesExperience && matchesWorkOrders && matchesIssues && matchesRole;
      })
    : [];

  // Filter companies based on search term
  const filteredCompanies = companiesWithAgents.filter((company: any) => {
    return !searchTerm || 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.agents.some((agent: FieldAgent) => 
        `${agent.firstName} ${agent.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.specializations?.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  });

  const handleAgentClick = (agent: FieldAgent) => {
    setSelectedAgent(agent);
  };

  const closeAgentDetails = () => {
    setSelectedAgent(null);
  };

  const handleCompanyClick = (companyName: string) => {
    setSelectedCompany(companyName);
  };

  const backToCompanies = () => {
    setSelectedCompany(null);
  };

  // Assign agent mutation
  const assignAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      return apiRequest(`/api/work-orders/${assignmentWorkOrderId}/assign`, 'PATCH', {
        assigneeId: agentId,
      });
    },
    onSuccess: () => {
      toast({
        title: "Assignment Successful",
        description: `Agent assigned to "${assignmentWorkOrderTitle}" successfully.`,
      });
      
      // Clear assignment session data
      sessionStorage.removeItem('assignmentWorkOrderId');
      sessionStorage.removeItem('assignmentWorkOrderTitle');
      setAssignmentWorkOrderId(null);
      setAssignmentWorkOrderTitle('');
      
      // Invalidate work orders cache to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/client/work-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      
      // Navigate back to work orders or dashboard
      navigate('/client/work-orders');
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign agent to work order.",
        variant: "destructive",
      });
    },
  });

  // Handle agent assignment - show confirmation dialog
  const handleAssignAgent = (agent: FieldAgent) => {
    if (assignmentWorkOrderId) {
      setConfirmAssignAgent(agent);
    }
  };

  // Confirm assignment
  const confirmAssignment = () => {
    if (confirmAssignAgent && assignmentWorkOrderId) {
      assignAgentMutation.mutate(confirmAssignAgent.id);
      setConfirmAssignAgent(null);
    }
  };

  // Cancel assignment confirmation
  const cancelAssignmentConfirmation = () => {
    setConfirmAssignAgent(null);
  };

  // Cancel assignment mode
  const cancelAssignment = () => {
    sessionStorage.removeItem('assignmentWorkOrderId');
    sessionStorage.removeItem('assignmentWorkOrderTitle');
    setAssignmentWorkOrderId(null);
    setAssignmentWorkOrderTitle('');
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
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
      
        {/* Navigation Buttons */}
        <div className="flex items-center space-x-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Navigate to appropriate dashboard based on user role
              if ((user as any)?.roles?.includes('operations_director')) {
                navigate('/operations-dashboard');
              } else if ((user as any)?.roles?.includes('administrator')) {
                navigate('/admin-dashboard');
              } else if ((user as any)?.roles?.includes('manager')) {
                navigate('/admin-dashboard');
              } else if ((user as any)?.roles?.includes('dispatcher')) {
                navigate('/admin-dashboard');
              } else {
                navigate('/dashboard');
              }
            }}
            className="flex items-center space-x-1"
          >
            <Home className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Try browser history first, fallback to appropriate dashboard
              if (window.history.length > 1) {
                window.history.back();
              } else {
                // Determine appropriate dashboard based on user role
                if ((user as any)?.roles?.includes('operations_director')) {
                  navigate('/operations-dashboard');
                } else if ((user as any)?.roles?.includes('administrator')) {
                  navigate('/admin-dashboard');
                } else if ((user as any)?.roles?.includes('manager')) {
                  navigate('/admin-dashboard');
                } else if ((user as any)?.roles?.includes('dispatcher')) {
                  navigate('/admin-dashboard');
                } else {
                  navigate('/dashboard');
                }
              }
            }}
            className="flex items-center space-x-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Header */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white">
              {selectedCompany ? `${selectedCompany} - Field Agents` : 'Talent Network'}
            </h1>
          </div>
        </div>
        
        {assignmentWorkOrderId ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <p className="text-blue-700 dark:text-blue-300 font-medium">
                  Assigning agent to:
                </p>
                <span className="font-bold text-gray-900 dark:text-white">"{assignmentWorkOrderTitle}"</span>
                <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700 w-fit">
                  Assigning
                </Badge>
              </div>
              <Button variant="outline" onClick={cancelAssignment} className="w-fit">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-400 text-center">
              {selectedCompany 
                ? `Browse field agents from ${selectedCompany}` 
                : 'Browse field agents from all partner companies'
              }
            </p>
          </div>
        )}

        {/* Search Controls */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder={selectedCompany 
                ? "Search agents by name, email, or specialization..." 
                : "Search companies or agents..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Advanced Filters - only show when viewing agents in a company */}
          {selectedCompany && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Rating Filters */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={ratingFilter === "5star" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRatingFilter("5star")}
                    className="text-xs"
                  >
                    <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                    4.5+ ({filteredAgents.filter((a: FieldAgent) => (a.rating || 0) >= 4.5).length})
                  </Button>
                  <Button
                    variant={ratingFilter === "4star" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRatingFilter("4star")}
                    className="text-xs"
                  >
                    4.0+ ({filteredAgents.filter((a: FieldAgent) => (a.rating || 0) >= 4.0 && (a.rating || 0) < 4.5).length})
                  </Button>
                  <Button
                    variant={ratingFilter === "3star" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRatingFilter("3star")}
                    className="text-xs"
                  >
                    3.0+ ({filteredAgents.filter((a: FieldAgent) => (a.rating || 0) >= 3.0 && (a.rating || 0) < 4.0).length})
                  </Button>
                  <Button
                    variant={ratingFilter === "unrated" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRatingFilter("unrated")}
                    className="text-xs"
                  >
                    Unrated ({filteredAgents.filter((a: FieldAgent) => !a.rating).length})
                  </Button>
                </div>

                {/* Experience Filters */}
                <div className="flex flex-wrap gap-2 border-l border-border pl-2 ml-2">
                  <Button
                    variant={experienceFilter === "senior" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setExperienceFilter("senior")}
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                  >
                    <Award className="h-3 w-3 mr-1" />
                    Senior (5+ years) ({filteredAgents.filter((a: FieldAgent) => (a.yearsExperience || 0) >= 5).length})
                  </Button>
                  <Button
                    variant={experienceFilter === "mid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setExperienceFilter("mid")}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                  >
                    Mid-level (2-5 years) ({filteredAgents.filter((a: FieldAgent) => (a.yearsExperience || 0) >= 2 && (a.yearsExperience || 0) < 5).length})
                  </Button>
                  <Button
                    variant={experienceFilter === "junior" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setExperienceFilter("junior")}
                    className="text-xs bg-green-600 hover:bg-green-700 text-white border-green-600"
                  >
                    Junior (&lt;2 years) ({filteredAgents.filter((a: FieldAgent) => (a.yearsExperience || 0) < 2).length})
                  </Button>
                </div>

                {/* Clear Filters Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRatingFilter("all");
                    setExperienceFilter("all");
                    setWorkOrderFilter("all");
                    setIssuesFilter("all");
                    setRoleFilter("all");
                  }}
                  className="text-xs border-l border-border pl-2 ml-2"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}

          {/* Create User Button for Operations Director - below search, left aligned */}
          {isOperationsDirector && (
            <div className="flex justify-start">
              <Button
                onClick={() => setShowCreateUserDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add New User
              </Button>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        {!selectedCompany ? (
          // Company Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company: any) => (
              <Card 
                key={company.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-blue-500"
                onClick={() => handleCompanyClick(company.name)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building className="h-6 w-6 text-blue-600" />
                      <span className="text-lg">{company.name}</span>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {company.agentCount} agents
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Available Field Agents:</span>
                      <span className="font-semibold">{company.agentCount}</span>
                    </div>
                    
                    {/* Top Skills Preview */}
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Top Skills:</p>
                      <div className="flex flex-wrap gap-1">
                        {company.agents
                          .flatMap((agent: FieldAgent) => agent.specializations || [])
                          .reduce((acc: string[], skill: string) => {
                            if (!acc.includes(skill)) acc.push(skill);
                            return acc;
                          }, [])
                          .slice(0, 3)
                          .map((skill: string) => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // Agents Grid View
          <div>
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="outline"
                size="icon"
                onClick={backToCompanies}
                className="hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map((agent: FieldAgent) => (
                <Card 
                  key={agent.id} 
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleAgentClick(agent)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {agent.firstName[0]}{agent.lastName[0]}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{agent.firstName} {agent.lastName}</CardTitle>
                          {agent.company && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {agent.company.name}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {assignmentWorkOrderId && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignAgent(agent);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Assign
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      {/* Rating and Experience */}
                      <div className="flex items-center justify-between">
                        {agent.rating ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="font-medium">{agent.rating}</span>
                            <span className="text-sm text-gray-500">rating</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No rating</span>
                        )}
                        
                        {agent.yearsExperience && (
                          <div className="flex items-center gap-1">
                            <Award className="h-4 w-4 text-purple-500" />
                            <span className="text-sm font-medium">{agent.yearsExperience}y exp</span>
                          </div>
                        )}
                      </div>

                      {/* Completed Jobs */}
                      {agent.completedJobs !== undefined && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{agent.completedJobs} jobs completed</span>
                        </div>
                      )}

                      {/* Location */}
                      {agent.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">{agent.location}</span>
                        </div>
                      )}

                      {/* Specializations */}
                      {agent.specializations && agent.specializations.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Skills:</p>
                          <div className="flex flex-wrap gap-1">
                            {agent.specializations.slice(0, 3).map((spec) => (
                              <Badge key={spec} variant="secondary" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                            {agent.specializations.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{agent.specializations.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Issues Warning */}
                      {agent.unresolvedIssues && agent.unresolvedIssues > 0 && (
                        <div className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">{agent.unresolvedIssues} unresolved issues</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredAgents.length === 0 && (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No agents found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  No field agents match your current search criteria.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Agent Detail Dialog */}
        {selectedAgent && (
          <Dialog open={!!selectedAgent} onOpenChange={closeAgentDetails}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedAgent.firstName} {selectedAgent.lastName}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Agent Summary */}
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {selectedAgent.firstName[0]}{selectedAgent.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{selectedAgent.firstName} {selectedAgent.lastName}</h3>
                    {selectedAgent.company && (
                      <p className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        {selectedAgent.company.name}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      {selectedAgent.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="font-medium">{selectedAgent.rating}</span>
                        </div>
                      )}
                      {selectedAgent.completedJobs !== undefined && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{selectedAgent.completedJobs} completed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Contact Information</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{selectedAgent.email}</span>
                      </div>
                      {selectedAgent.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{selectedAgent.phone}</span>
                        </div>
                      )}
                      {selectedAgent.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{selectedAgent.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Professional Info</h4>
                    <div className="space-y-2">
                      {selectedAgent.yearsExperience && (
                        <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{selectedAgent.yearsExperience} years experience</span>
                        </div>
                      )}
                      {selectedAgent.availability && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">{selectedAgent.availability}</span>
                        </div>
                      )}
                      {selectedAgent.lastActive && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Last active: {selectedAgent.lastActive}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Specializations */}
                {selectedAgent.specializations && selectedAgent.specializations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Specializations</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAgent.specializations.map((spec) => (
                        <Badge key={spec} variant="secondary">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {selectedAgent.certifications && selectedAgent.certifications.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Certifications</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAgent.certifications.map((cert) => (
                        <Badge key={cert} variant="outline">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" className="flex-1">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Agent
                  </Button>
                  <Button variant="outline" onClick={() => {
                    // TODO: Implement request assignment functionality
                    console.log('Request assignment:', selectedAgent.id);
                  }}>
                    Request Assignment
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Assignment Confirmation Dialog */}
        {confirmAssignAgent && (
          <Dialog open={!!confirmAssignAgent} onOpenChange={cancelAssignmentConfirmation}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">Confirm Assignment</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  Assign <strong>{confirmAssignAgent.firstName} {confirmAssignAgent.lastName}</strong> to work order:
                </p>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="font-semibold text-gray-900 dark:text-white">"{assignmentWorkOrderTitle}"</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={cancelAssignmentConfirmation}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={confirmAssignment}
                    disabled={assignAgentMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {assignAgentMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Assigning...
                      </div>
                    ) : (
                      'Confirm Assignment'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* User Creation Dialog for Operations Director */}
        {isOperationsDirector && (
          <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">Add New User</DialogTitle>
              </DialogHeader>
              <UserOnboardingForm 
                onClose={() => setShowCreateUserDialog(false)}
                onSuccess={() => {
                  setShowCreateUserDialog(false);
                  toast({
                    title: "User Created Successfully",
                    description: "The new user has been added to the system.",
                  });
                  // Refresh field agents data
                  queryClient.invalidateQueries({ queryKey: ['/api/users/field-agents'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/users'] });
                }}
                currentUser={user}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}