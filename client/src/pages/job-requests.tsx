import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, parseCurrency } from "@/lib/utils";
import Navigation from "@/components/navigation";
import PermanentRoleSwitcher from "@/components/permanent-role-switcher";
import { Clock, CheckCircle, XCircle, User, MapPin, Calendar, MessageSquare, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface JobRequestWithDetails {
  id: string;
  workOrderId: string;
  agentId: string;
  status: 'requested' | 'approved' | 'rejected';
  message?: string;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  // Agent info
  agentName: string;
  agentEmail: string;
  // Work order info
  workOrderTitle: string;
  workOrderLocation: string;
  workOrderStatus: string;
}

export default function JobRequestsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<JobRequestWithDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Get current user to determine company ID
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/user'],
  });

  // Fetch job requests for the company
  const { data: jobRequests = [], isLoading } = useQuery<JobRequestWithDetails[]>({
    queryKey: ['/api/job-requests/company', (currentUser as any)?.companyId],
    enabled: !!(currentUser as any)?.companyId,
  });

  const reviewJobRequestMutation = useMutation({
    mutationFn: async ({ requestId, status, rejectionReason }: { 
      requestId: string; 
      status: 'approved' | 'rejected'; 
      rejectionReason?: string;
    }) => {
      const response = await fetch(`/api/job-requests/${requestId}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason }),
      });
      if (!response.ok) throw new Error('Failed to review request');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-requests/company'] });
      toast({
        title: "Job Request Reviewed",
        description: "The job request has been processed successfully.",
      });
      setShowReviewDialog(false);
      setSelectedRequest(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to review job request",
        variant: "destructive",
      });
    },
  });

  const handleReviewRequest = (request: JobRequestWithDetails, status: 'approved' | 'rejected') => {
    if (status === 'rejected') {
      setSelectedRequest(request);
      setShowReviewDialog(true);
    } else {
      reviewJobRequestMutation.mutate({
        requestId: request.id,
        status,
      });
    }
  };

  const handleSubmitRejection = () => {
    if (!selectedRequest) return;
    
    reviewJobRequestMutation.mutate({
      requestId: selectedRequest.id,
      status: 'rejected',
      rejectionReason: rejectionReason.trim() || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />Requested</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <PermanentRoleSwitcher 
          currentActiveRole=""
          onRoleSwitch={() => {}}
        />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading job requests...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <PermanentRoleSwitcher 
        currentActiveRole=""
        onRoleSwitch={() => {}}
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Requests</h1>
            <p className="text-muted-foreground">
              Review and approve job requests from field agents
            </p>
          </div>
        </div>

        {jobRequests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Job Requests</h3>
              <p className="text-muted-foreground text-center">
                There are no job requests from field agents at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {jobRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-500" />
                        {request.agentName}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {request.workOrderLocation}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Requested {formatDate(request.requestedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(request.status)}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Work Order</h4>
                    <p className="font-medium">{request.workOrderTitle}</p>
                  </div>
                  
                  {request.message && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Agent Message</h4>
                      <p className="text-sm bg-muted p-3 rounded-md">{request.message}</p>
                    </div>
                  )}
                  
                  {request.status === 'rejected' && request.rejectionReason && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Rejection Reason
                      </h4>
                      <p className="text-sm bg-red-50 dark:bg-red-950/20 p-3 rounded-md border border-red-200 dark:border-red-800">
                        {request.rejectionReason}
                      </p>
                    </div>
                  )}
                  
                  {request.status === 'requested' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleReviewRequest(request, 'approved')}
                        disabled={reviewJobRequestMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid={`button-approve-${request.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve Request
                      </Button>
                      <Button
                        onClick={() => handleReviewRequest(request, 'rejected')}
                        disabled={reviewJobRequestMutation.isPending}
                        variant="destructive"
                        data-testid={`button-reject-${request.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject Request
                      </Button>
                    </div>
                  )}
                  
                  {request.reviewedAt && (
                    <div className="text-sm text-muted-foreground pt-2 border-t">
                      Reviewed {formatDate(request.reviewedAt)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Job Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this job request. This will help the field agent understand the decision.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Rejection Reason (Optional)</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this request is being rejected..."
                className="mt-1"
                data-testid="textarea-rejection-reason"
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReviewDialog(false);
                  setSelectedRequest(null);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleSubmitRejection}
                disabled={reviewJobRequestMutation.isPending}
                data-testid="button-confirm-rejection"
              >
                Reject Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}