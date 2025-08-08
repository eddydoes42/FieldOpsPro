import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";

export default function Landing() {
  const [errorMessage, setErrorMessage] = useState<string>("");

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

  const handleLogin = () => {
    setErrorMessage(""); // Clear any previous errors
    window.location.href = "/api/login";
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

              <Button 
                onClick={handleLogin}
                className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 shadow-sm"
              >
                Sign In to Continue
              </Button>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Secure authentication powered by Replit
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Note: Only team members added by an administrator can access the system
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
