import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { Eye, CheckCircle, XCircle, Users, Clock, Mail, Phone, Building2, Award, MessageSquare } from "lucide-react";
import type { OnboardingRequest } from "@shared/schema";

interface OnboardingRequestWithDetails extends OnboardingRequest {
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function OnboardingRequests() {
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequestWithDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery<OnboardingRequestWithDetails[]>({
    queryKey: ['/api/onboarding-requests'],
  });

  const reviewRequest = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { 
      id: string; 
      status: 'approved' | 'rejected'; 
      rejectionReason?: string;
    }) => {
      const response = await fetch(`/api/onboarding-requests/${id}/review`, {
        method: "PATCH",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, rejectionReason }),
      });
      if (!response.ok) {
        throw new Error('Failed to review request');
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding-requests'] });
      toast({
        title: variables.status === 'approved' ? "Application Approved" : "Application Rejected",
        description: variables.status === 'approved' 
          ? "The contractor has been approved and will receive login credentials." 
          : "The application has been rejected.",
      });
      setSelectedRequest(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Review Failed",
        description: error.message || "There was an error processing the review.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const handleApprove = () => {
    if (selectedRequest) {
      reviewRequest.mutate({ 
        id: selectedRequest.id, 
        status: 'approved' 
      });
    }
  };

  const handleReject = () => {
    if (selectedRequest && rejectionReason.trim()) {
      reviewRequest.mutate({ 
        id: selectedRequest.id, 
        status: 'rejected',
        rejectionReason: rejectionReason.trim()
      });
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Contractor Applications
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Review and approve contractor onboarding requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{rejectedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{requests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      <div className="space-y-6">
        {requests.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Applications Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Contractor applications will appear here for review.
              </p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <CardTitle className="text-lg">{request.name}</CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {request.email}
                        </span>
                        {request.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {request.phone}
                          </span>
                        )}
                        {request.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {request.company}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(request.status)} data-testid={`status-${request.status}`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                          data-testid={`button-view-${request.name.replace(/\s+/g, '-').toLowerCase()}`}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Application Details</DialogTitle>
                          <DialogDescription>
                            Review contractor application for {request.name}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6">
                          {/* Basic Info */}
                          <div>
                            <h3 className="font-semibold text-lg mb-3">Basic Information</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Name:</span> {request.name}
                              </div>
                              <div>
                                <span className="font-medium">Email:</span> {request.email}
                              </div>
                              <div>
                                <span className="font-medium">Phone:</span> {request.phone || 'Not provided'}
                              </div>
                              <div>
                                <span className="font-medium">Company:</span> {request.company || 'Not provided'}
                              </div>
                              <div>
                                <span className="font-medium">Applied:</span> {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                              </div>
                              <div>
                                <span className="font-medium">Status:</span> 
                                <Badge className={`ml-2 ${getStatusColor(request.status)}`}>
                                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Skills */}
                          <div>
                            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                              <Award className="w-5 h-5" />
                              Skills & Certifications
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {request.skills && request.skills.length > 0 ? (
                                request.skills.map((skill) => (
                                  <Badge key={skill} variant="secondary">
                                    {skill}
                                  </Badge>
                                ))
                              ) : (
                                <p className="text-gray-500 italic">No skills specified</p>
                              )}
                            </div>
                          </div>

                          {/* Motivation */}
                          {request.motivation && (
                            <div>
                              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5" />
                                Motivation
                              </h3>
                              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                <p className="text-sm whitespace-pre-wrap">{request.motivation}</p>
                              </div>
                            </div>
                          )}

                          {/* Review Details */}
                          {request.status !== 'pending' && (
                            <div>
                              <h3 className="font-semibold text-lg mb-3">Review Details</h3>
                              <div className="text-sm space-y-2">
                                <div>
                                  <span className="font-medium">Reviewed by:</span> 
                                  {request.reviewer ? `${request.reviewer.firstName} ${request.reviewer.lastName}` : 'System'}
                                </div>
                                <div>
                                  <span className="font-medium">Reviewed at:</span> 
                                  {request.reviewedAt ? formatDistanceToNow(new Date(request.reviewedAt!), { addSuffix: true }) : 'N/A'}
                                </div>
                                {request.rejectionReason && (
                                  <div>
                                    <span className="font-medium">Rejection Reason:</span>
                                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mt-1">
                                      <p className="text-sm">{request.rejectionReason}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          {request.status === 'pending' && (
                            <div className="space-y-4 pt-4 border-t">
                              <div className="flex gap-3">
                                <Button 
                                  onClick={handleApprove}
                                  disabled={reviewRequest.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                  data-testid="button-approve-application"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve Application
                                </Button>
                                <Button 
                                  variant="destructive"
                                  disabled={!rejectionReason.trim() || reviewRequest.isPending}
                                  onClick={handleReject}
                                  data-testid="button-reject-application"
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject Application
                                </Button>
                              </div>
                              <div>
                                <Label htmlFor="rejection-reason">Rejection Reason (required for rejection)</Label>
                                <Textarea
                                  id="rejection-reason"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  placeholder="Provide a reason for rejecting this application..."
                                  className="mt-1"
                                  data-testid="textarea-rejection-reason"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    <span>{request.skills?.length || 0} skills listed</span>
                  </div>
                  <div>
                    Applied {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                  </div>
                  {request.reviewedAt && (
                    <div>
                      Reviewed {formatDistanceToNow(new Date(request.reviewedAt!), { addSuffix: true })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}