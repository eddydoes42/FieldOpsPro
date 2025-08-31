import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";
import { Link, useLocation } from "wouter";
import { Home, Filter, RefreshCw, Eye, User, Calendar, FileText } from "lucide-react";
import Navigation from "@/components/navigation";

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  previousState: string | null;
  newState: string | null;
  reason: string | null;
  metadata: string | null;
  timestamp: string;
  performer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AuditLogsPage() {
  const [location] = useLocation();
  const [entityTypeFilter, setEntityTypeFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Fetch audit logs with filters
  const { data: auditLogs = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/audit-logs', entityTypeFilter, actionFilter, userFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entityTypeFilter && entityTypeFilter !== 'all') params.append('entityType', entityTypeFilter);
      if (actionFilter && actionFilter !== 'all') params.append('action', actionFilter);
      if (userFilter) params.append('userId', userFilter);
      
      const response = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }
      return response.json();
    }
  });

  const clearFilters = () => {
    setEntityTypeFilter("all");
    setActionFilter("all");
    setUserFilter("");
  };

  const getEntityBadgeColor = (entityType: string) => {
    switch (entityType) {
      case 'work_order': return 'bg-blue-100 text-blue-800';
      case 'issue': return 'bg-red-100 text-red-800';
      case 'user_action': return 'bg-green-100 text-green-800';
      case 'assignment': return 'bg-purple-100 text-purple-800';
      case 'approval': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'created': return 'bg-green-100 text-green-800';
      case 'updated': return 'bg-blue-100 text-blue-800';
      case 'deleted': return 'bg-red-100 text-red-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'approved': return 'bg-emerald-100 text-emerald-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEntityId = (entityType: string, entityId: string) => {
    if (entityType === 'work_order') return `WO-${entityId.slice(-6)}`;
    if (entityType === 'issue') return `ISS-${entityId.slice(-6)}`;
    return entityId.slice(-8);
  };

  const parseStateChange = (previousState: string | null, newState: string | null) => {
    try {
      const prev = previousState ? JSON.parse(previousState) : null;
      const curr = newState ? JSON.parse(newState) : null;
      
      if (prev && curr) {
        const changes = [];
        for (const key in curr) {
          if (prev[key] !== curr[key]) {
            changes.push(`${key}: ${prev[key]} → ${curr[key]}`);
          }
        }
        return changes.join(', ') || 'State updated';
      }
      
      if (curr) return Object.entries(curr).map(([k, v]) => `${k}: ${v}`).join(', ');
      return 'No state data';
    } catch {
      return 'Invalid state data';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Audit Trail</h1>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" data-testid="button-home">
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>
        <div className="flex justify-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="heading-audit-logs">Audit Trail</h1>
          <p className="text-gray-600">Track all system actions and changes</p>
        </div>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" data-testid="button-home">
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Entity Type</label>
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger data-testid="select-entity-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="work_order">Work Orders</SelectItem>
                  <SelectItem value="issue">Issues</SelectItem>
                  <SelectItem value="user_action">User Actions</SelectItem>
                  <SelectItem value="assignment">Assignments</SelectItem>
                  <SelectItem value="approval">Approvals</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Action</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger data-testid="select-action">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">User ID</label>
              <Input 
                placeholder="Filter by user ID" 
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                data-testid="input-user-filter"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button 
                onClick={clearFilters} 
                variant="outline"
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
              <Button 
                onClick={() => refetch()} 
                variant="outline"
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logs List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle data-testid="heading-audit-entries">
                Audit Entries ({auditLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-96">
                {auditLogs.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No audit logs found</p>
                    <p className="text-sm">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {auditLogs.map((log: AuditLog) => (
                      <div
                        key={log.id}
                        className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedLog?.id === log.id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                        onClick={() => setSelectedLog(log)}
                        data-testid={`log-entry-${log.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getEntityBadgeColor(log.entityType)}>
                                {log.entityType.replace('_', ' ')}
                              </Badge>
                              <Badge className={getActionBadgeColor(log.action)}>
                                {log.action}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {formatEntityId(log.entityType, log.entityId)}
                              </span>
                            </div>
                            
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              {log.performer ? 
                                `${log.performer.firstName} ${log.performer.lastName}` : 
                                `User ${log.performedBy.slice(-6)}`
                              }
                            </p>
                            
                            {log.reason && (
                              <p className="text-sm text-gray-600 truncate">
                                {log.reason}
                              </p>
                            )}
                          </div>
                          
                          <div className="text-right text-xs text-gray-500 ml-4 flex-shrink-0">
                            <div>{format(new Date(log.timestamp), 'MMM d, HH:mm')}</div>
                            <div>{formatDistanceToNow(new Date(log.timestamp))} ago</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Log Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedLog ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Action</label>
                    <div className="mt-1">
                      <Badge className={getActionBadgeColor(selectedLog.action)}>
                        {selectedLog.action}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Entity</label>
                    <div className="mt-1">
                      <Badge className={getEntityBadgeColor(selectedLog.entityType)}>
                        {selectedLog.entityType.replace('_', ' ')}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1">
                        ID: {formatEntityId(selectedLog.entityType, selectedLog.entityId)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Performed By</label>
                    <div className="mt-1 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="text-sm">
                        {selectedLog.performer ? 
                          `${selectedLog.performer.firstName} ${selectedLog.performer.lastName}` : 
                          `User ${selectedLog.performedBy.slice(-6)}`
                        }
                      </span>
                    </div>
                    {selectedLog.performer?.email && (
                      <p className="text-xs text-gray-500 ml-6">{selectedLog.performer.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Timestamp</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">
                        {format(new Date(selectedLog.timestamp), 'PPpp')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 ml-6">
                      {formatDistanceToNow(new Date(selectedLog.timestamp))} ago
                    </p>
                  </div>

                  {selectedLog.reason && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Reason</label>
                      <p className="text-sm text-gray-900 mt-1">{selectedLog.reason}</p>
                    </div>
                  )}

                  {(selectedLog.previousState || selectedLog.newState) && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Changes</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-md">
                        <p className="text-xs font-mono">
                          {parseStateChange(selectedLog.previousState, selectedLog.newState)}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedLog.metadata && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Metadata</label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-md">
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {JSON.stringify(JSON.parse(selectedLog.metadata), null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Select an audit entry to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}