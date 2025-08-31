import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { insertUserSchema, isAdmin } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

// Helper function to check if user is operations director
const isOperationsDirector = (user: any) => {
  return user?.roles?.includes('operations_director') || false;
};
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CompanyOnboardingForm from "@/components/company-onboarding-form";
import { z } from "zod";

const onboardingSchema = insertUserSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  // Client-specific fields - conditional validation
  clientCompanyName: z.string().optional(),
  clientRole: z.string().optional(),
}).refine((data) => {
  // If client role is selected, company name and client role are required
  if (data.roles?.includes('client')) {
    return data.clientCompanyName && data.clientRole;
  }
  return true;
}, {
  message: "Company name and role within company are required for client accounts",
  path: ["clientCompanyName"],
});

interface UserOnboardingFormProps {
  onClose: () => void;
  onSuccess: () => void;
  currentUser?: any; // Current user to check permissions
  preFilledData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    requestedRole?: string;
  };
}

export default function UserOnboardingForm({ onClose, onSuccess, currentUser, preFilledData }: UserOnboardingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    preFilledData?.requestedRole ? [preFilledData.requestedRole] : ['field_agent']
  );
  const [companyAssignmentType, setCompanyAssignmentType] = useState<'existing' | 'create'>('existing');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  // Fetch existing companies for selection
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ['/api/companies'],
    enabled: isOperationsDirector(currentUser)
  });
  
  // Debug logging
  console.log('UserOnboardingForm currentUser:', currentUser);
  console.log('isAdmin(currentUser):', isAdmin(currentUser));

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

  const form = useForm({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: preFilledData?.firstName || "",
      lastName: preFilledData?.lastName || "",
      email: preFilledData?.email || "",
      phone: preFilledData?.phone || "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      roles: preFilledData?.requestedRole ? [preFilledData.requestedRole] : ["field_agent"],
      clientCompanyName: "",
      clientRole: "",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      // Clean up the data for submission
      const submitData = {
        ...userData,
        roles: selectedRoles, // Use the managed state
        // Assign company for service company roles
        companyId: companyAssignmentType === 'existing' && selectedCompanyId ? selectedCompanyId : null,
        // Only include client fields if client role is selected
        clientCompanyName: selectedRoles.includes('client') ? userData.clientCompanyName : null,
        clientRole: selectedRoles.includes('client') ? userData.clientRole : null,
      };
      const response = await apiRequest("/api/users", "POST", submitData);
      return await response.json();
    },
    onSuccess: (createdUser) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      // If creating a new company, store the user ID and show company form
      if (companyAssignmentType === 'create' && !selectedRoles.includes('client')) {
        setCreatedUserId(createdUser.id);
        setShowCompanyForm(true);
      } else {
        onSuccess();
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
        description: "Failed to create user account.",
        variant: "destructive",
      });
    },
  });

  const handleCompanyCreationComplete = () => {
    // Refresh all relevant queries and close the form
    queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
    onSuccess();
  };

  const onSubmit = (data: any) => {
    // Validate company assignment for service company roles
    if (!selectedRoles.includes('client')) {
      if (companyAssignmentType === 'existing' && !selectedCompanyId) {
        toast({
          title: "Company Required",
          description: "Please select a company to assign this user to.",
          variant: "destructive",
        });
        return;
      }
    }
    createUserMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-1 overflow-y-auto">
      <Card className="max-w-3xl w-full min-h-fit my-1 flex flex-col bg-white dark:bg-gray-900 max-h-[98vh] overflow-hidden">
        <CardHeader className="pb-2 px-3 pt-3 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
              Add New User
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-6 w-6 p-0"
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-4 overflow-y-auto scrollbar-minimal">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Personal Information */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">First Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter first name" 
                            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Last Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter last name" 
                            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Contact Information</h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Email Address *</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="Enter email address" 
                            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Phone Number *</FormLabel>
                        <FormControl>
                          <Input 
                            type="tel" 
                            placeholder="Enter phone number" 
                            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            {...field}
                            onChange={(e) => {
                              const formattedValue = formatPhoneNumber(e.target.value);
                              field.onChange(formattedValue);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Address Information</h3>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Street Address *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter street address" 
                            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">City *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter city" 
                              className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">State *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="CA">California</SelectItem>
                              <SelectItem value="NY">New York</SelectItem>
                              <SelectItem value="TX">Texas</SelectItem>
                              <SelectItem value="FL">Florida</SelectItem>
                              <SelectItem value="IL">Illinois</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">ZIP Code *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter ZIP code" 
                              className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Role Assignment */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Role Assignment</h3>
                <FormField
                  control={form.control}
                  name="roles"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">User Roles *</FormLabel>
                      <div className="space-y-2">
                        {[
                          { value: "field_agent", label: "Field Agent" },
                          { value: "manager", label: "Manager" },
                          { value: "administrator", label: "Administrator" },
                          { value: "client", label: "Client" },
                        ].filter((role) => {
                          // Only show client role to operations directors
                          if (role.value === "client") {
                            return currentUser?.roles?.includes('operations_director') || false;
                          }
                          return true;
                        }).map((role) => (
                          <div key={role.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={role.value}
                              checked={selectedRoles.includes(role.value)}
                              onCheckedChange={(checked) => {
                                let newRoles = [...selectedRoles];
                                if (checked) {
                                  newRoles.push(role.value);
                                } else {
                                  newRoles = newRoles.filter(r => r !== role.value);
                                }
                                setSelectedRoles(newRoles);
                                form.setValue("roles", newRoles);
                              }}
                            />
                            <label
                              htmlFor={role.value}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-900 dark:text-gray-100"
                            >
                              {role.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Company Assignment - only show for service company roles */}
              {!selectedRoles.includes('client') && (
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Company Assignment</h3>
                  <div className="space-y-4">
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Assignment Type *</FormLabel>
                      <RadioGroup
                        value={companyAssignmentType}
                        onValueChange={(value: 'existing' | 'create') => setCompanyAssignmentType(value)}
                        className="flex flex-col space-y-2"
                        data-testid="radio-company-assignment-type"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="existing" id="existing" data-testid="radio-existing-company" />
                          <label htmlFor="existing" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Assign to Existing Company
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="create" id="create" data-testid="radio-create-company" />
                          <label htmlFor="create" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Create New Company
                          </label>
                        </div>
                      </RadioGroup>
                    </FormItem>

                    {companyAssignmentType === 'existing' && (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Select Company *</FormLabel>
                        <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                          <SelectTrigger 
                            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            data-testid="select-existing-company"
                          >
                            <SelectValue placeholder="Choose a company" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.map((company: any) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}

                    {companyAssignmentType === 'create' && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          After creating this user, you'll be prompted to set up the new company. 
                          The user will automatically be assigned as an Administrator of the new company.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Client-specific fields - only show if client role is selected */}
              {selectedRoles.includes('client') && (
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Client Information</h3>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="clientCompanyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Company Name *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter company name" 
                              className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clientRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Role within Company *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., IT Manager, CEO, Operations Director" 
                              className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 h-9"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="flex-1 h-9"
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Company Onboarding Dialog */}
      <Dialog open={showCompanyForm} onOpenChange={() => {}}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
          </DialogHeader>
          <CompanyOnboardingForm 
            onClose={() => {
              setShowCompanyForm(false);
              // Auto-assign user as administrator to the new company
              handleCompanyCreationComplete();
            }}
            preFilledUserId={createdUserId}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
