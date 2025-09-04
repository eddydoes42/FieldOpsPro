import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryKeys, handleMutationError } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Clock,
  DollarSign,
  Users,
  Trash2
} from "lucide-react";

interface ApprovalRequest {
  id: string;
  type: 'user_deletion' | 'high_budget_work_order' | 'high_budget_project' | 'issue_escalation' | 'overtime_request' | 'equipment_request';
  requesterId: string;
  requesterName?: string;
  requesterRole?: string;
  title?: string;
  description?: string;
  budgetAmount?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  notes?: string;
}

interface ThingsToApproveEnhancedProps {
  userRole: string;
  companyType?: 'service' | 'client';
  className?: string;
}

export function ThingsToApproveEnhanced({ 
  userRole, 
  companyType = 'service', 
  className 
}: ThingsToApproveEnhancedProps) {
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Don't show for field agents
  if (userRole === 'field_agent') return null;

  // Query for role-specific approval requests
  const { data: approvalRequests = [], isLoading } = useQuery<ApprovalRequest[]>({
    queryKey: queryKeys.approvalRequests(),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 8000,
  });

  // Filter requests based on role hierarchy
  const getFilteredRequests = (requests: ApprovalRequest[], role: string) => {
    const roleHierarchy = {
      'operations_director': ['user_deletion', 'high_budget_work_order', 'high_budget_project', 'issue_escalation', 'overtime_request', 'equipment_request'],
      'administrator': ['user_deletion', 'high_budget_work_order', 'high_budget_project'],
      'project_manager': ['high_budget_project', 'issue_escalation'],
      'manager': ['overtime_request', 'equipment_request', 'issue_escalation'],
      'dispatcher': ['overtime_request', 'equipment_request'],
      'field_engineer': ['equipment_request']
    };

    const allowedTypes = roleHierarchy[role as keyof typeof roleHierarchy] || [];
    return requests.filter(req => 
      req.status === 'pending' && 
      allowedTypes.includes(req.type)
    );
  };

  const filteredRequests = getFilteredRequests(approvalRequests, userRole);
  const pendingCount = filteredRequests.length;

  // Approval mutation
  const approvalMutation = useMutation({
    mutationFn: async ({ requestId, action, notes }: { 
      requestId: string; 
      action: 'approve' | 'reject' | 'escalate'; 
      notes?: string; 
    }) => {
      return apiRequest(`/api/approval-requests/${requestId}/review`, 'PATCH', { 
        status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'escalated',
        notes 
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.approvalRequests() });
      toast({
        title: "Request Processed",
        description: `Request has been ${variables.action}d successfully.`,
      });
      setShowDialog(false);
      setSelectedRequest(null);
    },
    onError: (error: Error) => {
      handleMutationError(error, toast);
    },
  });

  const getTypeInfo = (type: string) => {
    const types = {
      'user_deletion': {
        label: 'User Deletion',
        icon: <Trash2 className="h-4 w-4" />,
        color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
      },
      'high_budget_work_order': {
        label: 'Budget Approval',
        icon: <DollarSign className="h-4 w-4" />,
        color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
      },
      'high_budget_project': {
        label: 'Project Budget',
        icon: <FileText className="h-4 w-4" />,
        color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200'
      },
      'issue_escalation': {
        label: 'Issue Escalation',
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200'
      },
      'overtime_request': {
        label: 'Overtime Request',
        icon: <Clock className="h-4 w-4" />,
        color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
      },
      'equipment_request': {
        label: 'Equipment Request',
        icon: <Users className="h-4 w-4" />,
        color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
      }
    };

    return types[type as keyof typeof types] || {
      label: 'General Request',
      icon: <FileText className="h-4 w-4" />,
      color: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200'
    };
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      'urgent': 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700',
      'high': 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700',
      'normal': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700',
      'low': 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700'
    };

    return variants[priority as keyof typeof variants] || variants.normal;
  };

  const handleApproval = (action: 'approve' | 'reject' | 'escalate') => {
    if (!selectedRequest) return;
    
    approvalMutation.mutate({
      requestId: selectedRequest.id,
      action,
      notes: action === 'reject' ? 'Request denied by reviewer' : undefined
    });
  };

  if (isLoading) {
    return (
      <Card className={cn("cursor-pointer hover:shadow-lg transition-shadow", className)}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span>Things to Approve</span>
            </div>
            <Skeleton className="h-6 w-8" />
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (pendingCount === 0) {
    return (
      <Card className={cn("cursor-default", className)}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span>Things to Approve</span>
            </div>
            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
              0
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-gray-600 dark:text-gray-400">All caught up!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className={cn("cursor-pointer hover:shadow-lg transition-shadow", className)}
        onClick={() => setShowDialog(true)}
        data-testid="card-things-to-approve"
      >
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span>Things to Approve</span>
            </div>
            <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200">
              {pendingCount}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {filteredRequests.slice(0, 2).map((request) => {
              const typeInfo = getTypeInfo(request.type);
              return (
                <div key={request.id} className={cn("p-2 rounded-lg border", typeInfo.color)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {typeInfo.icon}
                      <span className="text-xs font-medium">{typeInfo.label}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", getPriorityBadge(request.priority))}
                    >
                      {request.priority.toUpperCase()}
                    </Badge>
                  </div>
                  {request.budgetAmount && (
                    <p className="text-xs mt-1">${parseFloat(request.budgetAmount).toLocaleString()}</p>
                  )}
                </div>
              );
            })}
            {pendingCount > 2 && (
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                +{pendingCount - 2} more pending
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span>Things to Approve ({pendingCount})</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {filteredRequests.map((request) => {
              const typeInfo = getTypeInfo(request.type);
              return (
                <Card 
                  key={request.id} 
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => setSelectedRequest(request)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={cn("p-2 rounded-lg", typeInfo.color)}>
                          {typeInfo.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {typeInfo.label}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            By {request.requesterName || 'Unknown'} • {request.requesterRole || 'Unknown Role'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getPriorityBadge(request.priority))}
                        >
                          {request.priority.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {request.budgetAmount && (
                        <p className="text-sm">
                          <strong>Budget:</strong> ${parseFloat(request.budgetAmount).toLocaleString()}
                        </p>
                      )}
                      {request.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {request.description}
                        </p>
                      )}
                      <div className="flex justify-end space-x-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequest(request);
                            handleApproval('reject');
                          }}
                          disabled={approvalMutation.isPending}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequest(request);
                            handleApproval('approve');
                          }}
                          disabled={approvalMutation.isPending}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}