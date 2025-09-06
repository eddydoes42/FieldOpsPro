import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, Scan, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  isBiometricSupported,
  getAvailableBiometricTypes,
  isPlatformAuthenticatorAvailable,
  registerBiometric,
  authenticateBiometric,
  getCredentialDisplayInfo,
  credentialToServerFormat,
  authResponseToServerFormat,
  setBiometricPreference,
  getBiometricPreference,
  clearBiometricData,
  type BiometricAuthResult
} from "@/utils/biometricAuth";

interface BiometricLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'setup' | 'login';
  userId?: string;
  userName?: string;
}

export function BiometricLogin({ 
  isOpen, 
  onClose, 
  onSuccess, 
  mode, 
  userId, 
  userName 
}: BiometricLoginProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'check' | 'setup' | 'authenticate' | 'success' | 'error'>('check');
  const [errorMessage, setErrorMessage] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check biometric support on mount
  useEffect(() => {
    if (isOpen) {
      checkBiometricSupport();
    }
  }, [isOpen]);

  const checkBiometricSupport = async () => {
    setIsLoading(true);
    try {
      const supported = isBiometricSupported();
      setIsSupported(supported);
      
      if (supported) {
        const [platformAvailable, types] = await Promise.all([
          isPlatformAuthenticatorAvailable(),
          getAvailableBiometricTypes()
        ]);
        
        if (platformAvailable && types.length > 0) {
          setAvailableTypes(types);
          setStep(mode === 'setup' ? 'setup' : 'authenticate');
        } else {
          setStep('error');
          setErrorMessage('No biometric authentication methods available on this device');
        }
      } else {
        setStep('error');
        setErrorMessage('Biometric authentication is not supported on this device');
      }
    } catch (error) {
      setStep('error');
      setErrorMessage('Failed to check biometric support');
    } finally {
      setIsLoading(false);
    }
  };

  const registerBiometricMutation = useMutation({
    mutationFn: async (credential: PublicKeyCredential) => {
      const credentialData = credentialToServerFormat(credential);
      const displayInfo = getCredentialDisplayInfo(credential);
      
      return apiRequest('/api/auth/biometric/register', 'POST', {
        credentialId: credentialData.id,
        publicKey: credentialData.publicKey,
        attestationObject: credentialData.attestationObject,
        clientDataJSON: credentialData.clientDataJSON,
        deviceId: credentialData.id,
        biometricType: displayInfo.type,
        deviceName: displayInfo.name,
      });
    },
    onSuccess: () => {
      setBiometricPreference(true);
      setStep('success');
      toast({
        title: "Biometric Authentication Enabled",
        description: "You can now use biometric authentication to login faster.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      setStep('error');
      setErrorMessage(error.message || 'Failed to register biometric authentication');
    },
  });

  const authenticateBiometricMutation = useMutation({
    mutationFn: async (credential: PublicKeyCredential) => {
      const authData = authResponseToServerFormat(credential);
      
      return apiRequest('/api/auth/biometric/authenticate', 'POST', {
        credentialId: authData.id,
        authenticatorData: authData.authenticatorData,
        clientDataJSON: authData.clientDataJSON,
        signature: authData.signature,
        userHandle: authData.userHandle,
      });
    },
    onSuccess: () => {
      setStep('success');
      toast({
        title: "Login Successful",
        description: "Welcome back! You've been authenticated via biometrics.",
      });
      onSuccess();
    },
    onError: (error: any) => {
      setStep('error');
      setErrorMessage(error.message || 'Biometric authentication failed');
    },
  });

  const handleBiometricSetup = async () => {
    if (!userId || !userName) {
      setErrorMessage('User information not available');
      return;
    }

    setIsLoading(true);
    try {
      const result: BiometricAuthResult = await registerBiometric(userId, userName);
      
      if (result.success && result.credential) {
        await registerBiometricMutation.mutateAsync(result.credential);
      } else {
        setStep('error');
        setErrorMessage(result.error || 'Failed to register biometric authentication');
      }
    } catch (error) {
      setStep('error');
      setErrorMessage('Failed to setup biometric authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!userId) {
      setErrorMessage('User ID not available');
      return;
    }

    setIsLoading(true);
    try {
      const result: BiometricAuthResult = await authenticateBiometric(userId);
      
      if (result.success && result.credential) {
        await authenticateBiometricMutation.mutateAsync(result.credential);
      } else {
        setStep('error');
        setErrorMessage(result.error || 'Biometric authentication failed');
      }
    } catch (error) {
      setStep('error');
      setErrorMessage('Failed to authenticate with biometrics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('check');
    setErrorMessage('');
    onClose();
  };

  const renderBiometricIcon = (type: string) => {
    if (type === 'fingerprint') return <Fingerprint className="h-6 w-6" />;
    if (type === 'face') return <Scan className="h-6 w-6" />;
    return <Shield className="h-6 w-6" />;
  };

  const renderContent = () => {
    if (step === 'check' || isLoading) {
      return (
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm text-muted-foreground">
            Checking biometric capabilities...
          </p>
        </div>
      );
    }

    if (step === 'error') {
      return (
        <div className="flex flex-col items-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2">Not Available</h3>
            <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
            <Button onClick={handleClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      );
    }

    if (step === 'success') {
      return (
        <div className="flex flex-col items-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2">
              {mode === 'setup' ? 'Setup Complete!' : 'Welcome Back!'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {mode === 'setup' 
                ? 'Biometric authentication has been enabled for your account.'
                : 'You have been successfully authenticated.'}
            </p>
            <Button onClick={handleClose}>
              Continue
            </Button>
          </div>
        </div>
      );
    }

    if (step === 'setup') {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <h3 className="font-semibold text-lg mb-2">Enable Biometric Login</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set up biometric authentication for faster, more secure logins.
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Available Methods:</h4>
            <div className="flex flex-wrap gap-2">
              {availableTypes.map((type) => (
                <Badge key={type} variant="secondary" className="flex items-center gap-1">
                  {renderBiometricIcon(type)}
                  {type === 'fingerprint' ? 'Touch ID' : 
                   type === 'face' ? 'Face ID' : 
                   'Biometric'}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <Button 
              onClick={handleBiometricSetup} 
              disabled={isLoading || registerBiometricMutation.isPending}
              className="flex-1"
              data-testid="button-setup-biometric"
            >
              {(isLoading || registerBiometricMutation.isPending) && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              )}
              Enable Biometric Login
            </Button>
            <Button onClick={handleClose} variant="outline">
              Skip
            </Button>
          </div>
        </div>
      );
    }

    if (step === 'authenticate') {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <Fingerprint className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <h3 className="font-semibold text-lg mb-2">Biometric Login</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Use your biometric authentication to sign in securely.
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Available Methods:</h4>
            <div className="flex flex-wrap gap-2">
              {availableTypes.map((type) => (
                <Badge key={type} variant="secondary" className="flex items-center gap-1">
                  {renderBiometricIcon(type)}
                  {type === 'fingerprint' ? 'Touch ID' : 
                   type === 'face' ? 'Face ID' : 
                   'Biometric'}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <Button 
              onClick={handleBiometricLogin} 
              disabled={isLoading || authenticateBiometricMutation.isPending}
              className="flex-1"
              data-testid="button-authenticate-biometric"
            >
              {(isLoading || authenticateBiometricMutation.isPending) && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              )}
              Authenticate
            </Button>
            <Button onClick={handleClose} variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'setup' ? 'Setup Biometric Authentication' : 'Biometric Login'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'setup' 
              ? 'Secure your account with biometric authentication'
              : 'Sign in using your biometric credentials'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BiometricLogin;
