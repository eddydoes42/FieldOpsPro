import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Home, ArrowLeft, User, Bell, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function FieldAgentSettings() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Settings state
  const [notifications, setNotifications] = useState({
    workOrderUpdates: true,
    scheduleChanges: true,
    messageAlerts: true,
    dailyReminders: false,
  });

  const [preferences, setPreferences] = useState({
    autoCheckIn: false,
    showEstimatedTime: true,
    compactView: false,
  });

  const handleNotificationChange = (key: string) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
    toast({
      title: "Settings Updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const handlePreferenceChange = (key: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
    toast({
      title: "Settings Updated",
      description: "Your preferences have been saved.",
    });
  };

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Unauthorized</div>;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-1 hover:bg-accent"
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center space-x-1 hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account preferences and notifications
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Profile Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={(user as any)?.firstName || ''}
                    disabled
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={(user as any)?.lastName || ''}
                    disabled
                    className="bg-gray-50 dark:bg-gray-800"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={(user as any)?.email || ''}
                  disabled
                  className="bg-gray-50 dark:bg-gray-800"
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Contact your administrator to update profile information.
              </p>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Notification Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Work Order Updates</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Get notified when work orders are assigned or updated
                    </p>
                  </div>
                  <Switch
                    checked={notifications.workOrderUpdates}
                    onCheckedChange={() => handleNotificationChange('workOrderUpdates')}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Schedule Changes</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Get notified about schedule modifications
                    </p>
                  </div>
                  <Switch
                    checked={notifications.scheduleChanges}
                    onCheckedChange={() => handleNotificationChange('scheduleChanges')}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Message Alerts</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Get notified about new messages
                    </p>
                  </div>
                  <Switch
                    checked={notifications.messageAlerts}
                    onCheckedChange={() => handleNotificationChange('messageAlerts')}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Daily Reminders</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Receive daily reminders about upcoming tasks
                    </p>
                  </div>
                  <Switch
                    checked={notifications.dailyReminders}
                    onCheckedChange={() => handleNotificationChange('dailyReminders')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* App Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>App Preferences</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auto Check-In</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Automatically check in when starting time tracking
                    </p>
                  </div>
                  <Switch
                    checked={preferences.autoCheckIn}
                    onCheckedChange={() => handlePreferenceChange('autoCheckIn')}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Show Estimated Time</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Display estimated hours on work order cards
                    </p>
                  </div>
                  <Switch
                    checked={preferences.showEstimatedTime}
                    onCheckedChange={() => handlePreferenceChange('showEstimatedTime')}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Compact View</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Use a more compact layout for work orders
                    </p>
                  </div>
                  <Switch
                    checked={preferences.compactView}
                    onCheckedChange={() => handlePreferenceChange('compactView')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Button variant="outline" className="w-fit">
                  Change Password
                </Button>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Contact your administrator to change your password.
                </p>
              </div>
              
              <Separator />
              
              <div className="flex flex-col space-y-2">
                <Button
                  variant="destructive"
                  className="w-fit"
                  onClick={() => {
                    window.location.href = "/api/logout";
                  }}
                >
                  Sign Out
                </Button>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sign out of your account on this device.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}