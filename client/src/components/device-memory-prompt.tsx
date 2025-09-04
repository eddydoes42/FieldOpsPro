import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { deviceAuthService } from "@/lib/deviceAuth";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, Shield, Clock, Fingerprint } from "lucide-react";

interface DeviceMemoryPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username?: string;
  password?: string; // Add password for secure storage
  onDeviceRemembered?: () => void;
}

export function DeviceMemoryPrompt({ 
  open, 
  onOpenChange, 
  username,
  password,
  onDeviceRemembered 
}: DeviceMemoryPromptProps) {
  const [rememberDevice, setRememberDevice] = useState(false);
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const { toast } = useToast();

  const deviceStatus = deviceAuthService.getDeviceTrustStatus();
  const biometricSupported = deviceAuthService.isBiometricSupported();
  
  // Enhanced debugging for mobile devices
  React.useEffect(() => {
    const info = `Device: ${deviceStatus.deviceName || 'Unknown'}, Biometric: ${biometricSupported ? 'Supported' : 'Not Supported'}, Secure: ${window.isSecureContext}, Mobile: ${/Mobile|Android|iPhone|iPad/.test(navigator.userAgent)}`;
    setDebugInfo(info);
    console.log('[DeviceMemoryPrompt] Debug info:', info);
  }, [deviceStatus, biometricSupported]);

  const handleSavePreferences = async () => {
    setIsProcessing(true);
    
    try {
      if (rememberDevice) {
        // Save device with credentials for autofill
        deviceAuthService.rememberDevice(username, password);
        
        if (enableBiometric && biometricSupported && username) {
          try {
            await deviceAuthService.registerBiometric(username);
            toast({
              title: "Device Settings Saved",
              description: "Device remembered with biometric login enabled.",
            });
          } catch (biometricError) {
            console.error('Biometric setup failed:', biometricError);
            toast({
              title: "Device Remembered",
              description: "Device saved, but biometric setup failed. You can try again later.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Device Remembered",
            description: "This device will remember your login for 30 days.",
          });
        }
        
        onDeviceRemembered?.();
      }
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save device preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-md mobile-container"
        data-testid="device-memory-prompt"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Remember This Device
          </DialogTitle>
          <DialogDescription>
            Choose your security preferences for this device
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Device Info Card */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Device Information</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {deviceStatus.deviceName || 'Current Device'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    We'll securely store your login preferences
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remember Device Option */}
          <div className="flex items-start space-x-3 p-4 border rounded-lg">
            <Checkbox
              id="remember-device"
              checked={rememberDevice}
              onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
              data-testid="checkbox-remember-device"
            />
            <div className="flex-1">
              <label 
                htmlFor="remember-device" 
                className="text-sm font-medium cursor-pointer"
              >
                Remember this device
              </label>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Stay signed in for 30 days
                </p>
              </div>
            </div>
          </div>

          {/* Biometric Option */}
          <div className={`flex items-start space-x-3 p-4 border rounded-lg transition-opacity ${
            !biometricSupported ? 'opacity-50 bg-gray-50 dark:bg-gray-800' : !rememberDevice ? 'opacity-50' : ''
          }`}>
            {biometricSupported ? (
              <>
                <Checkbox
                  id="enable-biometric"
                  checked={enableBiometric && rememberDevice && biometricSupported}
                  onCheckedChange={(checked) => setEnableBiometric(checked as boolean)}
                  disabled={!rememberDevice || !biometricSupported}
                  data-testid="checkbox-enable-biometric"
                />
                <div className="flex-1">
                  <label 
                    htmlFor="enable-biometric" 
                    className={`text-sm font-medium ${!rememberDevice || !biometricSupported ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    Enable biometric login
                  </label>
                  <div className="flex items-center gap-1 mt-1">
                    <Fingerprint className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Use fingerprint or face recognition
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Checkbox
                  id="enable-biometric-disabled"
                  checked={false}
                  disabled={true}
                  data-testid="checkbox-enable-biometric-disabled"
                />
                <div className="flex-1">
                  <label 
                    htmlFor="enable-biometric-disabled" 
                    className="text-sm font-medium cursor-not-allowed text-muted-foreground"
                  >
                    Biometric login not available
                  </label>
                  <div className="flex items-center gap-1 mt-1">
                    <Fingerprint className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Requires secure connection and compatible device
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Warning for public devices */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Security Notice:</strong> Only enable this on your personal devices. 
              Don't remember shared or public computers.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            data-testid="button-not-now"
          >
            Not Now
          </Button>
          <Button
            onClick={handleSavePreferences}
            disabled={isProcessing}
            className="flex-1"
            data-testid="button-save-preferences"
          >
            {isProcessing ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}