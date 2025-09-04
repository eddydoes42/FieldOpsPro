import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Smartphone, Shield, Clock } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  generateDeviceFingerprint, 
  getDeviceNameFromFingerprint, 
  storeDeviceToken 
} from "@/lib/device-fingerprint";

interface DeviceRememberPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSkip?: () => void;
}

export function DeviceRememberPrompt({ isOpen, onClose, onSkip }: DeviceRememberPromptProps) {
  const [rememberDevice, setRememberDevice] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [deviceFingerprint, setDeviceFingerprint] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Generate device fingerprint and auto-detect device name
  useEffect(() => {
    const fingerprint = generateDeviceFingerprint();
    setDeviceFingerprint(fingerprint);
    setDeviceName(getDeviceNameFromFingerprint(fingerprint));
  }, []);

  const rememberDeviceMutation = useMutation({
    mutationFn: async (data: { deviceName: string; deviceFingerprint: string }) => {
      const response = await apiRequest('/api/auth/remember-device', 'POST', data);
      return response.json();
    },
    onSuccess: (response: any) => {
      // Store the device token locally for future use
      if (response.token) {
        storeDeviceToken(response.token);
      }
      toast({
        title: "Device Remembered",
        description: "This device will remember you for faster login next time.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remember device. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (rememberDevice) {
      rememberDeviceMutation.mutate({ deviceName, deviceFingerprint });
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Remember This Device?
          </DialogTitle>
          <DialogDescription>
            Make future logins faster and more convenient on this device.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="remember-device"
                    checked={rememberDevice}
                    onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
                    data-testid="checkbox-remember-device"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="remember-device"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Remember this device
                    </label>
                    <p className="text-xs text-muted-foreground">
                      You'll stay signed in and can use biometric login if available
                    </p>
                  </div>
                </div>

                {rememberDevice && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Device Name</label>
                    <input
                      type="text"
                      value={deviceName}
                      onChange={(e) => setDeviceName(e.target.value)}
                      placeholder="My Device"
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      data-testid="input-device-name"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Smartphone className="h-3 w-3" />
                    <span>Secure device fingerprinting</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Auto-logout after 30 days of inactivity</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
              data-testid="button-skip"
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rememberDeviceMutation.isPending}
              className="flex-1"
              data-testid="button-save"
            >
              {rememberDeviceMutation.isPending ? "Saving..." : rememberDevice ? "Remember Device" : "Continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
