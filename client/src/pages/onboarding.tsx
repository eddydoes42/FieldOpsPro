import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { isAdmin } from "../../../shared/schema";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import { formatPhoneNumber } from "@/lib/phone-formatter";

import { useLocation } from "wouter";
import { ArrowLeft, Home } from "lucide-react";

interface OnboardingFormData {
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  department: string;
  phone: string;
  emergencyContact: string;
  emergencyPhone: string;
  skills: string;
  certifications: string;
  notes: string;
  // Manual login credentials
  username: string;
  password: string;
  confirmPassword: string;
  temporaryPassword: boolean;
  // Client-specific fields
  clientCompanyName: string;
  clientRole: string;
}

export default function Onboarding() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [preselectedCompanyId, setPreselectedCompanyId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<OnboardingFormData>({
    firstName: "",
    lastName: "",
    email: "",
    roles: ["field_agent"],
    department: "",
    phone: "",
    emergencyContact: "",
    emergencyPhone: "",
    skills: "",
    certifications: "",
    notes: "",
    // Manual login credentials
    username: "",
    password: "",
    confirmPassword: "",
    temporaryPassword: true,
    // Client-specific fields
    clientCompanyName: "",
    clientRole: ""
  });

  // Check for company parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const companyParam = urlParams.get('company');
    if (companyParam) {
      setPreselectedCompanyId(companyParam);
    }
  }, []);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const onboardingMutation = useMutation({
    mutationFn: async (data: OnboardingFormData) => {
      // Add company association if preselected
      const submitData = preselectedCompanyId 
        ? { ...data, companyId: preselectedCompanyId }
        : data;
      
      const response = await apiRequest('/api/users/onboard', 'POST', submitData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "New team member has been successfully onboarded!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users/role/field_agent'] });
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        roles: ["field_agent"],
        department: "",
        phone: "",
        emergencyContact: "",
        emergencyPhone: "",
        skills: "",
        certifications: "",
        notes: "",
        username: "",
        password: "",
        confirmPassword: "",
        temporaryPassword: true,
        clientCompanyName: "",
        clientRole: ""
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to onboard new team member. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 p-6">
        <Navigation />
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Phone number formatting function
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (phoneNumber.length === 0) return '';
    if (phoneNumber.length <= 3) return phoneNumber;
    if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handleInputChange = (field: keyof OnboardingFormData, value: string | boolean) => {
    // Handle phone number formatting
    if ((field === 'phone' || field === 'emergencyPhone') && typeof value === 'string') {
      value = formatPhoneNumber(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: field === 'temporaryPassword' ? value : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name and Email).",
        variant: "destructive",
      });
      return;
    }

    // Credential validation
    if (formData.username && formData.password) {
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Validation Error",
          description: "Password and confirm password do not match.",
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
    }

    onboardingMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navigation />
      <div className="max-w-4xl mx-auto p-6">
        {/* Navigation Buttons */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const selectedRole = localStorage.getItem('selectedRole');
                if (selectedRole === 'operations_director' || (user as any).roles?.includes('operations_director')) {
                  setLocation('/operations-dashboard');
                } else if ((user as any).roles?.includes('administrator')) {
                  setLocation('/admin-dashboard');
                } else {
                  setLocation('/dashboard');
                }
              }}
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                // Navigate back to team page with company context if available
                if (preselectedCompanyId) {
                  setLocation(`/team?company=${preselectedCompanyId}`);
                } else {
                  setLocation('/team');
                }
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Team Member Onboarding</h1>
          {preselectedCompanyId && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-700 dark:text-blue-300">
                <i className="fas fa-info-circle mr-2"></i>
                This user will be added to the selected company's team database.
              </p>
            </div>
          )}
        </div>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 dark:text-white">
              <i className="fas fa-user-plus mr-2 text-blue-600 dark:text-blue-400"></i>
              New Team Member Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>
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
              </div>

              {/* Roles and Department */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="roles">Roles *</Label>
                  <div className="space-y-2 border rounded-md p-3">
                    {[
                      { value: 'field_agent', label: 'Field Agent' },
                      { value: 'field_engineer', label: 'Field Engineer' },
                      { value: 'dispatcher', label: 'Dispatcher' },
                      { value: 'manager', label: 'Manager' },
                      { value: 'project_manager', label: 'Project Manager' },
                      { value: 'administrator', label: 'Administrator' },
                      // Only show client company admin role to administrators
                      ...(isAdmin(user as any) ? [{ value: 'client_company_admin', label: 'Client Company Admin' }] : [])
                    ].map((role) => (
                      <div key={role.value} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`role-${role.value}`}
                          checked={formData.roles.includes(role.value)}
                          onChange={(e) => {
                            const newRoles = e.target.checked
                              ? [...formData.roles, role.value]
                              : formData.roles.filter(r => r !== role.value);
                            setFormData(prev => ({ ...prev, roles: newRoles }));
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <Label htmlFor={`role-${role.value}`} className="text-sm font-normal">
                          {role.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    placeholder="e.g., IT Support, Field Operations"
                  />
                </div>
              </div>

              {/* Client-specific fields - only show if client company admin role is selected */}
              {formData.roles.includes('client_company_admin') && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <i className="fas fa-building mr-2 text-blue-600 dark:text-blue-400"></i>
                    Client Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="clientCompanyName">Company Name *</Label>
                      <Input
                        id="clientCompanyName"
                        type="text"
                        value={formData.clientCompanyName}
                        onChange={(e) => handleInputChange('clientCompanyName', e.target.value)}
                        placeholder="Enter company name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientRole">Role within Company *</Label>
                      <Input
                        id="clientRole"
                        type="text"
                        value={formData.clientRole}
                        onChange={(e) => handleInputChange('clientRole', e.target.value)}
                        placeholder="e.g., IT Manager, Operations Director"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Login Credentials */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <i className="fas fa-key mr-2 text-green-600 dark:text-green-400"></i>
                  Login Credentials (Optional)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create manual login credentials for users who cannot use single sign-on. Leave blank if user will access through OAuth.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      placeholder="Enter unique username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Enter password (min 8 characters)"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="Confirm password"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="temporaryPassword"
                        checked={formData.temporaryPassword}
                        onChange={(e) => handleInputChange('temporaryPassword', e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <Label htmlFor="temporaryPassword" className="text-sm">
                        Require password change on first login
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <i className="fas fa-phone mr-2 text-red-600 dark:text-red-400"></i>
                  Emergency Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                    <Input
                      id="emergencyContact"
                      type="text"
                      value={formData.emergencyContact}
                      onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                      placeholder="Enter emergency contact name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      value={formData.emergencyPhone}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        handleInputChange('emergencyPhone', formatted);
                      }}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Skills and Certifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <i className="fas fa-certificate mr-2 text-green-600 dark:text-green-400"></i>
                  Skills & Qualifications
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="skills">Technical Skills</Label>
                    <Textarea
                      id="skills"
                      value={formData.skills}
                      onChange={(e) => handleInputChange('skills', e.target.value)}
                      placeholder="e.g., Network troubleshooting, Hardware repair, Software installation"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="certifications">Certifications</Label>
                    <Textarea
                      id="certifications"
                      value={formData.certifications}
                      onChange={(e) => handleInputChange('certifications', e.target.value)}
                      placeholder="e.g., CompTIA A+, Cisco CCNA, Microsoft Azure"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional information about the new team member"
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  type="button" 
                  variant="outline"
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => setFormData({
                    firstName: "",
                    lastName: "",
                    email: "",
                    roles: ["field_agent"],
                    department: "",
                    phone: "",
                    emergencyContact: "",
                    emergencyPhone: "",
                    skills: "",
                    certifications: "",
                    notes: "",
                    username: "",
                    password: "",
                    confirmPassword: "",
                    temporaryPassword: true,
                    clientCompanyName: "",
                    clientRole: ""
                  })}
                >
                  Clear Form
                </Button>
                <Button 
                  type="submit" 
                  disabled={onboardingMutation.isPending}
                  className="min-w-[120px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {onboardingMutation.isPending ? (
                    <div className="flex items-center">
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <i className="fas fa-user-plus mr-2"></i>
                      Add Team Member
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6 text-center">
              <i className="fas fa-file-download text-3xl text-blue-600 dark:text-blue-400 mb-4"></i>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Download Forms</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Get printable onboarding forms and checklists</p>
              <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                <i className="fas fa-download mr-2"></i>
                Download
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6 text-center">
              <i className="fas fa-users text-3xl text-green-600 dark:text-green-400 mb-4"></i>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">View Team</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">See all current team members and their status</p>
              <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                <i className="fas fa-eye mr-2"></i>
                View Team
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="p-6 text-center">
              <i className="fas fa-chart-bar text-3xl text-purple-600 dark:text-purple-400 mb-4"></i>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Training Progress</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Track onboarding and training completion</p>
              <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                <i className="fas fa-chart-bar mr-2"></i>
                View Progress
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}