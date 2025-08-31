import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";

const credentialLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type CredentialLoginData = z.infer<typeof credentialLoginSchema>;

export default function CredentialLogin() {
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<CredentialLoginData>({
    resolver: zodResolver(credentialLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: CredentialLoginData) => {
      const response = await apiRequest("/api/auth/login-credentials", "POST", data);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        if (data.redirectToOAuth) {
          // Redirect to OAuth to establish session
          window.location.href = data.redirectUrl;
        } else {
          // Direct redirect to dashboard
          window.location.href = data.redirectUrl || "/dashboard";
        }
      } else {
        setErrorMessage(data.message || "Login failed");
      }
    },
    onError: (error: any) => {
      setErrorMessage(error.message || "Invalid username or password");
    },
  });

  const onSubmit = (data: CredentialLoginData) => {
    setErrorMessage("");
    loginMutation.mutate(data);
  };

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
                  Sign In with Your Credentials
                </h2>
                <p className="text-muted-foreground text-sm">
                  Enter the username and password sent to your email
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Enter your username"
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
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="password"
                            placeholder="Enter your password"
                            data-testid="input-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit"
                    className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 shadow-sm"
                    disabled={loginMutation.isPending}
                    data-testid="button-sign-in"
                  >
                    {loginMutation.isPending ? "Signing In..." : "Sign In"}
                  </Button>
                </form>
              </Form>

              <div className="text-center space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted-foreground/30" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Don't have credentials?</span>
                  </div>
                </div>

                <Link href="/">
                  <Button variant="outline" className="w-full" data-testid="button-back-to-landing">
                    ← Back to Request Access
                  </Button>
                </Link>
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Check your email for login credentials sent by your administrator
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}