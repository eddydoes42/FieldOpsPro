import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building2, 
  User, 
  Calendar,
  AlertTriangle,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import UserOnboardingForm from "@/components/user-onboarding-form";

interface ThingsToApprovePopupProps {
  open: boolean;
  onClose: () => void;
}

interface AccessRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  requestedRole: string;
  status: string;
  createdAt: string;
}

export function ThingsToApprovePopup({ open, onClose }: ThingsToApprovePopupProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'access-requests' | 'approval-requests'>('access-requests');
  const [showUserForm, setShowUserForm] = useState(false);
  const [selectedAccessRequest, setSelectedAccessRequest] = useState<AccessRequest | null>(null);

  // Fetch access requests
  const { data: accessRequests = [], isLoading: isLoadingAccess } = useQuery({
    queryKey: ['/api/access-requests'],
    enabled: open
  });

  // Fetch approval requests  
  const { data: approvalRequests = [], isLoading: isLoadingApprovals } = useQuery({
    queryKey: ['/api/approval-requests'],
    enabled: open
  });

  // Approve access request mutation (called after user creation)
  const approveAccessMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest(`/api/access-requests/${requestId}/approve`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/access-requests'] });
      setShowUserForm(false);
      setSelectedAccessRequest(null);
      toast({
        title: "User Created Successfully",
        description: "Access request has been approved and user account created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        variant: "destructive",
      });
    }
  });

  // Handle opening the user creation form
  const handleApproveRequest = (request: AccessRequest) => {
    setSelectedAccessRequest(request);
    setShowUserForm(true);
  };

  // Handle successful user creation - this approves the access request
  const handleUserCreationSuccess = () => {
    if (selectedAccessRequest) {
      approveAccessMutation.mutate(selectedAccessRequest.id);
    }
  };

  // Handle form close without completion - access request stays pending
  const handleUserFormClose = () => {
    setShowUserForm(false);
    setSelectedAccessRequest(null);
  };

  // Reject access request mutation
  const rejectAccessMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest(`/api/access-requests/${requestId}/reject`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/access-requests'] });
      toast({
        title: "Request Rejected",
        description: "Access request has been rejected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject request",
        variant: "destructive",
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
    }
  };

  const pendingAccessCount = accessRequests.filter((req: any) => req.status === 'pending').length;
  const pendingApprovalCount = approvalRequests.filter((req: any) => req.status === 'pending').length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-4xl h-[85vh] max-h-[85vh] p-0 fixed top-[7.5vh] left-[2.5vw] sm:relative sm:top-auto sm:left-auto sm:m-6 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="text-xl font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Things to Approve
          </DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <button
            onClick={() => setActiveTab('access-requests')}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'access-requests'
                ? "border-primary text-primary dark:text-primary-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Access Requests
            {pendingAccessCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingAccessCount}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab('approval-requests')}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'approval-requests'
                ? "border-primary text-primary dark:text-primary-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Approval Requests
            {pendingApprovalCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingApprovalCount}
              </Badge>
            )}
          </button>
        </div>

        <ScrollArea className="flex-1 h-[55vh] max-h-[55vh] sm:max-h-96 overflow-y-auto">
          <div className="p-6">
            {activeTab === 'access-requests' && (
              <div className="space-y-4">
                {isLoadingAccess ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">Loading access requests...</p>
                  </div>
                ) : accessRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No access requests pending approval</p>
                  </div>
                ) : (
                  accessRequests.map((request: any) => (
                    <div
                      key={request.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              {request.firstName} {request.lastName}
                            </h4>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            {request.email}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Requested Role: <span className="font-medium">{request.requestedRole}</span>
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                            </div>
                            {request.phone && (
                              <span>Phone: {request.phone}</span>
                            )}
                          </div>
                        </div>
                        
                        {request.status === 'pending' && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectAccessMutation.mutate(request.id)}
                              disabled={rejectAccessMutation.isPending}
                              className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveRequest(request)}
                              disabled={approveAccessMutation.isPending}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Create User
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'approval-requests' && (
              <div className="space-y-4">
                {isLoadingApprovals ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">Loading approval requests...</p>
                  </div>
                ) : approvalRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No approval requests pending</p>
                  </div>
                ) : (
                  approvalRequests.map((request: any) => (
                    <div
                      key={request.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                              {request.type || 'General Approval'}
                            </h4>
                            <Badge className={getStatusColor(request.status)}>
                              {request.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {request.description || 'No description provided'}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                            </div>
                            {request.requestedBy && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{request.requestedBy}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* User Creation Form Dialog - Triggered when approving access request */}
      {showUserForm && selectedAccessRequest && (
        <UserOnboardingForm
          onClose={handleUserFormClose}
          onSuccess={handleUserCreationSuccess}
          currentUser={null} // Will be set by the form internally
          preFilledData={{
            firstName: selectedAccessRequest.firstName,
            lastName: selectedAccessRequest.lastName,
            email: selectedAccessRequest.email,
            phone: selectedAccessRequest.phone,
            requestedRole: selectedAccessRequest.requestedRole
          }}
        />
      )}
    </Dialog>
  );
}