import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Clock, DollarSign, User, MessageSquare } from "lucide-react";

interface WorkOrder {
  id: string;
  title: string;
  description: string;
  location: string;
  priority: string;
  estimatedHours: number;
  hourlyRate: number;
  status: string;
  assignedTo?: string;
  createdBy: string;
  companyId: string;
  createdAt: string;
}

interface JobRequestDialogProps {
  workOrder: WorkOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function JobRequestDialog({ workOrder, isOpen, onClose }: JobRequestDialogProps) {
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createJobRequestMutation = useMutation({
    mutationFn: async (data: { workOrderId: string; message?: string }) => {
      const response = await fetch('/api/job-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create job request');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/job-requests'] });
      toast({
        title: "Job Request Submitted",
        description: "Your request has been sent to the admin team for review.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit job request",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!workOrder) return;
    
    createJobRequestMutation.mutate({
      workOrderId: workOrder.id,
      message: message.trim() || undefined,
    });
  };

  const handleClose = () => {
    setMessage("");
    onClose();
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      urgent: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
    };
    return (
      <Badge className={colors[priority as keyof typeof colors] || colors.medium}>
        {priority}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (!workOrder) return null;

  const totalPay = workOrder.estimatedHours * workOrder.hourlyRate;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-500" />
            Request Job Assignment
          </DialogTitle>
          <DialogDescription>
            Submit a request to be assigned to this work order. The admin team will review and respond to your request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Work Order Details */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-lg">{workOrder.title}</h3>
              {getPriorityBadge(workOrder.priority)}
            </div>
            
            <p className="text-sm text-muted-foreground">{workOrder.description}</p>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{workOrder.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{workOrder.estimatedHours} hours</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>{formatCurrency(workOrder.hourlyRate)}/hour</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-600">
                  Total: {formatCurrency(totalPay)}
                </span>
              </div>
            </div>
          </div>

          {/* Request Message */}
          <div className="space-y-2">
            <Label htmlFor="requestMessage" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Message to Admin Team (Optional)
            </Label>
            <Textarea
              id="requestMessage"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Why are you interested in this job? Any relevant experience or questions..."
              className="min-h-[100px]"
              data-testid="textarea-job-request-message"
            />
            <p className="text-xs text-muted-foreground">
              Let the admin team know why you're the right person for this job.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-2 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={createJobRequestMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createJobRequestMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-submit-job-request"
            >
              {createJobRequestMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}