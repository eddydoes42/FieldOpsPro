import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  AlertTriangle, 
  Clock, 
  User, 
  CalendarDays, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  MessageSquare,
  Eye
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Issue {
  id: string;
  workOrderId: string;
  reporterId: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  status: 'open' | 'resolved' | 'escalated';
  attachments: string[];
  reviewedById?: string;
  reviewedAt?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  reporter?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  workOrder?: {
    title: string;
    location: string;
  };
}

interface IssuesTabProps {
  workOrderId?: string;
  canReview?: boolean;
}

export default function IssuesTab({ workOrderId, canReview = false }: IssuesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [resolution, setResolution] = useState('');

  // Fetch issues
  const { data: issues, isLoading } = useQuery({
    queryKey: ['/api/structured-issues', workOrderId ? { workOrderId } : {}],
    queryFn: async () => {
      const url = workOrderId 
        ? `/api/structured-issues?workOrderId=${workOrderId}`
        : '/api/structured-issues';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch issues');
      }
      return response.json();
    },
  });

  // Update issue mutation
  const updateIssueMutation = useMutation({
    mutationFn: async ({ issueId, updates }: { issueId: string; updates: any }) => {
      return apiRequest("PATCH", `/api/structured-issues/${issueId}`, updates);
    },
    onSuccess: () => {
      toast({ title: "Issue updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/structured-issues'] });
      setSelectedIssue(null);
      setResolution('');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update issue",
        description: error.message || "Could not update issue",
        variant: "destructive",
      });
    }
  });

  const handleUpdateIssue = (issueId: string, status: string) => {
    const updates: any = { status };
    if (status === 'resolved' && resolution.trim()) {
      updates.resolution = resolution.trim();
    }
    updateIssueMutation.mutate({ issueId, updates });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'hazard': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'delay': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'equipment': return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default: return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'escalated': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      case 'escalated': return <XCircle className="w-4 h-4" />;
      case 'open': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  // Filter issues
  const filteredIssues = issues?.filter((issue: Issue) => {
    if (filterStatus !== 'all' && issue.status !== filterStatus) return false;
    if (filterSeverity !== 'all' && issue.severity !== filterSeverity) return false;
    return true;
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center flex-wrap">
        <div className="flex items-center gap-2">
          <Label htmlFor="status-filter">Status:</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="severity-filter">Severity:</Label>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Issues List */}
      {filteredIssues.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium mb-2">No Issues Found</h3>
            <p className="text-sm">
              {workOrderId 
                ? "No issues have been reported for this work order."
                : "No issues match your current filter criteria."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map((issue: Issue) => (
            <Card key={issue.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getTypeIcon(issue.type)}
                    <div className="space-y-1">
                      <CardTitle className="text-base capitalize">
                        {issue.type.replace('_', ' ')} Issue
                      </CardTitle>
                      {!workOrderId && issue.workOrder && (
                        <p className="text-sm text-muted-foreground">
                          Work Order: {issue.workOrder.title}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getSeverityColor(issue.severity)}>
                      {issue.severity}
                    </Badge>
                    <Badge className={getStatusColor(issue.status)} variant="outline">
                      {getStatusIcon(issue.status)}
                      <span className="ml-1 capitalize">{issue.status}</span>
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {issue.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>
                      {issue.reporter?.firstName} {issue.reporter?.lastName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" />
                    <span>
                      {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {issue.resolution && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
                    <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                      Resolution:
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {issue.resolution}
                    </p>
                  </div>
                )}

                {canReview && issue.status === 'open' && (
                  <div className="pt-2 border-t">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedIssue(issue)}
                        data-testid={`button-resolve-${issue.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUpdateIssue(issue.id, 'escalated')}
                        data-testid={`button-escalate-${issue.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Escalate
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resolution Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Resolve Issue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="resolution">Resolution Notes (Optional)</Label>
                <Textarea
                  id="resolution"
                  placeholder="Describe how the issue was resolved..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={3}
                  data-testid="textarea-resolution"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedIssue(null);
                    setResolution('');
                  }}
                  data-testid="button-cancel-resolution"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUpdateIssue(selectedIssue.id, 'resolved')}
                  disabled={updateIssueMutation.isPending}
                  data-testid="button-confirm-resolution"
                >
                  {updateIssueMutation.isPending ? "Resolving..." : "Mark Resolved"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}