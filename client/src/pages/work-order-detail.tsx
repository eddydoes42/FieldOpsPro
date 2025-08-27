import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Calendar, Clock, DollarSign, AlertCircle, MessageSquare, CheckSquare, FileText } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import JobMessagesTab from '@/components/job-messages-tab';
import WorkOrderTasks from '@/components/work-order-tasks';
import type { WorkOrder, User } from '@shared/schema';

interface WorkOrderWithRelations extends WorkOrder {
  assignee?: User;
  creator?: User;
  company?: { id: string; name: string; type: string; };
}

export default function WorkOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  
  // Fetch work order details
  const { data: workOrder, isLoading, error } = useQuery({
    queryKey: ['/api/work-orders', id],
    queryFn: async () => {
      const response = await fetch(`/api/work-orders/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch work order');
      }
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/user'],
    queryFn: async () => {
      const response = await fetch('/api/auth/user');
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      return response.json();
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatBudget = (amount: number | null, type: string | null) => {
    if (!amount || !type) return 'Not specified';
    
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
    
    switch (type) {
      case 'hourly': return `${formatted}/hour`;
      case 'per_device': return `${formatted}/device`;
      case 'materials_labor': return `${formatted} (materials + labor)`;
      default: return formatted;
    }
  };

  const isAdmin = currentUser?.roles?.includes('administrator') || 
                  currentUser?.roles?.includes('manager') || 
                  currentUser?.roles?.includes('dispatcher');

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !workOrder) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load work order details</p>
          <Button variant="outline" onClick={() => setLocation('/work-orders')}>
            Back to Work Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6" data-testid="work-order-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/work-orders')}
          className="flex items-center gap-2"
          data-testid="button-back-to-work-orders"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Work Orders
        </Button>
      </div>

      {/* Work Order Header Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <CardTitle className="text-2xl" data-testid="work-order-title">
                {workOrder.title}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span data-testid="work-order-id">ID: {workOrder.id}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Created {workOrder.createdAt ? formatDistanceToNow(new Date(workOrder.createdAt), { addSuffix: true }) : 'Unknown'}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge className={getStatusColor(workOrder.status)} data-testid="work-order-status">
                {workOrder.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge className={getPriorityColor(workOrder.priority)} data-testid="work-order-priority">
                {workOrder.priority.toUpperCase()} PRIORITY
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </h4>
              <p className="text-sm text-muted-foreground" data-testid="work-order-location">
                {workOrder.location}
              </p>
            </div>
            
            {workOrder.scheduledFor && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Scheduled Date
                </h4>
                <p className="text-sm text-muted-foreground" data-testid="work-order-scheduled-date">
                  {new Date(workOrder.scheduledFor).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}

            {(workOrder.budgetAmount || workOrder.budgetType) && (
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Budget
                </h4>
                <p className="text-sm text-muted-foreground" data-testid="work-order-budget">
                  {formatBudget(workOrder.budgetAmount ? parseInt(workOrder.budgetAmount) : null, workOrder.budgetType)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-semibold">Assignee</h4>
              <p className="text-sm text-muted-foreground" data-testid="work-order-assignee">
                {workOrder.assignee 
                  ? `${workOrder.assignee.firstName} ${workOrder.assignee.lastName}`
                  : 'Unassigned'
                }
              </p>
            </div>
          </div>

          {/* Description */}
          {workOrder.description && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Description
                </h4>
                <p className="text-sm whitespace-pre-wrap" data-testid="work-order-description">
                  {workOrder.description}
                </p>
              </div>
            </>
          )}

          {/* Skills Required */}
          {workOrder.requiredSkills && workOrder.requiredSkills.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold">Skills Required</h4>
                <div className="flex flex-wrap gap-2" data-testid="work-order-skills">
                  {workOrder.requiredSkills.map((skill: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Client/Company Information */}
          {workOrder.company && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold">Company</h4>
                <p className="text-sm text-muted-foreground" data-testid="work-order-company">
                  {workOrder.company.name} ({workOrder.company.type})
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="messages" className="flex items-center gap-2" data-testid="tab-messages">
            <MessageSquare className="w-4 h-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2" data-testid="tab-tasks">
            <CheckSquare className="w-4 h-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-2" data-testid="tab-details">
            <FileText className="w-4 h-4" />
            Additional Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="mt-6">
          <JobMessagesTab
            workOrderId={workOrder.id}
            currentUserId={currentUser?.id}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <WorkOrderTasks workOrderId={workOrder?.id || ''} userRole={currentUser?.roles?.[0] || 'field_agent'} />
        </TabsContent>

        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Created By</h4>
                  <p className="text-sm text-muted-foreground">
                    {workOrder.creator 
                      ? `${workOrder.creator.firstName} ${workOrder.creator.lastName}`
                      : 'Unknown'
                    }
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">Created Date</h4>
                  <p className="text-sm text-muted-foreground">
                    {workOrder.createdAt ? new Date(workOrder.createdAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) : 'Unknown'}
                  </p>
                </div>

                {workOrder.updatedAt && workOrder.updatedAt !== workOrder.createdAt && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Last Updated</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(workOrder.updatedAt).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-semibold">Work Order Type</h4>
                  <p className="text-sm text-muted-foreground">
                    {workOrder.requiredSkills && workOrder.requiredSkills.length > 0 
                      ? 'Skilled Work Order' 
                      : 'General Work Order'
                    }
                  </p>
                </div>
              </div>

              {/* Additional metadata or custom fields can be added here */}
              <Separator />
              
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-muted-foreground" />
                  <h4 className="font-semibold">Work Order Notes</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use the Messages tab above for real-time communication with team members involved in this work order.
                  Task progress and completion can be tracked in the Tasks tab.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}