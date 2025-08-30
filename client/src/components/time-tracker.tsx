import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimeTrackerProps {
  activeTimeEntry?: any;
}

export default function TimeTracker({ activeTimeEntry: propActiveTimeEntry }: TimeTrackerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [showWorkOrderDialog, setShowWorkOrderDialog] = useState(false);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>("");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch active work orders for time tracking selection
  const { data: workOrders } = useQuery({
    queryKey: ["/api/work-orders"],
    enabled: showWorkOrderDialog,
  });

  // Get the current active time entry from the API
  const { data: activeTimeEntry } = useQuery({
    queryKey: ["/api/time-entries/active"],
    refetchInterval: 2000, // Refetch every 2 seconds to keep timer updated
  });

  // Filter for active/in-progress work orders
  const activeWorkOrders = (workOrders as any[])?.filter((order: any) => 
    order.status === 'scheduled' || 
    order.status === 'in_progress' || 
    order.status === 'assigned'
  ) || [];

  const startTimeMutation = useMutation({
    mutationFn: async (workOrderId: string) => {
      await apiRequest("/api/time-entries", "POST", {
        startTime: new Date().toISOString(),
        isActive: true,
        workOrderId: workOrderId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      setShowWorkOrderDialog(false);
      setSelectedWorkOrderId("");
      toast({
        title: "Success",
        description: "Time tracking started.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to start time tracking.",
        variant: "destructive",
      });
    },
  });

  const endTimeMutation = useMutation({
    mutationFn: async (timeEntryId: string) => {
      await apiRequest(`/api/time-entries/${timeEntryId}/end`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries/active"] });
      toast({
        title: "Success",
        description: "Time tracking stopped.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to stop time tracking.",
        variant: "destructive",
      });
    },
  });

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const diff = currentTime.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const toggleBreak = () => {
    setIsOnBreak(!isOnBreak);
    toast({
      title: isOnBreak ? "Break ended" : "Break started",
      description: isOnBreak ? "Welcome back!" : "Enjoy your break!",
    });
  };

  const clockOut = () => {
    if (activeTimeEntry && (activeTimeEntry as any).id) {
      endTimeMutation.mutate((activeTimeEntry as any).id);
    }
  };

  const clockIn = () => {
    if (activeWorkOrders.length === 0) {
      toast({
        title: "No Active Work Orders",
        description: "You need at least one active work order to track time.",
        variant: "destructive",
      });
      return;
    }
    
    if (activeWorkOrders.length === 1) {
      // If only one active work order, start tracking immediately
      startTimeMutation.mutate(activeWorkOrders[0].id);
    } else {
      // Show dialog to select work order
      setShowWorkOrderDialog(true);
    }
  };

  const handleStartTracking = () => {
    if (!selectedWorkOrderId) {
      toast({
        title: "Selection Required",
        description: "Please select a work order to track time for.",
        variant: "destructive",
      });
      return;
    }
    startTimeMutation.mutate(selectedWorkOrderId);
  };

  return (
    <>
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Today's Time</h3>
            <div className="flex items-center space-x-2">
              {activeTimeEntry && (activeTimeEntry as any).startTime && (
                <>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-lg font-bold text-green-600">
                    {formatDuration((activeTimeEntry as any).startTime)}
                  </span>
                  {(activeTimeEntry as any).workOrderTitle && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      → {(activeTimeEntry as any).workOrderTitle}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {activeTimeEntry && (activeTimeEntry as any).startTime ? formatDuration((activeTimeEntry as any).startTime) : "0h 0m"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Today's Session</p>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">0h 0m</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">This Week</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            {activeTimeEntry ? (
              <>
                <Button 
                  onClick={toggleBreak}
                  className={`flex-1 ${isOnBreak ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}`}
                >
                  <i className={`fas ${isOnBreak ? 'fa-play' : 'fa-pause'} mr-2`}></i>
                  {isOnBreak ? 'Resume Work' : 'Take Break'}
                </Button>
                <Button 
                  onClick={clockOut}
                  disabled={endTimeMutation.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <i className="fas fa-stop mr-2"></i>
                  {endTimeMutation.isPending ? 'Clocking Out...' : 'Clock Out'}
                </Button>
              </>
            ) : (
              <Button 
                onClick={clockIn}
                disabled={startTimeMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <i className="fas fa-play mr-2"></i>
                {startTimeMutation.isPending ? 'Clocking In...' : 'Clock In'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Work Order Selection Dialog */}
      <Dialog open={showWorkOrderDialog} onOpenChange={setShowWorkOrderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Work Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose which work order you want to track time for:
            </p>
            
            <Select value={selectedWorkOrderId} onValueChange={setSelectedWorkOrderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a work order..." />
              </SelectTrigger>
              <SelectContent>
                {activeWorkOrders.map((order: any) => (
                  <SelectItem key={order.id} value={order.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{order.title}</span>
                      <span className="text-xs text-gray-500">
                        Status: {order.status} • Priority: {order.priority}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowWorkOrderDialog(false);
                  setSelectedWorkOrderId("");
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleStartTracking}
                disabled={!selectedWorkOrderId || startTimeMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <i className="fas fa-play mr-2"></i>
                {startTimeMutation.isPending ? 'Starting...' : 'Start Tracking'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
