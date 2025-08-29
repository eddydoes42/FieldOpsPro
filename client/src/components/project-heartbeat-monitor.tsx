import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Activity, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ProjectHeartbeatMonitorProps {
  workOrderId: string;
  projectTitle: string;
  isVisible?: boolean;
}

interface HeartbeatEvent {
  id: string;
  eventType: string;
  eventData: any;
  impact: 'positive' | 'neutral' | 'negative';
  healthScoreChange: number;
  createdAt: string;
  triggeredBy?: string;
  automaticEvent: boolean;
  notes?: string;
}

interface ProjectHeartbeat {
  id: string;
  workOrderId: string;
  currentBpm: number;
  healthScore: number;
  projectStatus: string;
  lastActivity: string;
  lastHealthCheck: string;
  monitoringEnabled: boolean;
  escalationCount: number;
  failureThreshold: number;
  baselineBpm: number;
}

export default function ProjectHeartbeatMonitor({ 
  workOrderId, 
  projectTitle, 
  isVisible = true 
}: ProjectHeartbeatMonitorProps) {
  const [currentBpm, setCurrentBpm] = useState(70); // Baseline BPM
  const [isFlatlining, setIsFlatlining] = useState(false);
  const [recentEvents, setRecentEvents] = useState<HeartbeatEvent[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch project heartbeat data
  const { data: heartbeat, isLoading } = useQuery<ProjectHeartbeat>({
    queryKey: [`/api/project-heartbeat/${workOrderId}`],
    enabled: isVisible && !!workOrderId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent heartbeat events
  const { data: events = [] } = useQuery<HeartbeatEvent[]>({
    queryKey: [`/api/project-heartbeat/${heartbeat?.id}/events`],
    enabled: !!heartbeat?.id,
    refetchInterval: 30000,
  });

  // Update local state when heartbeat data changes
  useEffect(() => {
    if (heartbeat) {
      const newBpm = calculateBpmFromHealthScore(heartbeat.healthScore);
      setCurrentBpm(newBpm);
      setIsFlatlining(newBpm >= 180);
      setRecentEvents(events.slice(0, 5)); // Last 5 events
    }
  }, [heartbeat, events]);

  // Calculate BPM based on health score
  const calculateBpmFromHealthScore = (healthScore: number): number => {
    // Baseline: 70 BPM at 100% health
    // Failure: 180 BPM at 0% health
    const baselineBpm = 70;
    const maxBpm = 180;
    const bpm = baselineBpm + ((100 - healthScore) * (maxBpm - baselineBpm) / 100);
    return Math.min(Math.max(Math.round(bpm), baselineBpm), maxBpm);
  };

  // Get BPM color based on thresholds
  const getBpmColor = (bpm: number): string => {
    if (bpm >= 180) return '#FF0000'; // Red - Flatline
    if (bpm >= 171) return '#FF4444'; // Red
    if (bpm >= 131) return '#FF8800'; // Orange
    if (bpm >= 91) return '#FFAA00'; // Yellow
    return '#00AA00'; // Green
  };

  // Get BPM status text
  const getBpmStatus = (bpm: number): string => {
    if (bpm >= 180) return 'CRITICAL - PROJECT FAILED';
    if (bpm >= 171) return 'CRITICAL';
    if (bpm >= 131) return 'HIGH STRESS';
    if (bpm >= 91) return 'ELEVATED';
    return 'HEALTHY';
  };

  // EKG Animation
  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerY = canvas.height / 2;
      const amplitude = isFlatlining ? 2 : Math.min(40, (currentBpm - 70) * 0.8 + 20);
      const frequency = currentBpm / 60; // Beats per second
      const waveSpeed = 2;
      
      ctx.strokeStyle = getBpmColor(currentBpm);
      ctx.lineWidth = isFlatlining ? 1 : 2;
      ctx.beginPath();

      if (isFlatlining) {
        // Flatline animation
        ctx.moveTo(0, centerY);
        ctx.lineTo(canvas.width, centerY);
        // Add occasional spikes to show it's still monitoring
        if (Math.random() < 0.02) {
          const x = Math.random() * canvas.width;
          ctx.moveTo(x, centerY);
          ctx.lineTo(x, centerY - 5);
          ctx.lineTo(x + 2, centerY + 5);
          ctx.lineTo(x + 4, centerY);
        }
      } else {
        // EKG heartbeat pattern
        for (let x = 0; x < canvas.width; x++) {
          const time = (timeRef.current + x) * 0.02;
          let y = centerY;
          
          // Create EKG-style heartbeat pattern
          const heartbeatPhase = (time * frequency) % 1;
          
          if (heartbeatPhase < 0.1) {
            // P wave (small bump)
            y += Math.sin(heartbeatPhase * 20 * Math.PI) * amplitude * 0.2;
          } else if (heartbeatPhase < 0.3) {
            // QRS complex (sharp spike)
            if (heartbeatPhase < 0.15) {
              y -= (heartbeatPhase - 0.1) * amplitude * 20; // Q dip
            } else if (heartbeatPhase < 0.2) {
              y += (heartbeatPhase - 0.15) * amplitude * 40; // R spike
            } else {
              y -= (heartbeatPhase - 0.2) * amplitude * 30; // S dip
            }
          } else if (heartbeatPhase < 0.5) {
            // T wave (medium bump)
            const tPhase = (heartbeatPhase - 0.3) / 0.2;
            y += Math.sin(tPhase * Math.PI) * amplitude * 0.3;
          }
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      
      ctx.stroke();
      
      timeRef.current += waveSpeed;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentBpm, isFlatlining, isVisible]);

  // Trigger heartbeat event mutation
  const triggerEventMutation = useMutation({
    mutationFn: async (eventData: { eventType: string; eventData: any }) => {
      return apiRequest('POST', '/api/project-heartbeat/event', {
        workOrderId,
        ...eventData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/project-heartbeat/${workOrderId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/project-heartbeat/${heartbeat?.id}/events`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to trigger heartbeat event",
        variant: "destructive",
      });
    },
  });

  // Manual event triggers for testing
  const triggerCheckIn = () => {
    triggerEventMutation.mutate({
      eventType: 'check_in',
      eventData: { type: 'manual_checkin', timestamp: new Date().toISOString() }
    });
  };

  const triggerIssue = () => {
    triggerEventMutation.mutate({
      eventType: 'issue_reported',
      eventData: { severity: 'high', description: 'Manual test issue' }
    });
  };

  if (!isVisible) return null;

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-red-500" />
            <span>Project Heartbeat Monitor</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-red-500" />
            <span>Project Heartbeat Monitor</span>
          </div>
          <Badge 
            variant={isFlatlining ? "destructive" : currentBpm >= 131 ? "destructive" : currentBpm >= 91 ? "default" : "secondary"}
            className="font-mono text-lg px-3 py-1"
          >
            {currentBpm} BPM
          </Badge>
        </CardTitle>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {projectTitle}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* EKG Display */}
        <div className="bg-black rounded-lg p-4 relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={120}
            className="w-full h-24 block"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="absolute top-2 left-2 text-green-400 font-mono text-xs">
            EKG MONITOR
          </div>
          <div className="absolute top-2 right-2 text-white font-mono text-xs">
            {getBpmStatus(currentBpm)}
          </div>
        </div>

        {/* Health Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: getBpmColor(currentBpm) }}>
              {heartbeat?.healthScore || 100}%
            </div>
            <div className="text-xs text-gray-500">Health Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {heartbeat?.escalationCount || 0}
            </div>
            <div className="text-xs text-gray-500">Active Issues</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {heartbeat?.baselineBpm || 70}
            </div>
            <div className="text-xs text-gray-500">Baseline BPM</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {heartbeat?.failureThreshold || 180}
            </div>
            <div className="text-xs text-gray-500">Failure BPM</div>
          </div>
        </div>

        {/* Recent Events */}
        <div>
          <h4 className="font-semibold mb-2 flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Recent Events</span>
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {recentEvents.length > 0 ? recentEvents.map((event) => (
              <div key={event.id} className="flex items-center space-x-2 text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                {event.impact === 'positive' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : event.impact === 'negative' ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <Clock className="h-4 w-4 text-gray-500" />
                )}
                <span className="flex-1">{event.eventType.replace('_', ' ').toUpperCase()}</span>
                <span className={`font-mono text-xs ${
                  event.healthScoreChange > 0 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {event.healthScoreChange > 0 ? '+' : ''}{event.healthScoreChange} BPM
                </span>
              </div>
            )) : (
              <div className="text-sm text-gray-500 text-center py-4">
                No recent events
              </div>
            )}
          </div>
        </div>

        {/* Manual Controls (for testing) */}
        <div className="flex space-x-2 pt-2 border-t">
          <Button size="sm" onClick={triggerCheckIn} disabled={triggerEventMutation.isPending}>
            <CheckCircle className="h-3 w-3 mr-1" />
            Check In
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={triggerIssue} 
            disabled={triggerEventMutation.isPending}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Report Issue
          </Button>
        </div>

        {/* Status Messages */}
        {isFlatlining && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <div className="font-semibold text-red-800 dark:text-red-200">
                  Project Critical Failure
                </div>
                <div className="text-sm text-red-600 dark:text-red-300">
                  Automatic review initiated. Service company members rated 3★ by default.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}