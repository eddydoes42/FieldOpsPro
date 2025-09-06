import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAccessRequestSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Link } from "wouter";

const accessRequestFormSchema = insertAccessRequestSchema.extend({
  confirmEmail: z.string().email("Please enter a valid email")
}).refine((data) => data.email === data.confirmEmail, {
  message: "Email addresses must match",
  path: ["confirmEmail"],
});

const devBypassFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  testingGoals: z.string().min(10, "Please describe what you plan to test (minimum 10 characters)"),
  companyType: z.enum(["service", "client"], { required_error: "Please select a company type" }),
  companyName: z.string().min(1, "Company name is required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AccessRequestFormData = z.infer<typeof accessRequestFormSchema>;
type DevBypassFormData = z.infer<typeof devBypassFormSchema>;

export default function Landing() {
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDevBypassOpen, setIsDevBypassOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<AccessRequestFormData>({
    resolver: zodResolver(accessRequestFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      confirmEmail: "",
      phone: "",
      requestedRole: "",
      intention: "",
      howHeardAbout: "",
      skillsDescription: "",
    },
  });

  const accessRequestMutation = useMutation({
    mutationFn: async (data: AccessRequestFormData) => {
      const { confirmEmail, ...requestData } = data;
      return await fetch("/api/access-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Access Request Submitted",
        description: "Your request has been sent to the Operations Director for review.",
      });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit access request",
        variant: "destructive",
      });
    },
  });

  const devBypassForm = useForm<DevBypassFormData>({
    resolver: zodResolver(devBypassFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      testingGoals: "",
      companyType: "service",
      companyName: "",
      username: "",
      password: "",
    },
  });

  const devBypassMutation = useMutation({
    mutationFn: async (data: DevBypassFormData) => {
      const requestData = {
        ...data,
        requestedRole: "administrator",
        intention: "manage_jobs_people",
        isDevBypass: true,
        companyName: data.companyName.startsWith("TEST") ? data.companyName : `TEST ${data.companyName}`,
      };
      return await fetch("/api/access-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Dev Access Request Submitted",
        description: "Your dev bypass request has been sent to the Operations Director for review.",
      });
      devBypassForm.reset();
      setIsDevBypassOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit dev bypass request",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Check for error message in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
      setErrorMessage(decodeURIComponent(error));
      // Clear the error from URL without page reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleCredentialLogin = () => {
    setErrorMessage(""); // Clear any previous errors
  };

  const handleReilitLogin = () => {
    setErrorMessage(""); // Clear any previous errors
    window.location.href = "/api/login";
  };

  const onDevBypassSubmit = (data: DevBypassFormData) => {
    devBypassMutation.mutate(data);
  };

  const onSubmit = (data: AccessRequestFormData) => {
    accessRequestMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Company Logo and Branding */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary rounded-xl flex items-center justify-center mb-4">
            <i className="fas fa-tools text-white text-2xl"></i>
          </div>
          <h1 className="text-3xl font-bold text-foreground">FieldOps Pro</h1>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <Alert variant="destructive" className="shadow-lg">
            <i className="fas fa-exclamation-triangle w-4 h-4"></i>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Login Card */}
        <Card className="shadow-lg">
          <CardContent className="py-8 px-6">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Welcome to FieldOps Pro
                </h2>
                <p className="text-muted-foreground text-sm">
                  Manage your field operations with ease
                </p>
              </div>

              <Link href="/credential-login">
                <Button 
                  onClick={handleCredentialLogin}
                  className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 shadow-sm"
                  data-testid="button-sign-in-continue"
                >
                  Sign In to Continue
                </Button>
              </Link>

              <div className="text-center space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted-foreground/30" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      Request Access
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md w-[95vw] max-h-[85vh] overflow-y-auto p-4">
                    <DialogHeader>
                      <DialogTitle>Request Access to FieldOps Pro</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
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
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="confirmEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Email Address</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
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
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="requestedRole"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Requested Role</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select the role you're interested in" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="field_agent">Field Agent</SelectItem>
                                  <SelectItem value="dispatcher">Dispatcher</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="administrator">Administrator</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="howHeardAbout"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>How did you hear about us?</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Job posting, referral, LinkedIn..." {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="intention"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Why are you interested in this position?</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Tell us what interests you about this role..."
                                  {...field}
                                  value={field.value || ""}
                                  rows={3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="skillsDescription"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Relevant Skills & Experience</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Tell us about your relevant experience, certifications, or skills..."
                                  {...field}
                                  value={field.value || ""}
                                  rows={3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={accessRequestMutation.isPending}
                          >
                            {accessRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                {/* Dev Bypass Button */}
                <Dialog open={isDevBypassOpen} onOpenChange={setIsDevBypassOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="w-full" data-testid="button-dev-bypass">
                      Dev Bypass
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md w-[95vw] max-h-[85vh] overflow-y-auto p-4">
                    <DialogHeader>
                      <DialogTitle>Dev Request Access</DialogTitle>
                    </DialogHeader>
                    <Form {...devBypassForm}>
                      <form onSubmit={devBypassForm.handleSubmit(onDevBypassSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={devBypassForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={devBypassForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={devBypassForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={devBypassForm.control}
                          name="testingGoals"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Testing Goals</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Describe what you plan to test..."
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={devBypassForm.control}
                          name="companyType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select company type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="service">Service Company</SelectItem>
                                  <SelectItem value="client">Client Company</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={devBypassForm.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., My Company (will auto-prefix with TEST)"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={devBypassForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={devBypassForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end space-x-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDevBypassOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={devBypassMutation.isPending}
                          >
                            {devBypassMutation.isPending ? "Submitting..." : "Submit Request"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Secure authentication powered by Replit
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Team members can sign in above, or request access to join
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
