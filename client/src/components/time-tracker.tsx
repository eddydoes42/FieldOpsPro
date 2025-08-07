import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TimeTrackerProps {
  activeTimeEntry?: any;
}

export default function TimeTracker({ activeTimeEntry }: TimeTrackerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnBreak, setIsOnBreak] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const startTimeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/time-entries", {
        startTime: new Date().toISOString(),
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
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
      await apiRequest("PATCH", `/api/time-entries/${timeEntryId}/end`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
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
    if (activeTimeEntry) {
      endTimeMutation.mutate(activeTimeEntry.id);
    }
  };

  const clockIn = () => {
    startTimeMutation.mutate();
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Today's Time</h3>
          <div className="flex items-center space-x-2">
            {activeTimeEntry && (
              <>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-lg font-bold text-green-600">
                  {formatDuration(activeTimeEntry.startTime)}
                </span>
              </>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">
              {activeTimeEntry ? formatDuration(activeTimeEntry.startTime) : "0h 0m"}
            </p>
            <p className="text-sm text-gray-600">Today's Session</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">0h 0m</p>
            <p className="text-sm text-gray-600">This Week</p>
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
  );
}
