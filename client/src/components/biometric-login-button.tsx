import { useState, useEffect } from "react";
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
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricChecking, setBiometricChecking] = useState(true);
  const { toast } = useToast();

  const [hasBiometricSetup, setHasBiometricSetup] = useState(false);

  // Check biometric support and setup asynchronously
  useEffect(() => {
    async function checkBiometricCapabilities() {
      setBiometricChecking(true);
      try {
        const supported = await deviceAuthService.isBiometricSupported();
        setBiometricSupported(supported);
        
        // Check if biometric credentials exist
        const biometricCredentials = deviceAuthService.getBiometricCredentials();
        setHasBiometricSetup(biometricCredentials.length > 0);
      } catch (error) {
        console.error('Error checking biometric capabilities:', error);
        setBiometricSupported(false);
        setHasBiometricSetup(false);
      } finally {
        setBiometricChecking(false);
      }
    }
    
    checkBiometricCapabilities();
  }, []);

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
        await deviceAuthService.updateDeviceUsage(username);
        
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

  // Don't render if still checking or biometric is not supported
  if (biometricChecking || !biometricSupported) {
    return null;
  }

  // If biometric is supported but not set up, show setup button
  if (!hasBiometricSetup) {
    return (
      <Button
        variant="outline"
        size="lg"
        onClick={async () => {
          try {
            // For demonstration, we'll show that biometric setup is needed
            toast({
              title: "Biometric Setup Required",
              description: "Set up biometric authentication after successful login to enable quick access.",
            });
          } catch (error) {
            console.error('Biometric setup error:', error);
          }
        }}
        disabled={disabled}
        className={`w-full ${className}`}
        data-testid="biometric-setup-button"
      >
        <Fingerprint className="mr-2 h-4 w-4" />
        Enable Biometric Login
      </Button>
    );
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