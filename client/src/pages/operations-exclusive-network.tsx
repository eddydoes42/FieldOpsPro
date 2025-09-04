import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Building2, Calendar, Users, Star, TrendingUp, Home } from "lucide-react";
import { Link } from "wouter";
import Navigation from "@/components/navigation";
import RoleSwitcher from "@/components/role-switcher";

interface ExclusiveNetworkMember {
  id: string;
  clientCompany: {
    id: string;
    name: string;
    type: string;
  };
  serviceCompany: {
    id: string;
    name: string;
    type: string;
  };
  completedWorkOrders: number;
  averageRating: string;
  qualifiesForExclusive: boolean;
  isActive: boolean;
  addedAt: string;
  lastWorkOrderAt?: string;
}

interface ExclusiveNetworkPost {
  id: string;
  title: string;
  description: string;
  location?: string;
  budget?: string;
  budgetType?: string;
  priority: string;
  requiredSkills?: string[];
  estimatedDuration?: string;
  scheduledDate?: string;
  status: string;
  clientCompany: {
    id: string;
    name: string;
  };
  assignedToCompany?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export default function OperationsExclusiveNetwork() {
  const [selectedTab, setSelectedTab] = useState<'members' | 'posts'>('members');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('all');
  const testingRole = localStorage.getItem('testingRole') || undefined;

  // Fetch all exclusive network members
  const { data: exclusiveMembers = [], isLoading: membersLoading } = useQuery<ExclusiveNetworkMember[]>({
    queryKey: ['/api/operations/exclusive-network-members'],
  });

  // Fetch all exclusive network posts
  const { data: exclusivePosts = [], isLoading: postsLoading } = useQuery<ExclusiveNetworkPost[]>({
    queryKey: ['/api/operations/exclusive-network-posts'],
  });

  // Get unique client companies
  const clientCompanies = [...new Set(exclusiveMembers.map(member => member.clientCompany.name))];
  
  // Get unique service companies
  const serviceCompanies = [...new Set(exclusiveMembers.map(member => member.serviceCompany.name))];

  // Filter members based on selected filters
  const filteredMembers = exclusiveMembers.filter(member => {
    const clientMatch = selectedClientFilter === 'all' || member.clientCompany.name === selectedClientFilter;
    const serviceMatch = selectedServiceFilter === 'all' || member.serviceCompany.name === selectedServiceFilter;
    return clientMatch && serviceMatch;
  });

  // Stats calculations
  const totalActiveNetworks = exclusiveMembers.filter(member => member.isActive).length;
  const totalQualifiedPairs = exclusiveMembers.filter(member => member.qualifiesForExclusive).length;
  const averageRating = exclusiveMembers.length > 0 
    ? (exclusiveMembers.reduce((sum, member) => sum + parseFloat(member.averageRating), 0) / exclusiveMembers.length).toFixed(2)
    : "0.00";
  const totalWorkOrders = exclusiveMembers.reduce((sum, member) => sum + member.completedWorkOrders, 0);


  return (
    <div className="min-h-screen bg-background">
      <Navigation testingRole={testingRole} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/operations-dashboard'}
                className="flex items-center space-x-1"
              >
                <Home className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.history.back()}
                className="flex items-center space-x-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Exclusive Networks
                </h1>
                <p className="text-muted-foreground">
                  Monitor active exclusive partnerships between clients and service companies
                </p>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{totalActiveNetworks}</p>
                    <p className="text-sm text-muted-foreground">Active Networks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{totalQualifiedPairs}</p>
                    <p className="text-sm text-muted-foreground">Qualified Pairs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{averageRating}</p>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{totalWorkOrders}</p>
                    <p className="text-sm text-muted-foreground">Total Work Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-4 mb-6">
            <Button
              variant={selectedTab === 'members' ? 'default' : 'outline'}
              onClick={() => setSelectedTab('members')}
            >
              <Users className="h-4 w-4 mr-2" />
              Network Members
            </Button>
            <Button
              variant={selectedTab === 'posts' ? 'default' : 'outline'}
              onClick={() => setSelectedTab('posts')}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Exclusive Posts
            </Button>
          </div>
        </div>

        {/* Members Tab */}
        {selectedTab === 'members' && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Client Company
                </label>
                <select
                  value={selectedClientFilter}
                  onChange={(e) => setSelectedClientFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="all">All Clients</option>
                  {clientCompanies.map((company) => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Service Company
                </label>
                <select
                  value={selectedServiceFilter}
                  onChange={(e) => setSelectedServiceFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="all">All Service Companies</option>
                  {serviceCompanies.map((company) => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Members List */}
            {membersLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">Loading exclusive network members...</p>
                </CardContent>
              </Card>
            ) : filteredMembers.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">No exclusive network members found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredMembers.map((member) => (
                  <Card key={member.id} className="border border-border">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-5 w-5 text-blue-600" />
                            <span className="font-medium text-foreground">{member.clientCompany.name}</span>
                          </div>
                          <span className="text-muted-foreground">↔</span>
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-5 w-5 text-green-600" />
                            <span className="font-medium text-foreground">{member.serviceCompany.name}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <p className="text-lg font-bold text-foreground">{member.completedWorkOrders}</p>
                            <p className="text-xs text-muted-foreground">Work Orders</p>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium text-foreground">{member.averageRating}</span>
                          </div>
                          
                          <div className="flex space-x-2">
                            {member.qualifiesForExclusive && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Qualified
                              </Badge>
                            )}
                            {member.isActive ? (
                              <Badge variant="default" className="bg-blue-100 text-blue-800">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 text-sm text-muted-foreground">
                        <p>Added: {new Date(member.addedAt).toLocaleDateString()}</p>
                        {member.lastWorkOrderAt && (
                          <p>Last Work Order: {new Date(member.lastWorkOrderAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Posts Tab */}
        {selectedTab === 'posts' && (
          <div>
            {postsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">Loading exclusive network posts...</p>
                </CardContent>
              </Card>
            ) : exclusivePosts.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">No exclusive network posts found.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {exclusivePosts.map((post) => (
                  <Card key={post.id} className="border border-border">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{post.title}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={post.status === 'open' ? 'default' : post.status === 'completed' ? 'secondary' : 'outline'}
                            className={
                              post.status === 'open' ? 'bg-green-100 text-green-800' :
                              post.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              post.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {post.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          {post.priority === 'urgent' && (
                            <Badge variant="destructive">Urgent</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-muted-foreground mb-4">{post.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-foreground">Client</p>
                          <p className="text-muted-foreground">{post.clientCompany.name}</p>
                        </div>
                        
                        {post.assignedToCompany && (
                          <div>
                            <p className="font-medium text-foreground">Assigned To</p>
                            <p className="text-muted-foreground">{post.assignedToCompany.name}</p>
                          </div>
                        )}
                        
                        {post.budget && (
                          <div>
                            <p className="font-medium text-foreground">Budget</p>
                            <p className="text-muted-foreground">${post.budget} ({post.budgetType})</p>
                          </div>
                        )}
                        
                        {post.scheduledDate && (
                          <div>
                            <p className="font-medium text-foreground">Scheduled</p>
                            <p className="text-muted-foreground">{new Date(post.scheduledDate).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                      
                      {post.requiredSkills && post.requiredSkills.length > 0 && (
                        <div className="mt-4">
                          <p className="font-medium text-foreground mb-2">Required Skills</p>
                          <div className="flex flex-wrap gap-2">
                            {post.requiredSkills.map((skill, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4 text-xs text-muted-foreground">
                        Posted: {new Date(post.createdAt).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}