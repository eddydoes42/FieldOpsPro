import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { queryKeys } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { 
  FileText,
  AlertTriangle
} from "lucide-react";
import { ThingsToApproveEnhanced } from "./things-to-approve-enhanced";

interface ApprovalRequest {
  id: string;
  type: 'user_deletion' | 'high_budget_work_order' | 'high_budget_project' | 'issue_escalation' | 'overtime_request' | 'equipment_request';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected';
}

interface ThingsToApproveCardProps {
  userRole: string;
  companyType?: 'service' | 'client';
  className?: string;
}

export function ThingsToApproveCard({ 
  userRole, 
  companyType = 'service', 
  className 
}: ThingsToApproveCardProps) {
  const [showDialog, setShowDialog] = useState(false);

  // Don't show for field agents or field engineers
  if (userRole === 'field_agent' || userRole === 'field_engineer') return null;

  // Query for role-specific approval requests
  const { data: approvalRequests = [], isLoading } = useQuery<ApprovalRequest[]>({
    queryKey: queryKeys.approvalRequests(),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 8000,
  });

  // Filter requests based on role hierarchy - same logic as ThingsToApproveEnhanced
  const getFilteredRequests = (requests: ApprovalRequest[], role: string) => {
    const roleHierarchy = {
      'operations_director': ['user_deletion', 'high_budget_work_order', 'high_budget_project', 'issue_escalation', 'overtime_request', 'equipment_request'],
      'administrator': ['user_deletion', 'high_budget_work_order', 'high_budget_project'],
      'project_manager': ['high_budget_project', 'issue_escalation'],
      'manager': ['overtime_request', 'equipment_request', 'issue_escalation'],
      'dispatcher': ['overtime_request', 'equipment_request'],
    };

    const allowedTypes = roleHierarchy[role as keyof typeof roleHierarchy] || [];
    return requests.filter(req => 
      req.status === 'pending' && 
      allowedTypes.includes(req.type)
    );
  };

  const filteredRequests = getFilteredRequests(approvalRequests, userRole);
  const pendingCount = filteredRequests.length;
  const hasUrgent = filteredRequests.some(req => req.priority === 'urgent' || req.priority === 'high');

  return (
    <>
      <Card 
        className={cn(
          "cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4",
          hasUrgent ? "border-l-red-500" : "border-l-amber-500",
          className
        )}
        onClick={() => setShowDialog(true)}
        data-testid="card-things-to-approve"
      >
        <CardContent className="p-3 overflow-hidden">
          <div className="flex items-center">
            <div className={cn(
              "p-2 rounded-lg flex-shrink-0",
              hasUrgent ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"
            )}>
              {hasUrgent ? (
                <AlertTriangle className={cn(
                  "text-sm",
                  hasUrgent ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                )} />
              ) : (
                <FileText className={cn(
                  "text-sm",
                  hasUrgent ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                )} />
              )}
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground truncate">Things to Approve</p>
              <div className="flex items-center space-x-2">
                <p className="text-lg font-bold text-foreground">
                  {isLoading ? '...' : pendingCount}
                </p>
                {hasUrgent && !isLoading && pendingCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="text-[10px] px-1 py-0 h-4"
                    data-testid="badge-urgent"
                  >
                    URGENT
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog using the existing enhanced component inside a dialog wrapper */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span>Things to Approve ({pendingCount})</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            <ThingsToApproveEnhanced 
              userRole={userRole} 
              companyType={companyType}
              className="border-0 shadow-none"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}