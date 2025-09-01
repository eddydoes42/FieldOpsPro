import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, Home, UserPlus, User, X } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatPhoneNumber } from "@/lib/phone-formatter";

interface CompanyFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  adminId?: string;
}

interface AdminFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface CompanyOnboardingFormProps {
  onClose: () => void;
  preFilledUserId?: string;
  companyType?: 'service' | 'client';
}

export default function CompanyOnboardingForm({ onClose, preFilledUserId, companyType = 'service' }: CompanyOnboardingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<CompanyFormData>({
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    website: "",
    description: "",
    adminId: preFilledUserId || undefined
  });

  const [assignedAdmin, setAssignedAdmin] = useState<{ id: string; firstName: string; lastName: string; email: string } | null>(null);
  const [adminFormData, setAdminFormData] = useState<AdminFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);

  // Fetch user data if preFilledUserId is provided
  const { data: preFilledUser } = useQuery<any>({
    queryKey: ['/api/users'],
    enabled: !!preFilledUserId,
    select: (users: any[]) => users.find(user => user.id === preFilledUserId)
  });

  // Set assignedAdmin when preFilledUser is loaded
  useEffect(() => {
    if (preFilledUser && preFilledUserId) {
      setAssignedAdmin({
        id: preFilledUser.id,
        firstName: preFilledUser.firstName,
        lastName: preFilledUser.lastName,
        email: preFilledUser.email
      });
    }
  }, [preFilledUser, preFilledUserId]);

  // Mutation to update user's company assignment
  const updateUserCompanyMutation = useMutation({
    mutationFn: async ({ userId, companyId }: { userId: string; companyId: string }) => {
      const response = await apiRequest(`/api/users/${userId}`, 'PATCH', { 
        companyId,
        roles: ['administrator'] // Ensure the user is assigned as administrator
      });
      return await response.json();
    },
    onError: () => {
      toast({
        title: "Warning",
        description: "Company created but user assignment failed. Please assign manually.",
        variant: "destructive",
      });
    },
  });

  const companyMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const submitData = {
        ...data,
        type: companyType // Add company type to the request
      };
      const response = await apiRequest('/api/companies', 'POST', submitData);
      return await response.json();
    },
    onSuccess: async (createdCompany) => {
      // If we have a preFilledUserId, assign them to the new company as administrator
      if (preFilledUserId) {
        await updateUserCompanyMutation.mutateAsync({ 
          userId: preFilledUserId, 
          companyId: createdCompany.id 
        });
      }
      
      toast({
        title: "Success",
        description: "Company has been successfully onboarded!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/stats'] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to onboard company. Please try again.",
        variant: "destructive",
      });
    },
  });

  const adminMutation = useMutation({
    mutationFn: async (data: AdminFormData) => {
      const adminData = {
        ...data,
        roles: ['administrator'],
        isActive: true
      };
      const response = await apiRequest('/api/users/onboard', 'POST', adminData);
      return await response.json();
    },
    onSuccess: (createdAdmin) => {
      setAssignedAdmin({
        id: createdAdmin.id,
        firstName: createdAdmin.firstName,
        lastName: createdAdmin.lastName,
        email: createdAdmin.email
      });
      setFormData(prev => ({ ...prev, adminId: createdAdmin.id }));
      setIsAdminDialogOpen(false);
      setAdminFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: ""
      });
      toast({
        title: "Success",
        description: "Administrator created successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create administrator. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof CompanyFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAdminInputChange = (field: keyof AdminFormData, value: string) => {
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
    setFormData(prev => ({ ...prev, adminId: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Company name is required.",
        variant: "destructive",
      });
      return;
    }

    companyMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6 gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <Home className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Building2 className="h-6 w-6 mr-3 text-blue-600 dark:text-blue-400" />
              Onboard New {companyType === 'service' ? 'IT Service Company' : 'Client Company'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Company Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Enter company name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Company Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="contact@company.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        handleInputChange('phone', formatted);
                      }}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://company.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Street address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="State"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      placeholder="ZIP Code"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Brief description of the company and services"
                    rows={3}
                  />
                </div>

                {/* Admin Assignment Section */}
                <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Admin Assignment
                  </h3>
                  
                  <div className="space-y-2">
                    <Label>Assign Admin</Label>
                    <div className="flex items-center space-x-3">
                      {assignedAdmin ? (
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex-1">
                          <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                            <User className="h-4 w-4 text-purple-600 dark:text-purple-300" />
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
                          <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto scrollbar-minimal">
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
                                      <i className="fas fa-spinner fa-spin mr-2"></i>
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

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={onClose}
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={companyMutation.isPending}
                  className="min-w-[120px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {companyMutation.isPending ? (
                    <div className="flex items-center">
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Creating...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Building2 className="h-4 w-4 mr-2" />
                      Create Company
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}