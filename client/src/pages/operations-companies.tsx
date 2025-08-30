import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, ArrowLeft, Plus, Search, Filter, Users, CheckCircle, TrendingUp, X, Mail, Phone, Globe, MapPin, Edit, Trash2, UserMinus, Clipboard, Home, UserPlus, User as UserIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import { formatPhoneNumber } from "@/lib/phone-formatter";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { Company, User } from "../../../shared/schema";

export default function OperationsCompanies() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [companyTypeFilter, setCompanyTypeFilter] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Partial<Company>>({});
  const [showSuccessRatePopup, setShowSuccessRatePopup] = useState(false);
  const [showRecentAssignedPopup, setShowRecentAssignedPopup] = useState(false);
  
  // Admin assignment state
  const [assignedAdmin, setAssignedAdmin] = useState<{ id: string; firstName: string; lastName: string; email: string } | null>(null);
  const [adminFormData, setAdminFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  
  const queryClient = useQueryClient();

  // Check URL parameters for initial status filter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('status');
    
    if (statusParam && ['active', 'inactive'].includes(statusParam)) {
      setStatusFilter(statusParam);
    }
  }, []);

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  // Check if user is operations director or administrator
  // Override role check when on operations pages (user is always Operations Director when on /operations/* pages)
  const isOnOperationsPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/operations');
  const isOperationsDirector = isOnOperationsPage || user?.roles?.includes('operations_director') || false;
  const isAdministrator = user?.roles?.includes('administrator') || false;

  // API mutations
  const updateCompanyMutation = useMutation({
    mutationFn: async (updates: { id: string; data: Partial<Company> }) => {
      const response = await fetch(`/api/companies/${updates.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates.data),
      });
      if (!response.ok) throw new Error('Failed to update company');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      toast({ title: "Company updated successfully" });
      setShowEditDialog(false);
      setSelectedCompany(null);
    },
    onError: (error: any) => {
      console.error("Update company error:", error);
      toast({ title: "Failed to update company", variant: "destructive" });
    }
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (companyData: Partial<Company>) => {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData),
      });
      if (!response.ok) throw new Error('Failed to create company');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      toast({ title: "Company created successfully" });
      setShowCreateDialog(false);
      setEditingCompany({});
      // Reset admin assignment state
      setAssignedAdmin(null);
      setAdminFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: ""
      });
    },
    onError: (error: any) => {
      console.error("Create company error:", error);
      toast({ title: "Failed to create company", variant: "destructive" });
    }
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete company');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      toast({ title: "Company deleted successfully" });
      setShowDeleteConfirm(false);
      setSelectedCompany(null);
    },
    onError: (error: any) => {
      console.error("Delete company error:", error);
      toast({ title: "Failed to delete company", variant: "destructive" });
    }
  });

  const adminMutation = useMutation({
    mutationFn: async (data: typeof adminFormData) => {
      const adminData = {
        ...data,
        roles: ['administrator'],
        isActive: true
      };
      const response = await fetch('/api/users/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminData),
      });
      if (!response.ok) throw new Error('Failed to create administrator');
      return response.json();
    },
    onSuccess: (createdAdmin) => {
      setAssignedAdmin({
        id: createdAdmin.id,
        firstName: createdAdmin.firstName,
        lastName: createdAdmin.lastName,
        email: createdAdmin.email
      });
      setEditingCompany(prev => ({ ...prev, adminId: createdAdmin.id }));
      setIsAdminDialogOpen(false);
      setAdminFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: ""
      });
      toast({ title: "Administrator created successfully!" });
    },
    onError: (error: any) => {
      console.error("Create admin error:", error);
      toast({ title: "Failed to create administrator", variant: "destructive" });
    }
  });

  // Helper functions for admin management
  const handleAdminInputChange = (field: keyof typeof adminFormData, value: string) => {
    setAdminFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminFormData.firstName.trim() || !adminFormData.lastName.trim() || !adminFormData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "First name, last name, and email are required.",
        variant: "destructive",
      });
      return;
    }

    adminMutation.mutate(adminFormData);
  };

  const handleRemoveAdmin = () => {
    setAssignedAdmin(null);
    setEditingCompany(prev => ({ ...prev, adminId: undefined }));
  };

  // Mock company details data - in a real app, this would come from API
  // Use React Query to fetch real company statistics
  const { data: companyStats } = useQuery({
    queryKey: ['company-stats', selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return null;
      const response = await fetch(`/api/companies/${selectedCompany.id}/stats`);
      if (!response.ok) throw new Error('Failed to fetch company stats');
      return response.json();
    },
    enabled: !!selectedCompany?.id
  });

  const getCompanyDetails = (companyId: string) => {
    if (companyStats) {
      return companyStats;
    }
    // Return real data defaults while loading
    return {
      onboardedUsers: 0,
      activeWorkOrders: 0,
      completedWorkOrders: 0,
      successRate: 0,
    };
  };

  const handleToggleActive = (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isOperationsDirector) {
      toast({ 
        title: "Access Denied", 
        description: "Only Operations Directors can deactivate companies",
        variant: "destructive" 
      });
      return;
    }
    
    updateCompanyMutation.mutate({
      id: company.id,
      data: { isActive: !company.isActive }
    });
  };

  const handleEditCompany = (company: Company, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCompany({
      id: company.id,
      name: company.name,
      description: company.description,
      email: company.email,
      phone: company.phone,
      website: company.website,
      address: company.address,
      city: company.city,
      state: company.state,
      zipCode: company.zipCode
    });
    setShowEditDialog(true);
  };

  const handleDeleteCompany = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isOperationsDirector) {
      toast({ 
        title: "Access Denied", 
        description: "Only Operations Directors can delete companies",
        variant: "destructive" 
      });
      return;
    }
    
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (selectedCompany) {
      deleteCompanyMutation.mutate(selectedCompany.id);
    }
  };

  // Navigation handlers for Performance Overview cards
  const handleOnboardedUsersClick = (companyId: string) => {
    // Navigate to team management page with company filter
    setLocation(`/team?company=${companyId}`);
    toast({
      title: "Navigating to Team Management",
      description: `Showing users for company: ${selectedCompany?.name || 'Selected Company'}`,
    });
  };

  const handleActiveWorkOrdersClick = (companyId: string) => {
    // Navigate to work orders page
    setLocation(`/work-orders`);
    toast({
      title: "Navigating to Work Orders",
      description: `Showing active work orders for ${selectedCompany?.name || companyId}`,
    });
  };

  const handleCompletedOrdersClick = (companyId: string) => {
    // Navigate to work orders page
    setLocation(`/work-orders`);
    toast({
      title: "Navigating to Work Orders", 
      description: `Showing completed work orders for ${selectedCompany?.name || companyId}`,
    });
  };

  const handleSuccessRateClick = () => {
    setShowSuccessRatePopup(true);
  };

  // Navigation handlers for Recent Activity cards
  const handleRecentUsersClick = (companyId: string) => {
    // Navigate to team management page
    setLocation(`/team`);
    toast({
      title: "Navigating to Team Management",
      description: `Showing recently onboarded users for ${selectedCompany?.name || companyId}`,
    });
  };

  const handleRecentCompletedClick = (companyId: string) => {
    // Navigate to work orders page
    setLocation(`/work-orders`);
    toast({
      title: "Navigating to Work Orders",
      description: `Showing last 30 days work orders for ${selectedCompany?.name || companyId}`,
    });
  };

  const handleRecentAssignedClick = () => {
    setShowRecentAssignedPopup(true);
  };

  const filteredCompanies = useMemo(() => {
    let filtered = companies;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.state?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(company =>
        statusFilter === "active" ? company.isActive : !company.isActive
      );
    }

    // Company type filter
    if (companyTypeFilter !== "all") {
      filtered = filtered.filter(company =>
        company.type === companyTypeFilter
      );
    }

    // Time filter
    if (timeFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter(company => {
        if (!company.createdAt) return false;
        const createdDate = new Date(company.createdAt);
        const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

        switch (timeFilter) {
          case "week":
            return daysDiff <= 7;
          case "month":
            return daysDiff <= 30;
          case "quarter":
            return daysDiff <= 90;
          case "year":
            return daysDiff <= 365;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [companies, searchTerm, statusFilter, companyTypeFilter, timeFilter]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/operations-dashboard')}
              className="flex items-center space-x-1"
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/operations-dashboard')}
              className="flex items-center space-x-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Service Companies
          </h1>
          <Button 
            onClick={() => {
              setEditingCompany({});
              setShowCreateDialog(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Service Company
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
                className="text-xs"
              >
                Active ({companies.filter(c => c.isActive).length})
              </Button>
              <Button
                variant={statusFilter === "inactive" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("inactive")}
                className="text-xs"
              >
                Inactive ({companies.filter(c => !c.isActive).length})
              </Button>
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="text-xs"
              >
                All Status ({companies.length})
              </Button>
            </div>

            {/* Company Type Filters */}
            <div className="flex flex-wrap gap-2 border-l border-border pl-2 ml-2">
              <Button
                variant={companyTypeFilter === "service" ? "default" : "outline"}
                size="sm"
                onClick={() => setCompanyTypeFilter("service")}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
              >
                Service Companies ({companies.filter(c => c.type === "service").length})
              </Button>
              <Button
                variant={companyTypeFilter === "client" ? "default" : "outline"}
                size="sm"
                onClick={() => setCompanyTypeFilter("client")}
                className="text-xs bg-teal-600 hover:bg-teal-700 text-white border-teal-600 hover:border-teal-700"
              >
                Client Companies ({companies.filter(c => c.type === "client").length})
              </Button>
              <Button
                variant={companyTypeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setCompanyTypeFilter("all")}
                className="text-xs"
              >
                All Types ({companies.length})
              </Button>
            </div>

            {/* Time Filter */}
            <div className="flex flex-wrap gap-2 border-l border-border pl-2 ml-2">
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by onboard time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Filter Summary */}
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Filter className="h-4 w-4 mr-2" />
            Showing {filteredCompanies.length} of {companies.length} companies
          </div>
        </div>

        {/* Companies Table */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Service Companies Directory
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCompanies.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {companies.length === 0 
                    ? "No companies onboarded yet. Start by adding your first company."
                    : "No companies match your current filters. Try adjusting your search criteria."
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Onboarded</TableHead>
                      <TableHead>Days Since</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map((company) => {
                      const createdDate = company.createdAt ? new Date(company.createdAt) : null;
                      const daysSince = createdDate 
                        ? Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
                        : null;

                      return (
                        <TableRow 
                          key={company.id} 
                          className="hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer"
                          onClick={() => setSelectedCompany(company)}
                        >
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {company.name}
                                </div>
                                {company.description && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                    {company.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span 
                              className={`px-2 py-1 rounded-full text-xs font-medium transition-opacity ${
                                isOperationsDirector ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-75'
                              } ${
                                company.isActive 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                              }`}
                              onClick={(e) => handleToggleActive(company, e)}
                              title={!isOperationsDirector ? "Only Operations Directors can change company status" : "Click to toggle company status"}
                            >
                              {company.isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {company.city && company.state 
                                ? `${company.city}, ${company.state}`
                                : company.city || company.state || '—'
                              }
                              {company.zipCode && (
                                <div className="text-gray-500 dark:text-gray-400">
                                  {company.zipCode}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {company.email && (
                                <div className="text-blue-600 dark:text-blue-400">
                                  {company.email}
                                </div>
                              )}
                              {company.phone && (
                                <div className="text-gray-600 dark:text-gray-400">
                                  {company.phone}
                                </div>
                              )}
                              {company.website && (
                                <a 
                                  href={company.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                                >
                                  Website
                                </a>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {createdDate ? createdDate.toLocaleDateString() : '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {daysSince !== null ? (
                                <span className={`${
                                  daysSince <= 7 
                                    ? 'text-green-600 dark:text-green-400' 
                                    : daysSince <= 30 
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {daysSince} days
                                </span>
                              ) : '—'}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Company Details Modal */}
        <Dialog open={!!selectedCompany} onOpenChange={() => setSelectedCompany(null)}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <span>{selectedCompany?.name}</span>
                <Badge 
                  variant={selectedCompany?.isActive ? "default" : "secondary"}
                  className={`transition-opacity ${
                    isOperationsDirector ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-75'
                  }`}
                  onClick={(e) => selectedCompany && handleToggleActive(selectedCompany, e)}
                  title={!isOperationsDirector ? "Only Operations Directors can change company status" : "Click to toggle company status"}
                >
                  {selectedCompany?.isActive ? "Active" : "Deactivated"}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            {selectedCompany && (
              <div className="space-y-2 max-h-[calc(95vh-160px)] overflow-y-auto">
                {/* Company Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" onClick={(e) => selectedCompany && handleEditCompany(selectedCompany, e)}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        Service Company Information
                        <Edit className="h-4 w-4 text-gray-400" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                      {selectedCompany.description && (
                        <div>
                          <h4 className="font-medium text-gray-700 dark:text-gray-300 text-sm">Description</h4>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">{selectedCompany.description}</p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 gap-2">
                        {selectedCompany.email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{selectedCompany.email}</span>
                          </div>
                        )}
                        {selectedCompany.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{selectedCompany.phone}</span>
                          </div>
                        )}
                        {selectedCompany.website && (
                          <div className="flex items-center space-x-2">
                            <Globe className="h-4 w-4 text-gray-500" />
                            <a 
                              href={selectedCompany.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              {selectedCompany.website}
                            </a>
                          </div>
                        )}
                        {(selectedCompany.city || selectedCompany.state) && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">
                              {selectedCompany.address && `${selectedCompany.address}, `}
                              {selectedCompany.city && selectedCompany.state 
                                ? `${selectedCompany.city}, ${selectedCompany.state}`
                                : selectedCompany.city || selectedCompany.state
                              }
                              {selectedCompany.zipCode && ` ${selectedCompany.zipCode}`}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="pt-1 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Onboarded: {selectedCompany.createdAt ? new Date(selectedCompany.createdAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Statistics Overview */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Performance Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-2">
                        {(() => {
                          const details = getCompanyDetails(selectedCompany.id);
                          return (
                            <>
                              <div 
                                className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                onClick={() => handleOnboardedUsersClick(selectedCompany.id)}
                              >
                                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                                <div className="text-lg font-bold text-gray-900 dark:text-white">{details.onboardedUsers}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Onboarded Users</div>
                              </div>
                              
                              <div 
                                className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                                onClick={() => handleActiveWorkOrdersClick(selectedCompany.id)}
                              >
                                <Clipboard className="h-5 w-5 text-orange-600 dark:text-orange-400 mx-auto mb-1" />
                                <div className="text-lg font-bold text-gray-900 dark:text-white">{details.activeWorkOrders}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Active Work Orders</div>
                              </div>
                              
                              <div 
                                className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                onClick={() => handleCompletedOrdersClick(selectedCompany.id)}
                              >
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto mb-1" />
                                <div className="text-lg font-bold text-gray-900 dark:text-white">{details.completedWorkOrders}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Completed Orders</div>
                              </div>
                              
                              <div 
                                className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                                onClick={handleSuccessRateClick}
                              >
                                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                                <div className="text-lg font-bold text-gray-900 dark:text-white">{details.successRate}%</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Success Rate</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-3 gap-3">
                      {(() => {
                        const details = getCompanyDetails(selectedCompany.id);
                        return (
                          <>
                            <div 
                              className="flex items-center justify-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              onClick={() => handleRecentUsersClick(selectedCompany.id)}
                            >
                              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <div className="text-center">
                                <div className="text-base font-bold text-gray-900 dark:text-white">0</div>
                              </div>
                            </div>
                            
                            <div 
                              className="flex items-center justify-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              onClick={() => handleRecentCompletedClick(selectedCompany.id)}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <div className="text-center">
                                <div className="text-base font-bold text-gray-900 dark:text-white">0</div>
                              </div>
                            </div>
                            
                            <div 
                              className="flex items-center justify-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              onClick={handleRecentAssignedClick}
                            >
                              <Clipboard className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                              <div className="text-center">
                                <div className="text-base font-bold text-gray-900 dark:text-white">0</div>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end items-center space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                  {isOperationsDirector && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleDeleteCompany}
                      className="flex items-center space-x-2"
                      data-testid="button-delete-company"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Company</span>
                    </Button>
                  )}
                  
                  <Button variant="outline" size="sm" onClick={() => setSelectedCompany(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Company Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="pb-3">
              <DialogTitle>Edit Service Company Information</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company-name" className="text-sm">Service Company Name</Label>
                <Input
                  id="company-name"
                  value={editingCompany.name || ''}
                  onChange={(e) => setEditingCompany(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter company name"
                  className="h-9"
                />
              </div>
              
              <div>
                <Label htmlFor="company-email" className="text-sm">Email</Label>
                <Input
                  id="company-email"
                  type="email"
                  value={editingCompany.email || ''}
                  onChange={(e) => setEditingCompany(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="company@example.com"
                  className="h-9"
                />
              </div>
              
              <div>
                <Label htmlFor="company-phone" className="text-sm">Phone</Label>
                <Input
                  id="company-phone"
                  type="tel"
                  value={editingCompany.phone || ''}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setEditingCompany(prev => ({ ...prev, phone: formatted }));
                  }}
                  placeholder="(555) 123-4567"
                  className="h-9"
                />
              </div>
              
              <div>
                <Label htmlFor="company-website" className="text-sm">Website</Label>
                <Input
                  id="company-website"
                  value={editingCompany.website || ''}
                  onChange={(e) => setEditingCompany(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://company.com"
                  className="h-9"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="company-description" className="text-sm">Description</Label>
                <Textarea
                  id="company-description"
                  value={editingCompany.description || ''}
                  onChange={(e) => setEditingCompany(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter company description"
                  rows={2}
                  className="resize-none"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="company-address" className="text-sm">Address</Label>
                <Input
                  id="company-address"
                  value={editingCompany.address || ''}
                  onChange={(e) => setEditingCompany(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main Street"
                  className="h-9"
                />
              </div>
              
              <div>
                <Label htmlFor="company-city" className="text-sm">City</Label>
                <Input
                  id="company-city"
                  value={editingCompany.city || ''}
                  onChange={(e) => setEditingCompany(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  className="h-9"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="company-state" className="text-sm">State</Label>
                  <Input
                    id="company-state"
                    value={editingCompany.state || ''}
                    onChange={(e) => setEditingCompany(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="State"
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label htmlFor="company-zip" className="text-sm">ZIP Code</Label>
                  <Input
                    id="company-zip"
                    value={editingCompany.zipCode || ''}
                    onChange={(e) => setEditingCompany(prev => ({ ...prev, zipCode: e.target.value }))}
                    placeholder="12345"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="h-9">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (editingCompany.id) {
                    updateCompanyMutation.mutate({
                      id: editingCompany.id,
                      data: editingCompany
                    });
                  }
                }}
                disabled={updateCompanyMutation.isPending}
                className="h-9"
              >
                {updateCompanyMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Company Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="pb-3">
              <DialogTitle>Add New Service Company</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-company-name" className="text-sm">Service Company Name *</Label>
                <Input
                  id="new-company-name"
                  value={editingCompany.name || ''}
                  onChange={(e) => setEditingCompany(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter company name"
                  className="h-9"
                />
              </div>
              
              <div>
                <Label htmlFor="new-company-email" className="text-sm">Email</Label>
                <Input
                  id="new-company-email"
                  type="email"
                  value={editingCompany.email || ''}
                  onChange={(e) => setEditingCompany(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="company@example.com"
                  className="h-9"
                />
              </div>
              
              <div>
                <Label htmlFor="new-company-phone" className="text-sm">Phone</Label>
                <Input
                  id="new-company-phone"
                  type="tel"
                  value={editingCompany.phone || ''}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setEditingCompany(prev => ({ ...prev, phone: formatted }));
                  }}
                  placeholder="(555) 123-4567"
                  className="h-9"
                />
              </div>
              
              <div>
                <Label htmlFor="new-company-website" className="text-sm">Website</Label>
                <Input
                  id="new-company-website"
                  value={editingCompany.website || ''}
                  onChange={(e) => setEditingCompany(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://company.com"
                  className="h-9"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="new-company-description" className="text-sm">Description</Label>
                <Textarea
                  id="new-company-description"
                  value={editingCompany.description || ''}
                  onChange={(e) => setEditingCompany(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter company description"
                  rows={2}
                  className="resize-none"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="new-company-address" className="text-sm">Address</Label>
                <Input
                  id="new-company-address"
                  value={editingCompany.address || ''}
                  onChange={(e) => setEditingCompany(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main Street"
                  className="h-9"
                />
              </div>
              
              <div>
                <Label htmlFor="new-company-city" className="text-sm">City</Label>
                <Input
                  id="new-company-city"
                  value={editingCompany.city || ''}
                  onChange={(e) => setEditingCompany(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  className="h-9"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="new-company-state" className="text-sm">State</Label>
                  <Input
                    id="new-company-state"
                    value={editingCompany.state || ''}
                    onChange={(e) => setEditingCompany(prev => ({ ...prev, state: e.target.value }))}
                    placeholder="State"
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label htmlFor="new-company-zip" className="text-sm">ZIP Code</Label>
                  <Input
                    id="new-company-zip"
                    value={editingCompany.zipCode || ''}
                    onChange={(e) => setEditingCompany(prev => ({ ...prev, zipCode: e.target.value }))}
                    placeholder="12345"
                    className="h-9"
                  />
                </div>
              </div>

              {/* Admin Assignment Section */}
              <div className="md:col-span-2 space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Admin Assignment
                </h3>
                
                <div className="space-y-2">
                  <Label>Assign Admin</Label>
                  <div className="flex items-center space-x-3">
                    {assignedAdmin ? (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex-1">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                          <UserIcon className="h-4 w-4 text-purple-600 dark:text-purple-300" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {assignedAdmin.firstName} {assignedAdmin.lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {assignedAdmin.email}
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                          Administrator
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveAdmin}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="flex items-center space-x-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <UserPlus className="h-4 w-4" />
                            <span>Assign Admin</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Create New Administrator</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleCreateAdmin} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="adminFirstName">First Name *</Label>
                                <Input
                                  id="adminFirstName"
                                  type="text"
                                  value={adminFormData.firstName}
                                  onChange={(e) => handleAdminInputChange('firstName', e.target.value)}
                                  placeholder="First name"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="adminLastName">Last Name *</Label>
                                <Input
                                  id="adminLastName"
                                  type="text"
                                  value={adminFormData.lastName}
                                  onChange={(e) => handleAdminInputChange('lastName', e.target.value)}
                                  placeholder="Last name"
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="adminEmail">Email *</Label>
                              <Input
                                id="adminEmail"
                                type="email"
                                value={adminFormData.email}
                                onChange={(e) => handleAdminInputChange('email', e.target.value)}
                                placeholder="admin@company.com"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="adminPhone">Phone</Label>
                              <Input
                                id="adminPhone"
                                type="tel"
                                value={adminFormData.phone}
                                onChange={(e) => {
                                  const formatted = formatPhoneNumber(e.target.value);
                                  handleAdminInputChange('phone', formatted);
                                }}
                                placeholder="(555) 123-4567"
                              />
                            </div>
                            <div className="flex justify-end space-x-2 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAdminDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={adminMutation.isPending}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                {adminMutation.isPending ? (
                                  <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Creating...
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Create
                                  </div>
                                )}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setShowCreateDialog(false);
                setAssignedAdmin(null);
                setAdminFormData({
                  firstName: "",
                  lastName: "",
                  email: "",
                  phone: ""
                });
              }} className="h-9">
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (editingCompany.name) {
                    createCompanyMutation.mutate(editingCompany);
                  }
                }}
                disabled={createCompanyMutation.isPending || !editingCompany.name}
                className="h-9"
              >
                {createCompanyMutation.isPending ? 'Creating...' : 'Create Company'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Service Company Deletion</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to delete <strong>{selectedCompany?.name}</strong>? 
                This action cannot be undone and will permanently remove:
              </p>
              
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>All company information and settings</li>
                <li>All associated work orders</li>
                <li>All user accounts linked to this company</li>
                <li>All historical data and reports</li>
              </ul>
              
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="font-medium text-red-800 dark:text-red-200">
                    This action is permanent and cannot be reversed
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-6">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteCompanyMutation.isPending}
              >
                {deleteCompanyMutation.isPending ? 'Deleting...' : 'Delete Company'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Success Rate Popup */}
        <Dialog open={showSuccessRatePopup} onOpenChange={setShowSuccessRatePopup}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Success Rate Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {selectedCompany ? getCompanyDetails(selectedCompany.id).completedWorkOrders : 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Completed Successfully</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {selectedCompany ? Math.floor(getCompanyDetails(selectedCompany.id).completedWorkOrders * 0.2) : 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Failed/Cancelled</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Contributing Factors:</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Response time: Average 2.3 hours</li>
                  <li>• First-time fix rate: 85%</li>
                  <li>• Customer satisfaction: 4.7/5.0</li>
                  <li>• Issue escalation rate: 12%</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Recent Assigned Work Orders Popup */}
        <Dialog open={showRecentAssignedPopup} onOpenChange={setShowRecentAssignedPopup}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Recently Assigned Work Orders</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">WO-{item.toString().padStart(3, '0')}: Network Equipment Installation</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Assigned to: Field Agent {item}</p>
                      <p className="text-xs text-gray-500">Due: {new Date(Date.now() + item * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="secondary">Scheduled</Badge>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}