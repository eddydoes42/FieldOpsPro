import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  User, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle,
  Upload,
  Shield,
  Star,
  Award
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface OnboardingStage {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  required: boolean;
}

interface ContractorOnboarding {
  id: string;
  userId: string;
  companyId: string;
  onboardingStage: string;
  applicationData: any;
  documentsSubmitted: any;
  skillsAssessmentScore: number;
  backgroundCheckStatus: string;
  backgroundCheckData: any;
  approvedById?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  completedAt?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  company?: {
    name: string;
  };
}

interface ContractorOnboardingFlowProps {
  userRole?: string;
  companyId?: string;
  userId?: string;
  viewMode?: 'applicant' | 'admin' | 'overview';
}

export default function ContractorOnboardingFlow({ 
  userRole, 
  companyId, 
  userId,
  viewMode = 'overview' 
}: ContractorOnboardingFlowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOnboarding, setSelectedOnboarding] = useState<string | null>(null);

  // Application form state
  const [applicationForm, setApplicationForm] = useState({
    personalInfo: {
      experience: "",
      specializations: "",
      availability: "",
      preferredWorkRadius: "25",
    },
    skills: {
      technicalSkills: "",
      certifications: "",
      tools: "",
      softwareExperience: "",
    },
    background: {
      workHistory: "",
      education: "",
      references: "",
      criminalHistory: false,
    },
    equipment: {
      hasVehicle: true,
      hasTools: true,
      hasInsurance: true,
      vehicleType: "",
      toolsDescription: "",
    },
  });

  const onboardingStages: OnboardingStage[] = [
    {
      id: 'application',
      name: 'Application',
      description: 'Complete application form with personal and professional details',
      completed: false,
      required: true,
    },
    {
      id: 'documentation',
      name: 'Documentation',
      description: 'Upload required documents (ID, certifications, insurance)',
      completed: false,
      required: true,
    },
    {
      id: 'skills_assessment',
      name: 'Skills Assessment',
      description: 'Complete technical skills evaluation',
      completed: false,
      required: true,
    },
    {
      id: 'background_check',
      name: 'Background Check',
      description: 'Background verification and security clearance',
      completed: false,
      required: true,
    },
    {
      id: 'approval',
      name: 'Approval',
      description: 'Final review and approval by company administrators',
      completed: false,
      required: true,
    },
    {
      id: 'completed',
      name: 'Completed',
      description: 'Onboarding completed - ready for work assignments',
      completed: false,
      required: true,
    },
  ];

  // Fetch onboarding records
  const { data: onboardingRecords, isLoading } = useQuery({
    queryKey: ['/api/contractor-onboarding', { companyId, userId, viewMode }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (userId) params.append('userId', userId);
      if (viewMode) params.append('viewMode', viewMode);
      
      const response = await fetch(`/api/contractor-onboarding?${params}`);
      if (!response.ok) throw new Error('Failed to fetch onboarding records');
      return response.json();
    },
  });

  // Fetch selected onboarding details
  const { data: onboardingDetails } = useQuery({
    queryKey: ['/api/contractor-onboarding', selectedOnboarding],
    queryFn: async () => {
      if (!selectedOnboarding) return null;
      const response = await fetch(`/api/contractor-onboarding/${selectedOnboarding}`);
      if (!response.ok) throw new Error('Failed to fetch onboarding details');
      return response.json();
    },
    enabled: !!selectedOnboarding,
  });

  // Submit application mutation
  const submitApplicationMutation = useMutation({
    mutationFn: async (applicationData: any) => {
      return apiRequest("POST", "/api/contractor-onboarding/application", applicationData);
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your contractor application has been submitted for review."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-onboarding'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit application",
        description: error.message || "Could not submit application",
        variant: "destructive",
      });
    }
  });

  // Update onboarding stage mutation
  const updateStageMutation = useMutation({
    mutationFn: async ({ onboardingId, stage, data }: { 
      onboardingId: string; 
      stage: string; 
      data: any 
    }) => {
      return apiRequest("PUT", `/api/contractor-onboarding/${onboardingId}/stage`, {
        stage,
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Stage Updated",
        description: "Onboarding stage has been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-onboarding'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update stage",
        description: error.message || "Could not update onboarding stage",
        variant: "destructive",
      });
    }
  });

  // Approve/reject onboarding mutation
  const approvalMutation = useMutation({
    mutationFn: async ({ onboardingId, action, notes }: { 
      onboardingId: string; 
      action: 'approve' | 'reject'; 
      notes?: string 
    }) => {
      return apiRequest("POST", `/api/contractor-onboarding/${onboardingId}/${action}`, {
        notes,
      });
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.action === 'approve' ? "Application Approved" : "Application Rejected",
        description: `Contractor onboarding has been ${variables.action}d.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contractor-onboarding'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to process approval",
        description: error.message || "Could not process approval",
        variant: "destructive",
      });
    }
  });

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'application': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'documentation': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'skills_assessment': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'background_check': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'approval': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getBackgroundCheckColor = (status: string) => {
    switch (status) {
      case 'clear': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'issues': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getProgressPercentage = (stage: string) => {
    const stageOrder = ['application', 'documentation', 'skills_assessment', 'background_check', 'approval', 'completed'];
    const currentIndex = stageOrder.indexOf(stage);
    return ((currentIndex + 1) / stageOrder.length) * 100;
  };

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    submitApplicationMutation.mutate({
      applicationData: applicationForm,
      companyId,
    });
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
    <div className="space-y-6" data-testid="contractor-onboarding-flow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {viewMode === 'applicant' ? 'My Onboarding' : 'Contractor Onboarding'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {viewMode === 'applicant' 
              ? 'Track your contractor onboarding progress'
              : viewMode === 'admin'
              ? 'Manage contractor applications and onboarding process'
              : 'Overview of contractor onboarding pipeline'}
          </p>
        </div>
      </div>

      {/* Onboarding Process Overview for Applicants */}
      {viewMode === 'applicant' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Onboarding Process</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {onboardingStages.map((stage, index) => (
                <div key={stage.id} className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    stage.completed 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {stage.completed ? <CheckCircle className="w-4 h-4" /> : <span>{index + 1}</span>}
                  </div>
                  <div>
                    <p className="font-medium">{stage.name}</p>
                    <p className="text-xs text-gray-500">{stage.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Application Form for New Applicants */}
            {!onboardingRecords?.length && (
              <form onSubmit={handleSubmitApplication} className="space-y-6 pt-6 border-t">
                <h3 className="text-lg font-semibold">Contractor Application</h3>

                {/* Personal Information */}
                <div className="space-y-4">
                  <h4 className="font-medium">Personal Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="experience">Years of Experience</Label>
                      <Input
                        id="experience"
                        value={applicationForm.personalInfo.experience}
                        onChange={(e) => setApplicationForm(prev => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, experience: e.target.value }
                        }))}
                        placeholder="5 years"
                        data-testid="input-experience"
                      />
                    </div>

                    <div>
                      <Label htmlFor="availability">Availability</Label>
                      <Select 
                        value={applicationForm.personalInfo.availability} 
                        onValueChange={(value) => setApplicationForm(prev => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, availability: value }
                        }))}
                      >
                        <SelectTrigger data-testid="select-availability">
                          <SelectValue placeholder="Select availability" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full_time">Full Time</SelectItem>
                          <SelectItem value="part_time">Part Time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="weekends">Weekends</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="specializations">Specializations</Label>
                      <Textarea
                        id="specializations"
                        value={applicationForm.personalInfo.specializations}
                        onChange={(e) => setApplicationForm(prev => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, specializations: e.target.value }
                        }))}
                        placeholder="Network installation, WiFi setup, security systems..."
                        rows={3}
                        data-testid="textarea-specializations"
                      />
                    </div>
                  </div>
                </div>

                {/* Skills and Certifications */}
                <div className="space-y-4">
                  <h4 className="font-medium">Skills and Certifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="technicalSkills">Technical Skills</Label>
                      <Textarea
                        id="technicalSkills"
                        value={applicationForm.skills.technicalSkills}
                        onChange={(e) => setApplicationForm(prev => ({
                          ...prev,
                          skills: { ...prev.skills, technicalSkills: e.target.value }
                        }))}
                        placeholder="Cisco, Windows Server, Linux..."
                        rows={3}
                        data-testid="textarea-technical-skills"
                      />
                    </div>

                    <div>
                      <Label htmlFor="certifications">Certifications</Label>
                      <Textarea
                        id="certifications"
                        value={applicationForm.skills.certifications}
                        onChange={(e) => setApplicationForm(prev => ({
                          ...prev,
                          skills: { ...prev.skills, certifications: e.target.value }
                        }))}
                        placeholder="CompTIA Network+, CCNA..."
                        rows={3}
                        data-testid="textarea-certifications"
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={submitApplicationMutation.isPending} data-testid="button-submit-application">
                  {submitApplicationMutation.isPending ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Onboarding Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {onboardingRecords?.map((record: ContractorOnboarding) => (
          <Card 
            key={record.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedOnboarding(record.id)}
            data-testid={`onboarding-card-${record.id}`}
          >
            <CardHeader className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">
                    {record.user ? `${record.user.firstName} ${record.user.lastName}` : 'Contractor'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {record.user?.email}
                  </p>
                </div>
                <Badge className={getStageColor(record.onboardingStage)}>
                  {record.onboardingStage.replace('_', ' ')}
                </Badge>
              </div>
              
              <Progress value={getProgressPercentage(record.onboardingStage)} className="h-2" />
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="truncate">
                    Started {formatDistanceToNow(new Date(record.createdAt))} ago
                  </span>
                </div>
                
                {record.skillsAssessmentScore && (
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-gray-400" />
                    <span>Score: {record.skillsAssessmentScore}%</span>
                  </div>
                )}

                {record.backgroundCheckStatus && (
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <Badge className={getBackgroundCheckColor(record.backgroundCheckStatus)}>
                      {record.backgroundCheckStatus}
                    </Badge>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-gray-400" />
                  <span className={record.isActive ? 'text-green-600' : 'text-red-600'}>
                    {record.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {record.company && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500">
                    Company: {record.company.name}
                  </p>
                </div>
              )}

              {userRole && ['administrator', 'manager'].includes(userRole) && (
                <div className="flex gap-2 pt-2 border-t">
                  {record.onboardingStage === 'approval' && (
                    <>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          approvalMutation.mutate({ 
                            onboardingId: record.id, 
                            action: 'approve' 
                          });
                        }}
                        disabled={approvalMutation.isPending}
                        data-testid={`button-approve-${record.id}`}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          approvalMutation.mutate({ 
                            onboardingId: record.id, 
                            action: 'reject' 
                          });
                        }}
                        disabled={approvalMutation.isPending}
                        data-testid={`button-reject-${record.id}`}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {onboardingRecords?.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No onboarding records found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {viewMode === 'applicant' 
                ? 'Submit your contractor application to get started.'
                : 'No contractor onboarding applications to review.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}