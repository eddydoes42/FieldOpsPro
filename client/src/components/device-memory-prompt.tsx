import { useState } from "react";
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
  onDeviceRemembered?: () => void;
}

export function DeviceMemoryPrompt({ 
  open, 
  onOpenChange, 
  username,
  onDeviceRemembered 
}: DeviceMemoryPromptProps) {
  const [rememberDevice, setRememberDevice] = useState(false);
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const deviceStatus = deviceAuthService.getDeviceTrustStatus();
  const biometricSupported = deviceAuthService.isBiometricSupported();

  const handleSavePreferences = async () => {
    setIsProcessing(true);
    
    try {
      if (rememberDevice) {
        deviceAuthService.rememberDevice(username);
        
        if (enableBiometric && biometricSupported) {
          try {
            await deviceAuthService.registerBiometric(username || 'user');
            toast({
              title: "Device Settings Saved",
              description: "Device remembered and biometric authentication enabled.",
            });
          } catch (biometricError) {
            toast({
              title: "Device Remembered",
              description: "Device saved, but biometric setup failed. You can try again later.",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Device Remembered",
            description: "This device will be remembered for 30 days.",
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
          {biometricSupported && (
            <div className={`flex items-start space-x-3 p-4 border rounded-lg transition-opacity ${
              !rememberDevice ? 'opacity-50' : ''
            }`}>
              <Checkbox
                id="enable-biometric"
                checked={enableBiometric && rememberDevice}
                onCheckedChange={(checked) => setEnableBiometric(checked as boolean)}
                disabled={!rememberDevice}
                data-testid="checkbox-enable-biometric"
              />
              <div className="flex-1">
                <label 
                  htmlFor="enable-biometric" 
                  className={`text-sm font-medium ${!rememberDevice ? 'cursor-not-allowed' : 'cursor-pointer'}`}
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
            </div>
          )}

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