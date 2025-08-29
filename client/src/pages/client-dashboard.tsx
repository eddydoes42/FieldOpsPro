import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Users, 
  Briefcase, 
  MessageSquare, 
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  UserPlus,
  FileText,
  Network,
  Eye,
  BarChart3,
  Shield
} from 'lucide-react';
import { User, canManageUsers, canManageWorkOrders, isAdminTeam } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import Navigation from '@/components/navigation';

interface ClientDashboardProps {
  user: User;
}

export default function ClientDashboard({ user }: ClientDashboardProps) {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Mutation for approving and paying work orders
  const approveAndPayMutation = useMutation({
    mutationFn: async (workOrderId: string) => {
      return apiRequest(`/api/work-orders/${workOrderId}/approve-and-pay`, 'PATCH');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
    },
  });

  const handleApproveAndPay = async (workOrderId: string) => {
    try {
      await approveAndPayMutation.mutateAsync(workOrderId);
    } catch (error) {
      console.error('Failed to approve and pay work order:', error);
    }
  };

  // Query for user's company info
  const { data: company } = useQuery({
    queryKey: ['/api/companies', user.companyId],
    enabled: !!user.companyId,
  });

  // Query for company team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['/api/users/company', user.companyId],
    enabled: !!user.companyId,
  });

  // Query for company work orders
  const { data: workOrders = [] } = useQuery({
    queryKey: ['/api/work-orders/company', user.companyId],
    enabled: !!user.companyId,
  });

  // Query for messages
  const { data: messages = [] } = useQuery({
    queryKey: ['/api/messages'],
  });

  // Query for job network posts
  const { data: jobNetworkPosts = [] } = useQuery({
    queryKey: ['/api/job-network'],
  });

  // Query for exclusive network posts
  const { data: exclusiveNetworkPosts = [] } = useQuery({
    queryKey: ['/api/exclusive-network'],
  });

  const adminTeamMembers = (teamMembers as any[]).filter((member: User) => isAdminTeam(member));
  const activeWorkOrders = (workOrders as any[]).filter((wo: any) => wo.status !== 'completed' && wo.status !== 'cancelled');
  const workOrdersToApprove = (workOrders as any[]).filter((wo: any) => wo.status === 'completed' && (!wo.paymentStatus || wo.paymentStatus === 'pending_payment'));
  const recentMessages = (messages as any[]).slice(0, 5);
  
  // Filter recent work orders (< 7 days old)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentWorkOrders = (workOrders as any[]).filter((wo: any) => 
    new Date(wo.createdAt || wo.scheduledDate) >= sevenDaysAgo
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Client Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {(company as any)?.name} - {(company as any)?.type === 'client' ? 'Client Company' : 'Service Company'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card 
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setLocation('/team')}
          >
            <CardContent className="p-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                    Team Members
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                    {(teamMembers as any[]).length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setLocation('/work-orders')}
          >
            <CardContent className="p-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                    Active Work Orders
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                    {activeWorkOrders.length}
                  </p>
                </div>
                <Briefcase className="h-8 w-8 text-green-600 dark:text-green-400 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setLocation('/team')}
          >
            <CardContent className="p-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                    Admin Team
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                    {adminTeamMembers.length}
                  </p>
                </div>
                <Building2 className="h-8 w-8 text-purple-600 dark:text-purple-400 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setLocation('/messages')}
          >
            <CardContent className="p-4 overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                    Unread Messages
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                    {(messages as any[]).filter((m: any) => !m.isRead).length}
                  </p>
                </div>
                <MessageSquare className="h-8 w-8 text-orange-600 dark:text-orange-400 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Things to Approve Section */}
        {workOrdersToApprove.length > 0 && (
          <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
                <Clock className="h-5 w-5" />
                <span>Things to Approve</span>
                <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">
                  {workOrdersToApprove.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workOrdersToApprove.map((workOrder: any) => (
                  <div key={workOrder.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {workOrder.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Completed by: {workOrder.assignee?.firstName} {workOrder.assignee?.lastName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Location: {workOrder.location}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleApproveAndPay(workOrder.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Approve and Pay
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex w-full h-auto justify-evenly bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <TabsTrigger value="overview" className="flex flex-col items-center gap-1 py-3 flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 rounded-md">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="work-orders" className="flex flex-col items-center gap-1 py-3 flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 rounded-md">
              <Briefcase className="h-4 w-4" />
              <span className="text-xs">Work Orders</span>
            </TabsTrigger>
            <TabsTrigger value="job-network" className="flex flex-col items-center gap-1 py-3 flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 rounded-md">
              <Network className="h-4 w-4" />
              <span className="text-xs">Job Network</span>
            </TabsTrigger>
            <TabsTrigger value="exclusive-network" className="flex flex-col items-center gap-1 py-3 flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 rounded-md">
              <Shield className="h-4 w-4" />
              <span className="text-xs">Exclusive</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Work Orders */}
              <Card 
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation('/job-network?filter=recent')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Briefcase className="h-5 w-5" />
                    <span>Recent Work Orders</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentWorkOrders.length > 0 ? (
                    <div className="space-y-3">
                      {recentWorkOrders.slice(0, 5).map((workOrder: any) => (
                        <div key={workOrder.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {workOrder.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {workOrder.location}
                            </p>
                          </div>
                          <Badge variant={workOrder.status === 'in_progress' ? 'default' : 'secondary'}>
                            {workOrder.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                      No recent work orders (last 7 days)
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Messages */}
              <Card 
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation('/messages')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5" />
                    <span>Recent Messages</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentMessages.length > 0 ? (
                    <div className="space-y-3">
                      {recentMessages.map((message: any) => (
                        <div key={message.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {message.subject}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {message.content}
                            </p>
                          </div>
                          {!message.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                      No recent messages
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Work Orders Tab */}
          <TabsContent value="work-orders" className="space-y-6">
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Work Orders</CardTitle>
                  {canManageWorkOrders(user) && (
                    <Button onClick={() => setLocation('/work-orders')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Work Order
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {(workOrders as any[]).length > 0 ? (
                  <div className="space-y-4">
                    {(workOrders as any[]).map((workOrder: any) => (
                      <div 
                        key={workOrder.id} 
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setLocation('/work-orders')}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {workOrder.title}
                          </h3>
                          <Badge variant={workOrder.status === 'completed' ? 'default' : 'secondary'}>
                            {workOrder.status}
                          </Badge>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          {workOrder.description}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {workOrder.location}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(workOrder.scheduledDate).toLocaleDateString()}
                          </div>
                          {workOrder.budget && (
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1" />
                              ${workOrder.budget}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                    No work orders found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Job Network Tab */}
          <TabsContent value="job-network" className="space-y-6">
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <Network className="h-5 w-5" />
                    <span>Job Network - Public Postings</span>
                  </CardTitle>
                  <Button onClick={() => setLocation('/job-network')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Post Job
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Post work orders publicly for all Service Company Admin Teams to view and bid on.
                </p>
                {(jobNetworkPosts as any[]).length > 0 ? (
                  <div className="space-y-4">
                    {(jobNetworkPosts as any[]).map((post: any) => (
                      <div 
                        key={post.id} 
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setLocation('/job-network')}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {post.title}
                          </h3>
                          <Badge variant={post.status === 'open' ? 'default' : 'secondary'}>
                            {post.status}
                          </Badge>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          {post.description}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {post.location}
                          </div>
                          {post.budget && (
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1" />
                              ${post.budget}
                            </div>
                          )}
                          <div className="flex items-center">
                            <Eye className="h-4 w-4 mr-1" />
                            Public
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                    No job postings found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Exclusive Network Tab */}
          <TabsContent value="exclusive-network" className="space-y-6">
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <Network className="h-5 w-5" />
                    <span>Exclusive Network - Private Postings</span>
                  </CardTitle>
                  <Button onClick={() => setLocation('/exclusive-network')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Post Exclusive Job
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Post work orders privately for Admin Teams only. Higher security and confidentiality.
                </p>
                {(exclusiveNetworkPosts as any[]).length > 0 ? (
                  <div className="space-y-4">
                    {(exclusiveNetworkPosts as any[]).map((post: any) => (
                      <div 
                        key={post.id} 
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setLocation('/exclusive-network')}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {post.title}
                          </h3>
                          <Badge variant="outline" className="border-purple-200 text-purple-700 dark:border-purple-700 dark:text-purple-300">
                            {post.status}
                          </Badge>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          {post.description}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {post.location}
                          </div>
                          {post.budget && (
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1" />
                              ${post.budget}
                            </div>
                          )}
                          <div className="flex items-center text-purple-600 dark:text-purple-400">
                            <Network className="h-4 w-4 mr-1" />
                            Exclusive
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 text-center py-8">
                    No exclusive postings found
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>
      </div>
    </div>
  );
}