import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { deviceAuthService } from "@/lib/deviceAuth";
import { BiometricLoginButton } from "@/components/biometric-login-button";
import { DeviceMemoryPrompt } from "@/components/device-memory-prompt";

const credentialLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type CredentialLoginData = z.infer<typeof credentialLoginSchema>;

export default function CredentialLogin() {
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showDifferentAccount, setShowDifferentAccount] = useState(false);
  const [hasStoredCredentials, setHasStoredCredentials] = useState(false);
  const [showDevicePrompt, setShowDevicePrompt] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState<{username: string, password: string} | null>(null);

  const form = useForm<CredentialLoginData>({
    resolver: zodResolver(credentialLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: CredentialLoginData & { saveCredentials?: boolean }) => {
      const response = await apiRequest("/api/auth/login-credentials", "POST", {
        username: data.username,
        password: data.password
      });
      return { ...await response.json(), saveCredentials: data.saveCredentials, credentials: data };
    },
    onSuccess: (data) => {
      if (data.success) {
        // Check if we should show device memory prompt instead of immediate redirect
        if (!data.saveCredentials && deviceAuthService.shouldShowRememberDevicePrompt()) {
          // Store credentials for the prompt and show it
          setLoginCredentials({
            username: data.credentials.username,
            password: data.credentials.password
          });
          setShowDevicePrompt(true);
          return; // Don't redirect yet
        }
        
        // Save credentials if login successful and device should be remembered
        if (data.saveCredentials && data.credentials) {
          try {
            deviceAuthService.rememberDevice(data.credentials.username, data.credentials.password);
          } catch (error) {
            console.warn('Failed to save credentials:', error);
          }
        }
        
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
    
    // Check if device should be remembered and save credentials on successful login
    const shouldSave = hasStoredCredentials || deviceAuthService.isDeviceRemembered();
    loginMutation.mutate({
      ...data,
      saveCredentials: shouldSave
    });
  };

  const handleBiometricSuccess = (username: string) => {
    // On successful biometric login, get stored credentials and auto-login
    const storedCreds = deviceAuthService.getStoredCredentials();
    if (storedCreds) {
      loginMutation.mutate({
        ...storedCreds,
        saveCredentials: false // Already saved
      });
    } else {
      toast({
        title: "Biometric Login Successful",
        description: "Please complete login with your credentials.",
      });
      form.setValue('username', username);
    }
  };

  const handleUseDifferentAccount = () => {
    setShowDifferentAccount(true);
    setHasStoredCredentials(false);
    form.reset({ username: "", password: "" });
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

    // Check for stored credentials and auto-fill
    if (!showDifferentAccount) {
      const storedCreds = deviceAuthService.getStoredCredentials();
      if (storedCreds) {
        setHasStoredCredentials(true);
        form.setValue('username', storedCreds.username);
        form.setValue('password', storedCreds.password);
        
        toast({
          title: "Welcome back!",
          description: `Signed in as ${storedCreds.username}. Use "Different Account" if needed.`,
        });
      } else {
        setHasStoredCredentials(false);
      }
    }
  }, [showDifferentAccount, form, toast]);

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

              {/* Biometric Login Option - Show if biometric is supported OR if we have stored biometric credentials */}
              {(deviceAuthService.isBiometricSupported() || deviceAuthService.getBiometricCredentials().length > 0) && !showDifferentAccount && (
                <div className="space-y-4">
                  <BiometricLoginButton 
                    onSuccess={handleBiometricSuccess}
                    onError={(error) => setErrorMessage(error)}
                    disabled={loginMutation.isPending}
                  />
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-muted-foreground/30" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Show autofill notice if credentials are loaded */}
              {hasStoredCredentials && !showDifferentAccount && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <i className="fas fa-info-circle text-blue-600 mt-0.5"></i>
                    <div className="flex-1">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Credentials filled from remembered device
                      </p>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={handleUseDifferentAccount}
                        className="p-0 h-auto text-blue-600 dark:text-blue-300"
                        data-testid="button-use-different-account"
                      >
                        Use Different Account
                      </Button>
                    </div>
                  </div>
                </div>
              )}

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
                          <PasswordInput 
                            {...field} 
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
      
      {/* Device Memory Prompt - Shows after successful login */}
      <DeviceMemoryPrompt
        open={showDevicePrompt}
        onOpenChange={(open) => {
          setShowDevicePrompt(open);
          if (!open && loginCredentials) {
            // If closing without saving, just redirect normally
            window.location.href = "/dashboard";
          }
        }}
        username={loginCredentials?.username}
        password={loginCredentials?.password}
        onDeviceRemembered={() => {
          // Clear stored credentials and navigate after device is remembered
          setLoginCredentials(null);
          setShowDevicePrompt(false);
          window.location.href = "/dashboard";
        }}
      />
    </div>
  );
}