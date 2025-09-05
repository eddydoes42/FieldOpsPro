import { useState, useEffect } from "react";
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
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import CompanyOnboardingForm from "@/components/company-onboarding-form";
import { z } from "zod";

// All 50 US states
const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

const onboardingSchema = insertUserSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  temporaryPassword: z.boolean().optional(),
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
  const [selectedCompanyType, setSelectedCompanyType] = useState<'service' | 'client'>('service');
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [pendingUserData, setPendingUserData] = useState<any>(null);
  const [stateOpen, setStateOpen] = useState(false);

  // Fetch existing companies for selection
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ['/api/companies'],
    enabled: isOperationsDirector(currentUser)
  });

  // Get selected company data to determine type
  const selectedCompany = companies.find(c => c.id === selectedCompanyId);
  
  // Update role selection when company assignment type or selected company changes
  useEffect(() => {
    if (companyAssignmentType === 'create') {
      // For new companies, only administrator role is allowed
      setSelectedRoles(['administrator']);
      form.setValue("roles", ['administrator']);
    } else if (companyAssignmentType === 'existing' && selectedCompany) {
      // Reset roles based on company type
      if (selectedCompany.type === 'client') {
        setSelectedRoles(['administrator']);
        form.setValue("roles", ['administrator']);
      } else {
        setSelectedRoles(['field_agent']);
        form.setValue("roles", ['field_agent']);
      }
    }
  }, [companyAssignmentType, selectedCompanyId, selectedCompany]);
  
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
      username: "",
      password: "",
      temporaryPassword: true,
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      // Only create user immediately for existing company assignment
      if (companyAssignmentType === 'existing') {
        // Clean up the data for submission
        const submitData = {
          ...userData,
          roles: selectedRoles, // Use the managed state
          // Assign company for service company roles
          companyId: selectedCompanyId,
          // Include login credentials
          username: userData.username,
          password: userData.password,
          temporaryPassword: userData.temporaryPassword || true,
          skipWelcomeEmail: false, // Send email immediately for existing company
        };
        const response = await apiRequest("/api/users/onboard", "POST", submitData);
        return await response.json();
      } else {
        // For new company creation, just store the form data - don't create user yet
        return { pendingUserData: userData };
      }
    },
    onSuccess: (result) => {
      if (companyAssignmentType === 'existing') {
        // User was actually created for existing company assignment
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        queryClient.invalidateQueries({ queryKey: ["/api/access-requests"] });
        queryClient.invalidateQueries({ queryKey: ["/api/operations/stats"] });
        
        toast({
          title: "User Created",
          description: "User account created successfully!",
        });
        onSuccess(); // This completes the workflow for existing company assignment
      } else {
        // For new company creation, store user data and show company form
        setPendingUserData(result.pendingUserData);
        setShowCompanyForm(true);
        toast({
          title: "User Form Complete",
          description: "Now create the company to complete the access approval.",
        });
      }
    },
    onError: (error: any) => {
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
      
      // Check for duplicate email error from backend response
      if (error.response?.status === 400 && error.response?.data?.errorType === 'duplicate_email') {
        toast({
          title: "Email Already Exists",
          description: error.response.data.message,
          variant: "destructive",
        });
        return;
      }
      
      // Fallback check for duplicate email error in error message
      if (error.message && error.message.includes('duplicate key value violates unique constraint')) {
        toast({
          title: "Email Already Exists",
          description: "A user with this email address already exists. Please use a different email.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to create user account.",
        variant: "destructive",
      });
    },
  });

  const handleCompanyCreationComplete = async (createdCompanyId: string) => {
    // Now that company is created, create the user with company assignment
    if (pendingUserData) {
      try {
        const submitData = {
          ...pendingUserData,
          roles: selectedRoles,
          companyId: createdCompanyId, // Assign to the newly created company
          username: pendingUserData.username,
          password: pendingUserData.password,
          temporaryPassword: pendingUserData.temporaryPassword || true,
          skipWelcomeEmail: false, // Send welcome email
        };
        
        const response = await apiRequest("/api/users/onboard", "POST", submitData);
        const createdUser = await response.json();
        
        toast({
          title: "Access Granted",
          description: "User account created successfully and access has been granted!",
        });
        
        // Refresh all relevant queries
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        queryClient.invalidateQueries({ queryKey: ["/api/access-requests"] });
        queryClient.invalidateQueries({ queryKey: ["/api/operations/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
        
        // Close dialogs and signal completion
        setShowCompanyForm(false);
        setPendingUserData(null);
        onSuccess();
        
      } catch (error) {
        console.error('Failed to create user after company creation:', error);
        toast({
          title: "Error",
          description: "Company created but user creation failed. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const onSubmit = (data: any) => {
    // Validate company assignment 
    if (companyAssignmentType === 'existing' && !selectedCompanyId) {
      toast({
        title: "Company Required",
        description: "Please select a company to assign this user to.",
        variant: "destructive",
      });
      return;
    }

    // Validate company type when creating new company
    if (companyAssignmentType === 'create' && !selectedCompanyType) {
      toast({
        title: "Company Type Required",
        description: "Please select a company type for the new company.",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <Card className="max-w-3xl w-full min-h-fit my-4 mb-8 flex flex-col bg-white dark:bg-gray-900 max-h-[90vh] overflow-hidden">
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-40">
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
                          <Popover open={stateOpen} onOpenChange={setStateOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={stateOpen}
                                  className="w-full justify-between text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                                  data-testid="select-state"
                                >
                                  {field.value
                                    ? US_STATES.find((state) => state.value === field.value)?.label
                                    : "Select state..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                              <Command>
                                <CommandInput 
                                  placeholder="Search states..." 
                                  className="h-9"
                                  data-testid="input-state-search"
                                />
                                <CommandList>
                                  <CommandEmpty>No state found.</CommandEmpty>
                                  <CommandGroup>
                                    {US_STATES.map((state) => (
                                      <CommandItem
                                        key={state.value}
                                        value={state.label}
                                        onSelect={() => {
                                          field.onChange(state.value);
                                          setStateOpen(false);
                                        }}
                                        data-testid={`option-state-${state.value}`}
                                      >
                                        <Check
                                          className={`mr-2 h-4 w-4 ${
                                            field.value === state.value ? "opacity-100" : "opacity-0"
                                          }`}
                                        />
                                        {state.label}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
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

              {/* Login Credentials */}
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Login Credentials</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Username *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter username" 
                            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            {...field}
                            data-testid="input-username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Password *</FormLabel>
                        <FormControl>
                          <PasswordInput 
                            placeholder="Enter password" 
                            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            {...field}
                            data-testid="input-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="temporaryPassword"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-temporary-password"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Temporary Password
                          </FormLabel>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            User will be required to change password on first login
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Company Assignment */}
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
                    <div className="space-y-4">
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">Company Type *</FormLabel>
                        <Select value={selectedCompanyType} onValueChange={(value: 'service' | 'client') => setSelectedCompanyType(value)}>
                          <SelectTrigger 
                            className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                            data-testid="select-company-type"
                          >
                            <SelectValue placeholder="Select company type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="service" data-testid="option-service-company">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <div>
                                  <div className="font-medium">Service Company</div>
                                  <div className="text-xs text-gray-500">IT service provider</div>
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="client" data-testid="option-client-company">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <div>
                                  <div className="font-medium">Client Company</div>
                                  <div className="text-xs text-gray-500">IT service requester</div>
                                </div>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          After creating this user, you'll be prompted to set up the new {selectedCompanyType === 'service' ? 'service' : 'client'} company. 
                          The user will automatically be assigned as an Administrator of the new company.
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                          Note: Welcome email will be sent after the company setup is completed.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Role Assignment - context-aware based on company selection */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Role Assignment</h4>
                    <FormField
                      control={form.control}
                      name="roles"
                      render={() => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-gray-900 dark:text-gray-100">User Roles *</FormLabel>
                          <div className="space-y-2">
                            {(() => {
                              // Context-aware role options based on company type
                              if (companyAssignmentType === 'create') {
                                return [{ value: "administrator", label: "Administrator" }];
                              } else if (companyAssignmentType === 'existing' && selectedCompany) {
                                if (selectedCompany.type === 'client') {
                                  // Client company roles - organizational roles for client companies
                                  return [
                                    { value: "administrator", label: "Administrator" },
                                    { value: "project_manager", label: "Project Manager" },
                                    { value: "manager", label: "Manager" },
                                    { value: "dispatcher", label: "Dispatcher" },
                                  ];
                                } else {
                                  // Service company roles - field operation roles
                                  return [
                                    { value: "field_agent", label: "Field Agent" },
                                    { value: "field_engineer", label: "Field Engineer" },
                                    { value: "dispatcher", label: "Dispatcher" },
                                    { value: "manager", label: "Manager" },
                                    { value: "administrator", label: "Administrator" },
                                  ];
                                }
                              } else {
                                // Default roles when no company is selected
                                return [
                                  { value: "field_agent", label: "Field Agent" },
                                  { value: "field_engineer", label: "Field Engineer" },
                                  { value: "dispatcher", label: "Dispatcher" },
                                  { value: "manager", label: "Manager" },
                                  { value: "administrator", label: "Administrator" },
                                ];
                              }
                            })().map((role) => (
                              <div key={role.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={role.value}
                                  checked={selectedRoles.includes(role.value)}
                                  disabled={companyAssignmentType === 'create' && role.value !== 'administrator'}
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
                                  data-testid={`checkbox-role-${role.value}`}
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
                </div>
              </div>


            </form>
          </Form>
        </CardContent>
        
        {/* Action Buttons - Fixed at bottom */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex space-x-3">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                // Refresh dashboard data when cancelling
                queryClient.invalidateQueries({ queryKey: ["/api/access-requests"] });
                queryClient.invalidateQueries({ queryKey: ["/api/operations/stats"] });
                onClose();
              }}
              className="flex-1 h-10"
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createUserMutation.isPending}
              className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={form.handleSubmit(onSubmit)}
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Company Onboarding Dialog */}
      <Dialog open={showCompanyForm} onOpenChange={() => {}}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-minimal">
          <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
          </DialogHeader>
          <CompanyOnboardingForm 
            onClose={(createdCompanyId?: string) => {
              setShowCompanyForm(false);
              // Auto-assign user as administrator to the new company
              if (createdCompanyId) {
                handleCompanyCreationComplete(createdCompanyId);
              }
            }}
            preFilledUserId={pendingUserData ? 'pending' : undefined}
            companyType={selectedCompanyType}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
