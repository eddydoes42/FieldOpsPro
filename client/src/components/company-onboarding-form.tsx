import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Home, UserPlus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
}

interface AdminFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  // Note: Username and password are left blank for manual entry by operations director
}

interface CompanyOnboardingFormProps {
  onClose: () => void;
}

export default function CompanyOnboardingForm({ onClose }: CompanyOnboardingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1); // 1 = Company Info, 2 = Admin Info
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CompanyFormData>({
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    website: "",
    description: ""
  });

  const [adminData, setAdminData] = useState<AdminFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });

  const companyMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const response = await apiRequest('POST', '/api/companies', data);
      return await response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Success",
        description: "Company has been successfully created! Now create the admin account.",
      });
      setCreatedCompanyId(result.id);
      setStep(2); // Move to admin creation step
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/stats'] });
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
      const payload = {
        ...data,
        companyId: createdCompanyId,
        roles: ['administrator'],
        // Leave username and password blank for manual entry
        username: "",
        password: "",
        temporaryPassword: false
      };
      const response = await apiRequest('POST', '/api/users/onboard-admin', payload);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Company and administrator have been successfully onboarded! You can now manually set login credentials for the admin.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/stats'] });
      onClose();
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
    setAdminData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      // Company creation validation
      if (!formData.name.trim()) {
        toast({
          title: "Validation Error",
          description: "Company name is required.",
          variant: "destructive",
        });
        return;
      }
      companyMutation.mutate(formData);
    } else if (step === 2) {
      // Admin creation validation
      if (!adminData.firstName.trim() || !adminData.lastName.trim()) {
        toast({
          title: "Validation Error",
          description: "First name and last name are required.",
          variant: "destructive",
        });
        return;
      }
      if (!adminData.email.trim()) {
        toast({
          title: "Validation Error",
          description: "Email is required.",
          variant: "destructive",
        });
        return;
      }
      adminMutation.mutate(adminData);
    }
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
              {step === 1 ? 'Onboard New IT Service Company' : 'Create Administrator Account'}
            </CardTitle>
            <div className="flex items-center mt-4">
              <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  1
                </div>
                <span className="ml-2 font-medium">Company Info</span>
              </div>
              <div className={`w-16 h-0.5 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  2
                </div>
                <span className="ml-2 font-medium">Admin Account</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 ? (
                // Company Information Step
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
                      onChange={(e) => handleInputChange('phone', e.target.value)}
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
                </div>
              ) : (
                // Administrator Information Step
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Administrator Information
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Create the administrator account for this company. Login credentials will be set manually by operations director.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={adminData.firstName}
                        onChange={(e) => handleAdminInputChange('firstName', e.target.value)}
                        placeholder="Enter first name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={adminData.lastName}
                        onChange={(e) => handleAdminInputChange('lastName', e.target.value)}
                        placeholder="Enter last name"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="adminEmail">Email Address *</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        value={adminData.email}
                        onChange={(e) => handleAdminInputChange('email', e.target.value)}
                        placeholder="admin@company.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminPhone">Phone Number</Label>
                      <Input
                        id="adminPhone"
                        type="tel"
                        value={adminData.phone}
                        onChange={(e) => handleAdminInputChange('phone', e.target.value)}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Note:</strong> Username and password will be left blank for manual entry by the operations director after account creation.
                    </p>
                  </div>
                </div>
              )}

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
                  disabled={companyMutation.isPending || adminMutation.isPending}
                  className="min-w-[120px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {(companyMutation.isPending || adminMutation.isPending) ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      {step === 1 ? 'Creating...' : 'Creating Admin...'}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      {step === 1 ? (
                        <>
                          <Building2 className="h-4 w-4 mr-2" />
                          Create Company
                        </>
                      ) : (
                        <>
                          <Building2 className="h-4 w-4 mr-2" />
                          Create Administrator
                        </>
                      )}
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