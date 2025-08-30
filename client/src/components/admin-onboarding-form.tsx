import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, UserPlus, Home } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Company } from "../../../shared/schema";

interface AdminFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyId: string;
  username: string;
  password: string;
  confirmPassword: string;
}

interface AdminOnboardingFormProps {
  onClose: () => void;
}

export default function AdminOnboardingForm({ onClose }: AdminOnboardingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<AdminFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyId: "",
    username: "",
    password: "",
    confirmPassword: ""
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const adminMutation = useMutation({
    mutationFn: async (data: AdminFormData) => {
      const { confirmPassword, ...adminData } = data;
      const payload = {
        ...adminData,
        roles: ['administrator'],
        temporaryPassword: false
      };
      const response = await apiRequest('/api/users/onboard-admin', 'POST', payload);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Administrator has been successfully onboarded!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/stats'] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to onboard administrator. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof AdminFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast({
        title: "Validation Error",
        description: "First name and last name are required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.email.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.companyId) {
      toast({
        title: "Validation Error",
        description: "Please select a company.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.username.trim()) {
      toast({
        title: "Validation Error",
        description: "Username is required.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    adminMutation.mutate(formData);
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
              <UserPlus className="h-6 w-6 mr-3 text-green-600 dark:text-green-400" />
              Onboard Company Administrator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="form-minimal">
              {/* Personal Information */}
              <div className="form-section-minimal">
                <h3 className="form-label-minimal text-lg mb-2">
                  Administrator Information
                </h3>
                
                <div className="form-grid-minimal grid-cols-1 md:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName" className="form-label-minimal">First Name *</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Enter first name"
                      className="form-input-minimal"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="form-label-minimal">Last Name *</Label>
                    <Input
                      id="lastName"
                      type="text"
                      className="form-input-minimal"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-minimal grid-cols-1 md:grid-cols-2">
                  <div>
                    <Label htmlFor="email" className="form-label-minimal">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      className="form-input-minimal"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="admin@company.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="form-label-minimal">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      className="form-input-minimal"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="companyId" className="form-label-minimal">Company *</Label>
                  <Select onValueChange={(value) => handleInputChange('companyId', value)}>
                    <SelectTrigger className="form-select-minimal">
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Login Credentials */}
              <div className="form-section-minimal">
                <h3 className="form-label-minimal text-lg mb-2">
                  Login Credentials
                </h3>
                
                <div className="form-grid-minimal grid-cols-1 md:grid-cols-2">
                  <div>
                    <Label htmlFor="username" className="form-label-minimal">Username *</Label>
                    <Input
                      id="username"
                      type="text"
                      className="form-input-minimal"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      placeholder="Enter unique username"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password" className="form-label-minimal">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      className="form-input-minimal"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Enter password (min 8 characters)"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="form-label-minimal">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    className="form-input-minimal"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="Confirm password"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={onClose}
                  className="form-button-secondary-minimal"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={adminMutation.isPending}
                  className="form-button-primary-minimal min-w-[140px]"
                >
                  {adminMutation.isPending ? (
                    <div className="flex items-center">
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Creating...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Administrator
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