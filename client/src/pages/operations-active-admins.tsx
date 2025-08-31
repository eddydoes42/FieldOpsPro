import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, ArrowLeft, Plus, Building2, Home, User, Mail, Phone, Key, Building } from "lucide-react";
import Navigation from "@/components/navigation";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { formatPhoneNumber } from "@/lib/phone-formatter";

interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyId?: string;
  companyName?: string;
  roles: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
  isActive: boolean;
}

const adminFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  companyId: z.string().min(1, "Company assignment is required").refine(val => val !== "none", "Please select a company"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  temporaryPassword: z.boolean().default(false),
  roles: z.array(z.string()).min(1, "At least one role must be selected")
});

type AdminFormData = z.infer<typeof adminFormSchema>;

export default function OperationsActiveAdmins() {
  const [, setLocation] = useLocation();
  const [showAdminForm, setShowAdminForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: admins = [] } = useQuery<Admin[]>({
    queryKey: ['/api/operations/admins'],
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const activeAdmins = admins.filter(admin => admin.isActive && admin.roles.includes('administrator'));

  const form = useForm<AdminFormData>({
    resolver: zodResolver(adminFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      companyId: '',
      username: '',
      password: '',
      temporaryPassword: false,
      roles: ['administrator']
    }
  });

  const createAdminMutation = useMutation({
    mutationFn: async (data: AdminFormData) => {
      const response = await fetch('/api/users/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create admin');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Admin Created Successfully",
        description: "The new administrator has been onboarded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/operations/admins'] });
      setShowAdminForm(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Admin",
        description: error.message || "An error occurred while creating the administrator.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (data: AdminFormData) => {
    // Transform data before submission
    const submissionData = {
      ...data,
      companyId: data.companyId === 'none' ? null : data.companyId,
      phone: data.phone || null
    };
    createAdminMutation.mutate(submissionData);
  };

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
              onClick={() => window.history.back()}
              className="flex items-center space-x-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Administrators
          </h1>
          <Button 
            onClick={() => setShowAdminForm(true)}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Admin
          </Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:bg-gray-50 dark:hover:bg-gray-750"
            onClick={() => setLocation('/team?role=administrator&status=active')}
          >
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Admins
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {activeAdmins.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:bg-gray-50 dark:hover:bg-gray-750"
            onClick={() => setLocation('/team?role=administrator')}
          >
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Admins
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {admins.filter(admin => admin.roles.includes('administrator')).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admins List */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Active Administrators
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeAdmins.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No active administrators found. Start by onboarding your first administrator.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeAdmins.map((admin) => (
                  <div 
                    key={admin.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                            {admin.firstName} {admin.lastName}
                          </h3>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            Active
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div>
                            <span className="font-medium">Email:</span> {admin.email}
                          </div>
                          {admin.companyName && (
                            <div>
                              <span className="font-medium">Company:</span> {admin.companyName}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Roles:</span> {admin.roles.join(', ')}
                          </div>
                          {admin.lastLoginAt && (
                            <div>
                              <span className="font-medium">Last Login:</span> {new Date(admin.lastLoginAt).toLocaleDateString()}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Onboarded:</span> {new Date(admin.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Admin Creation Dialog */}
        <Dialog open={showAdminForm} onOpenChange={setShowAdminForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-minimal">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <User className="h-5 w-5 text-green-600" />
                Add New Administrator
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      {...form.register('firstName')}
                      placeholder="Enter first name"
                      className={form.formState.errors.firstName ? 'border-red-500' : ''}
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-red-500 text-sm">{form.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      {...form.register('lastName')}
                      placeholder="Enter last name"
                      className={form.formState.errors.lastName ? 'border-red-500' : ''}
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-red-500 text-sm">{form.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register('email')}
                      placeholder="admin@company.com"
                      className={form.formState.errors.email ? 'border-red-500' : ''}
                    />
                    {form.formState.errors.email && (
                      <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      {...form.register('phone')}
                      placeholder="(555) 123-4567"
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        e.target.value = formatted;
                        form.setValue('phone', formatted);
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Company Assignment */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Company Assignment
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="companyId">Assign to Company *</Label>
                  <Select onValueChange={(value) => form.setValue('companyId', value)}>
                    <SelectTrigger className={form.formState.errors.companyId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select a company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name} {!company.isActive && '(Inactive)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.companyId && (
                    <p className="text-red-500 text-sm">{form.formState.errors.companyId.message}</p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Administrators must be assigned to manage a specific company, including inactive ones.
                  </p>
                </div>
              </div>
              
              {/* Login Credentials */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Login Credentials
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      {...form.register('username')}
                      placeholder="admin_username"
                      className={form.formState.errors.username ? 'border-red-500' : ''}
                    />
                    {form.formState.errors.username && (
                      <p className="text-red-500 text-sm">{form.formState.errors.username.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      {...form.register('password')}
                      placeholder="Enter secure password"
                      className={form.formState.errors.password ? 'border-red-500' : ''}
                    />
                    {form.formState.errors.password && (
                      <p className="text-red-500 text-sm">{form.formState.errors.password.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="temporaryPassword"
                    checked={form.watch('temporaryPassword')}
                    onCheckedChange={(checked) => form.setValue('temporaryPassword', !!checked)}
                  />
                  <Label htmlFor="temporaryPassword" className="text-sm">
                    This is a temporary password (user must change on first login)
                  </Label>
                </div>
              </div>
              
              {/* Role Assignment */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Role Assignment
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-administrator"
                      checked={form.watch('roles').includes('administrator')}
                      onCheckedChange={(checked) => {
                        const currentRoles = form.getValues('roles');
                        if (checked) {
                          form.setValue('roles', [...currentRoles, 'administrator']);
                        } else {
                          form.setValue('roles', currentRoles.filter(r => r !== 'administrator'));
                        }
                      }}
                    />
                    <Label htmlFor="role-administrator" className="font-medium">
                      Administrator
                    </Label>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      (Full system access and user management)
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-manager"
                      checked={form.watch('roles').includes('manager')}
                      onCheckedChange={(checked) => {
                        const currentRoles = form.getValues('roles');
                        if (checked) {
                          form.setValue('roles', [...currentRoles, 'manager']);
                        } else {
                          form.setValue('roles', currentRoles.filter(r => r !== 'manager'));
                        }
                      }}
                    />
                    <Label htmlFor="role-manager" className="font-medium">
                      Manager
                    </Label>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      (Team and work order management)
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="role-dispatcher"
                      checked={form.watch('roles').includes('dispatcher')}
                      onCheckedChange={(checked) => {
                        const currentRoles = form.getValues('roles');
                        if (checked) {
                          form.setValue('roles', [...currentRoles, 'dispatcher']);
                        } else {
                          form.setValue('roles', currentRoles.filter(r => r !== 'dispatcher'));
                        }
                      }}
                    />
                    <Label htmlFor="role-dispatcher" className="font-medium">
                      Dispatcher
                    </Label>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      (Work order assignment and tracking)
                    </span>
                  </div>
                </div>
                
                {form.formState.errors.roles && (
                  <p className="text-red-500 text-sm">{form.formState.errors.roles.message}</p>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAdminForm(false);
                    form.reset();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createAdminMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {createAdminMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Creating Admin...
                    </div>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Administrator
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}