import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
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
  ArrowLeft
} from "lucide-react";

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
}

export default function TalentNetwork() {
  const [selectedAgent, setSelectedAgent] = useState<FieldAgent | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [assignmentWorkOrderId, setAssignmentWorkOrderId] = useState<string | null>(null);
  const [assignmentWorkOrderTitle, setAssignmentWorkOrderTitle] = useState<string>('');
  const [confirmAssignAgent, setConfirmAssignAgent] = useState<FieldAgent | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Filter agents based on search term and company for company view
  const filteredAgents = selectedCompany 
    ? selectedCompanyAgents.filter((agent: FieldAgent) => {
        return !searchTerm || 
          `${agent.firstName} ${agent.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.specializations?.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()));
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
      return apiRequest(`/api/work-orders/${assignmentWorkOrderId}/assign`, {
        method: 'PATCH',
        body: { assigneeId: agentId },
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
    <div className="p-6 space-y-6">
      {/* Role Testers - Always present for Operations Director */}
      <ServiceCompanyRoleTester />
      <ClientCompanyRoleTester />

      {/* Navigation Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/dashboard')}
          className="hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Home className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => window.history.back()}
          className="hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          {selectedCompany && (
            <Button
              variant="outline"
              size="icon"
              onClick={backToCompanies}
              className="hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {selectedCompany ? `${selectedCompany} - Field Agents` : 'Talent Network'}
          </h1>
        </div>
        
        {assignmentWorkOrderId ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
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
          <p className="text-gray-600 dark:text-gray-400">
            {selectedCompany 
              ? `Browse field agents from ${selectedCompany}` 
              : 'Browse field agents from all partner companies'
            }
          </p>
        )}
      </div>

      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
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
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {selectedCompany 
          ? `Showing ${filteredAgents.length} field agent${filteredAgents.length !== 1 ? 's' : ''} from ${selectedCompany}`
          : `Showing ${filteredCompanies.length} compan${filteredCompanies.length !== 1 ? 'ies' : 'y'}`
        }
      </div>

      {/* Company Cards or Field Agent Cards Grid */}
      {!selectedCompany ? (
        /* Company Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCompanies.map((company: any) => (
            <Card
              key={company.id}
              className={`cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-l-4 ${
                assignmentWorkOrderId 
                  ? 'border-l-green-500 hover:border-l-green-600' 
                  : 'border-l-blue-500'
              }`}
              onClick={() => handleCompanyClick(company.name)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold text-lg">
                      <Building className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-base leading-tight">
                        {company.name}
                      </CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {company.agentCount} field agent{company.agentCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {assignmentWorkOrderId && (
                    <Badge variant="secondary" className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200">
                      Select Company
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <UserCheck className="h-4 w-4" />
                    <span>Active field agents available</span>
                  </div>
                  
                  {/* Show top skills from agents in this company */}
                  {company.agents && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Array.from(new Set(company.agents.flatMap((agent: FieldAgent) => agent.specializations || []))).slice(0, 3).map((skill: any) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Field Agent Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAgents.map((agent: FieldAgent) => (
          <Card
            key={agent.id}
            className={`cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-l-4 relative ${
              assignmentWorkOrderId 
                ? 'border-l-green-500 hover:border-l-green-600' 
                : 'border-l-blue-500'
            }`}
            onClick={() => handleAgentClick(agent)}
          >
            {/* Assignment Mode - Green Plus Icon */}
            {assignmentWorkOrderId && (
              <div className="absolute top-2 right-2 z-10">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    handleAssignAgent(agent);
                  }}
                  disabled={assignAgentMutation.isPending}
                  className="w-8 h-8 rounded-full bg-green-600 hover:bg-green-700 text-white p-0 shadow-lg"
                >
                  {assignAgentMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
            
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    {agent.firstName[0]}{agent.lastName[0]}
                  </div>
                  <div>
                    <CardTitle className="text-base leading-tight">
                      {agent.firstName} {agent.lastName}
                    </CardTitle>
                    {agent.company && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                        <Building className="h-3 w-3" />
                        {agent.company.name}
                      </p>
                    )}
                  </div>
                </div>
                {agent.rating && (
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-sm font-medium">{agent.rating}</span>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-3">
                {agent.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="h-4 w-4" />
                    <span>{agent.location}</span>
                  </div>
                )}

                {agent.specializations && agent.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {agent.specializations.slice(0, 2).map((spec) => (
                      <Badge key={spec} variant="secondary" className="text-xs">
                        {spec}
                      </Badge>
                    ))}
                    {agent.specializations.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{agent.specializations.length - 2} more
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  {agent.completedJobs !== undefined && (
                    <div className="flex items-center gap-1">
                      <UserCheck className="h-4 w-4" />
                      <span>{agent.completedJobs} jobs</span>
                    </div>
                  )}
                  
                  {agent.yearsExperience && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{agent.yearsExperience}y exp</span>
                    </div>
                  )}
                </div>

                {agent.availability && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <Badge 
                      variant={agent.availability === "Available" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {agent.availability}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {/* Empty States */}
      {!selectedCompany && filteredCompanies.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <Building className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No companies found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your search criteria.
          </p>
        </div>
      )}

      {selectedCompany && filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <User className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No field agents found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            No agents available in {selectedCompany} matching your search criteria.
          </p>
        </div>
      )}

      {/* Agent Details Modal */}
      {selectedAgent && (
        <Dialog open={!!selectedAgent} onOpenChange={closeAgentDetails}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">Agent Details</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Agent Header */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                  {selectedAgent.firstName[0]}{selectedAgent.lastName[0]}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">
                    {selectedAgent.firstName} {selectedAgent.lastName}
                  </h2>
                  {selectedAgent.company && (
                    <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-1">
                      <Building className="h-4 w-4" />
                      {selectedAgent.company.name}
                    </p>
                  )}
                  {selectedAgent.rating && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="h-5 w-5 fill-current" />
                        <span className="font-medium">{selectedAgent.rating}</span>
                      </div>
                      <span className="text-gray-500 dark:text-gray-400 text-sm">
                        ({selectedAgent.completedJobs || 0} jobs completed)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{selectedAgent.email}</span>
                  </div>
                  {selectedAgent.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{selectedAgent.phone}</span>
                    </div>
                  )}
                  {selectedAgent.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{selectedAgent.location}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Professional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedAgent.specializations && selectedAgent.specializations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Specializations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedAgent.specializations.map((spec) => (
                          <Badge key={spec} variant="secondary">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedAgent.certifications && selectedAgent.certifications.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Certifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedAgent.certifications.map((cert) => (
                          <div key={cert} className="flex items-center gap-2">
                            <Award className="h-3 w-3 text-blue-500" />
                            <span className="text-sm">{cert}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Experience and Availability */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {selectedAgent.yearsExperience && (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <div className="text-2xl font-bold">{selectedAgent.yearsExperience}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Years Experience</div>
                    </CardContent>
                  </Card>
                )}

                {selectedAgent.completedJobs !== undefined && (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <UserCheck className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <div className="text-2xl font-bold">{selectedAgent.completedJobs}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Jobs Completed</div>
                    </CardContent>
                  </Card>
                )}

                {selectedAgent.availability && (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                      <div className="text-lg font-medium">{selectedAgent.availability}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Current Status</div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {selectedAgent.lastActive && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Last Active:</span>
                      <span className="font-medium">{new Date(selectedAgent.lastActive).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button className="flex-1" onClick={() => {
                  // TODO: Implement contact agent functionality
                  console.log('Contact agent:', selectedAgent.id);
                }}>
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

              {/* Agent Summary */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {confirmAssignAgent.firstName[0]}{confirmAssignAgent.lastName[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{confirmAssignAgent.firstName} {confirmAssignAgent.lastName}</p>
                    {confirmAssignAgent.company && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {confirmAssignAgent.company.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {confirmAssignAgent.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-medium">{confirmAssignAgent.rating}</span>
                      <span className="text-gray-500">rating</span>
                    </div>
                  )}
                  
                  {confirmAssignAgent.completedJobs !== undefined && (
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{confirmAssignAgent.completedJobs}</span>
                      <span className="text-gray-500">completed</span>
                    </div>
                  )}
                </div>

                {confirmAssignAgent.specializations && confirmAssignAgent.specializations.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Skills:</p>
                    <div className="flex flex-wrap gap-1">
                      {confirmAssignAgent.specializations.slice(0, 3).map((spec) => (
                        <Badge key={spec} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                      {confirmAssignAgent.specializations.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{confirmAssignAgent.specializations.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
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
    </div>
  );
}