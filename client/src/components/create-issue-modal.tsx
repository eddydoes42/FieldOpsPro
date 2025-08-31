import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, Upload, X } from "lucide-react";

interface CreateIssueModalProps {
  workOrderId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateIssueModal({ workOrderId, isOpen, onClose }: CreateIssueModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    type: '',
    description: '',
    severity: 'low',
    attachments: [] as string[],
  });

  const createIssueMutation = useMutation({
    mutationFn: async (issueData: any) => {
      return apiRequest("POST", "/api/structured-issues", issueData);
    },
    onSuccess: () => {
      toast({ 
        title: "Issue created successfully",
        description: "Your issue report has been submitted and will be reviewed by the admin team."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/structured-issues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/structured-issues', workOrderId] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create issue",
        description: error.message || "Could not submit issue report",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      type: '',
      description: '',
      severity: 'low',
      attachments: [],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.description) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createIssueMutation.mutate({
      workOrderId,
      type: formData.type,
      description: formData.description,
      severity: formData.severity,
      attachments: formData.attachments,
    });
  };

  const handleClose = () => {
    if (!createIssueMutation.isPending) {
      onClose();
      resetForm();
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getSeverityDescription = (severity: string) => {
    switch (severity) {
      case 'high': return 'Requires immediate attention from management';
      case 'medium': return 'Needs review within 24 hours';
      case 'low': return 'Standard review process';
      default: return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto scrollbar-minimal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Create Issue Report
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="form-minimal">
          {/* Issue Type */}
          <div>
            <Label htmlFor="issue-type" className="form-label-minimal">Issue Type *</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData({ ...formData, type: value })}
              data-testid="select-issue-type"
            >
              <SelectTrigger className="form-select-minimal">
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hazard">Safety Hazard</SelectItem>
                <SelectItem value="delay">Schedule Delay</SelectItem>
                <SelectItem value="equipment">Equipment Issue</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Severity Level */}
          <div>
            <Label htmlFor="severity" className="form-label-minimal">Severity Level *</Label>
            <Select 
              value={formData.severity} 
              onValueChange={(value) => setFormData({ ...formData, severity: value })}
              data-testid="select-severity"
            >
              <SelectTrigger className="form-select-minimal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
              </SelectContent>
            </Select>
            {formData.severity && (
              <p className={`text-xs ${getSeverityColor(formData.severity)}`}>
                {getSeverityDescription(formData.severity)}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="form-label-minimal">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the issue in detail..."
              className="form-textarea-minimal"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              required
              data-testid="textarea-description"
            />
          </div>

          {/* File Upload Note */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <Upload className="w-4 h-4" />
              <span>Attach photos or documents by uploading them in the job messages thread.</span>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createIssueMutation.isPending}
              className="form-button-secondary-minimal"
              data-testid="button-cancel-issue"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createIssueMutation.isPending}
              className="form-button-primary-minimal"
              data-testid="button-submit-issue"
            >
              {createIssueMutation.isPending ? "Creating..." : "Create Issue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}