import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deviceAuthService } from "@/lib/deviceAuth";
import { useToast } from "@/hooks/use-toast";
import { Fingerprint, Loader2 } from "lucide-react";

interface BiometricLoginButtonProps {
  onSuccess: (username: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export function BiometricLoginButton({ 
  onSuccess, 
  onError, 
  disabled = false,
  className = ""
}: BiometricLoginButtonProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { toast } = useToast();

  const biometricSupported = deviceAuthService.isBiometricSupported();
  const biometricCredentials = deviceAuthService.getBiometricCredentials();
  const hasBiometricSetup = biometricCredentials.length > 0;

  const handleBiometricLogin = async () => {
    if (!biometricSupported) {
      const message = "Biometric authentication is not supported on this device";
      onError?.(message);
      toast({
        title: "Not Supported",
        description: message,
        variant: "destructive",
      });
      return;
    }

    if (!hasBiometricSetup) {
      const message = "No biometric credentials found. Please set up biometric authentication first.";
      onError?.(message);
      toast({
        title: "Setup Required",
        description: message,
        variant: "destructive",
      });
      return;
    }

    setIsAuthenticating(true);

    try {
      const username = await deviceAuthService.authenticateWithBiometric();
      
      if (username) {
        // Update device usage
        deviceAuthService.updateDeviceUsage(username);
        
        toast({
          title: "Authentication Successful",
          description: "Welcome back! Signed in with biometric authentication.",
        });
        
        onSuccess(username);
      } else {
        const message = "Biometric authentication failed or was cancelled";
        onError?.(message);
        toast({
          title: "Authentication Failed",
          description: message,
          variant: "destructive",
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Biometric authentication failed";
      onError?.(message);
      toast({
        title: "Authentication Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Don't render if biometric is not supported or not set up
  if (!biometricSupported || !hasBiometricSetup) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={handleBiometricLogin}
      disabled={disabled || isAuthenticating}
      className={`w-full ${className}`}
      data-testid="biometric-login-button"
    >
      {isAuthenticating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Authenticating...
        </>
      ) : (
        <>
          <Fingerprint className="mr-2 h-4 w-4" />
          Sign in with Biometrics
        </>
      )}
    </Button>
  );
}