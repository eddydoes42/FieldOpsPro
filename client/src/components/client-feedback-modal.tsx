import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Star, MessageSquare, TrendingUp, Users, CheckCircle } from "lucide-react";

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  label: string;
  disabled?: boolean;
}

function StarRating({ rating, onRatingChange, label, disabled = false }: StarRatingProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Label>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !disabled && onRatingChange(star)}
            disabled={disabled}
            className={`transition-colors ${
              disabled ? 'cursor-not-allowed' : 'hover:scale-110 cursor-pointer'
            }`}
            data-testid={`star-rating-${label}-${star}`}
          >
            <Star
              className={`w-6 h-6 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

interface ClientFeedbackModalProps {
  workOrderId: string;
  workOrderTitle: string;
  fieldAgentId?: string;
  fieldAgentName?: string;
  dispatcherId?: string;
  dispatcherName?: string;
  triggerComponent?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function ClientFeedbackModal({
  workOrderId,
  workOrderTitle,
  fieldAgentId,
  fieldAgentName,
  dispatcherId,
  dispatcherName,
  triggerComponent,
  isOpen: controlledOpen,
  onClose: controlledOnClose,
}: ClientFeedbackModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInternalOpen, setIsInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'field_agent' | 'dispatcher' | 'service_rating'>('field_agent');

  const isOpen = controlledOpen !== undefined ? controlledOpen : isInternalOpen;
  const onClose = controlledOnClose || (() => setIsInternalOpen(false));

  // Field Agent Rating State
  const [fieldAgentRating, setFieldAgentRating] = useState({
    communicationRating: 0,
    timelinessRating: 0,
    workSatisfactionRating: 0,
    communicationFeedback: '',
    timelinessFeedback: '',
    workSatisfactionFeedback: '',
  });

  // Dispatcher Rating State
  const [dispatcherRating, setDispatcherRating] = useState({
    communicationRating: 0,
    managementRating: 0,
    fieldAgentRating: 0,
    communicationFeedback: '',
    managementFeedback: '',
    fieldAgentFeedback: '',
  });

  // Service Company Rating State
  const [serviceRating, setServiceRating] = useState({
    clearScopeRating: 0,
    communicationRating: 0,
    overallSatisfactionRating: 0,
    clearScopeFeedback: '',
    communicationFeedback: '',
    overallSatisfactionFeedback: '',
  });

  // Check if ratings already exist
  const { data: existingRatings } = useQuery({
    queryKey: ['/api/ratings/existing', workOrderId],
    queryFn: async () => {
      const response = await fetch(`/api/ratings/existing/${workOrderId}`);
      if (!response.ok) throw new Error('Failed to fetch existing ratings');
      return response.json();
    },
    enabled: isOpen,
  });

  // Field Agent Rating Mutation
  const fieldAgentMutation = useMutation({
    mutationFn: async (ratingData: any) => {
      return apiRequest("POST", "/api/ratings/client-field-agent", {
        workOrderId,
        ...ratingData,
      });
    },
    onSuccess: () => {
      toast({
        title: "Field Agent Rating Submitted",
        description: "Thank you for your feedback on the field agent's performance."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
      setActiveTab('dispatcher');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit field agent rating",
        description: error.message || "Could not submit rating",
        variant: "destructive",
      });
    }
  });

  // Dispatcher Rating Mutation
  const dispatcherMutation = useMutation({
    mutationFn: async (ratingData: any) => {
      return apiRequest("POST", "/api/ratings/client-dispatcher", {
        workOrderId,
        ...ratingData,
      });
    },
    onSuccess: () => {
      toast({
        title: "Dispatcher Rating Submitted",
        description: "Thank you for your feedback on the dispatcher's performance."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
      setActiveTab('service_rating');
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit dispatcher rating",
        description: error.message || "Could not submit rating",
        variant: "destructive",
      });
    }
  });

  // Service Company Rating Mutation
  const serviceMutation = useMutation({
    mutationFn: async (ratingData: any) => {
      return apiRequest("POST", "/api/ratings/service-client", {
        workOrderId,
        ...ratingData,
      });
    },
    onSuccess: () => {
      toast({
        title: "Service Company Rating Submitted",
        description: "Thank you for your comprehensive feedback. All ratings have been submitted."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
      onClose();
      resetAllRatings();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit service company rating",
        description: error.message || "Could not submit rating",
        variant: "destructive",
      });
    }
  });

  const resetAllRatings = () => {
    setFieldAgentRating({
      communicationRating: 0,
      timelinessRating: 0,
      workSatisfactionRating: 0,
      communicationFeedback: '',
      timelinessFeedback: '',
      workSatisfactionFeedback: '',
    });
    setDispatcherRating({
      communicationRating: 0,
      managementRating: 0,
      fieldAgentRating: 0,
      communicationFeedback: '',
      managementFeedback: '',
      fieldAgentFeedback: '',
    });
    setServiceRating({
      clearScopeRating: 0,
      communicationRating: 0,
      overallSatisfactionRating: 0,
      clearScopeFeedback: '',
      communicationFeedback: '',
      overallSatisfactionFeedback: '',
    });
    setActiveTab('field_agent');
  };

  const handleFieldAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fieldAgentRating.communicationRating || !fieldAgentRating.timelinessRating || !fieldAgentRating.workSatisfactionRating) {
      toast({
        title: "Incomplete rating",
        description: "Please provide ratings for all categories",
        variant: "destructive",
      });
      return;
    }

    fieldAgentMutation.mutate(fieldAgentRating);
  };

  const handleDispatcherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dispatcherRating.communicationRating || !dispatcherRating.managementRating || !dispatcherRating.fieldAgentRating) {
      toast({
        title: "Incomplete rating",
        description: "Please provide ratings for all categories",
        variant: "destructive",
      });
      return;
    }

    dispatcherMutation.mutate(dispatcherRating);
  };

  const handleServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!serviceRating.clearScopeRating || !serviceRating.communicationRating || !serviceRating.overallSatisfactionRating) {
      toast({
        title: "Incomplete rating",
        description: "Please provide ratings for all categories",
        variant: "destructive",
      });
      return;
    }

    serviceMutation.mutate(serviceRating);
  };

  const tabs = [
    { id: 'field_agent', label: 'Field Agent', icon: Users },
    { id: 'dispatcher', label: 'Dispatcher', icon: MessageSquare },
    { id: 'service_rating', label: 'Service Company', icon: TrendingUp },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'field_agent':
        return (
          <form onSubmit={handleFieldAgentSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Rate Field Agent: {fieldAgentName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  How would you rate the field agent's performance on this work order?
                </p>
              </div>

              <StarRating
                rating={fieldAgentRating.communicationRating}
                onRatingChange={(rating) => setFieldAgentRating(prev => ({ ...prev, communicationRating: rating }))}
                label="Communication"
                disabled={fieldAgentMutation.isPending}
              />
              <Textarea
                placeholder="Optional feedback about communication..."
                value={fieldAgentRating.communicationFeedback}
                onChange={(e) => setFieldAgentRating(prev => ({ ...prev, communicationFeedback: e.target.value }))}
                disabled={fieldAgentMutation.isPending}
                data-testid="textarea-communication-feedback"
              />

              <StarRating
                rating={fieldAgentRating.timelinessRating}
                onRatingChange={(rating) => setFieldAgentRating(prev => ({ ...prev, timelinessRating: rating }))}
                label="Timeliness"
                disabled={fieldAgentMutation.isPending}
              />
              <Textarea
                placeholder="Optional feedback about timeliness..."
                value={fieldAgentRating.timelinessFeedback}
                onChange={(e) => setFieldAgentRating(prev => ({ ...prev, timelinessFeedback: e.target.value }))}
                disabled={fieldAgentMutation.isPending}
                data-testid="textarea-timeliness-feedback"
              />

              <StarRating
                rating={fieldAgentRating.workSatisfactionRating}
                onRatingChange={(rating) => setFieldAgentRating(prev => ({ ...prev, workSatisfactionRating: rating }))}
                label="Work Satisfaction"
                disabled={fieldAgentMutation.isPending}
              />
              <Textarea
                placeholder="Optional feedback about work quality..."
                value={fieldAgentRating.workSatisfactionFeedback}
                onChange={(e) => setFieldAgentRating(prev => ({ ...prev, workSatisfactionFeedback: e.target.value }))}
                disabled={fieldAgentMutation.isPending}
                data-testid="textarea-work-satisfaction-feedback"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={fieldAgentMutation.isPending}
              data-testid="button-submit-field-agent-rating"
            >
              {fieldAgentMutation.isPending ? "Submitting..." : "Continue to Dispatcher Rating"}
            </Button>
          </form>
        );

      case 'dispatcher':
        return (
          <form onSubmit={handleDispatcherSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Rate Dispatcher: {dispatcherName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  How would you rate the dispatcher's management of this work order?
                </p>
              </div>

              <StarRating
                rating={dispatcherRating.communicationRating}
                onRatingChange={(rating) => setDispatcherRating(prev => ({ ...prev, communicationRating: rating }))}
                label="Communication"
                disabled={dispatcherMutation.isPending}
              />
              <Textarea
                placeholder="Optional feedback about communication..."
                value={dispatcherRating.communicationFeedback}
                onChange={(e) => setDispatcherRating(prev => ({ ...prev, communicationFeedback: e.target.value }))}
                disabled={dispatcherMutation.isPending}
                data-testid="textarea-dispatcher-communication-feedback"
              />

              <StarRating
                rating={dispatcherRating.managementRating}
                onRatingChange={(rating) => setDispatcherRating(prev => ({ ...prev, managementRating: rating }))}
                label="Project Management"
                disabled={dispatcherMutation.isPending}
              />
              <Textarea
                placeholder="Optional feedback about project management..."
                value={dispatcherRating.managementFeedback}
                onChange={(e) => setDispatcherRating(prev => ({ ...prev, managementFeedback: e.target.value }))}
                disabled={dispatcherMutation.isPending}
                data-testid="textarea-management-feedback"
              />

              <StarRating
                rating={dispatcherRating.fieldAgentRating}
                onRatingChange={(rating) => setDispatcherRating(prev => ({ ...prev, fieldAgentRating: rating }))}
                label="Field Agent Selection"
                disabled={dispatcherMutation.isPending}
              />
              <Textarea
                placeholder="Optional feedback about field agent selection..."
                value={dispatcherRating.fieldAgentFeedback}
                onChange={(e) => setDispatcherRating(prev => ({ ...prev, fieldAgentFeedback: e.target.value }))}
                disabled={dispatcherMutation.isPending}
                data-testid="textarea-field-agent-selection-feedback"
              />
            </div>

            <div className="flex space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setActiveTab('field_agent')}
                disabled={dispatcherMutation.isPending}
                data-testid="button-back-to-field-agent"
              >
                Back
              </Button>
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={dispatcherMutation.isPending}
                data-testid="button-submit-dispatcher-rating"
              >
                {dispatcherMutation.isPending ? "Submitting..." : "Continue to Service Rating"}
              </Button>
            </div>
          </form>
        );

      case 'service_rating':
        return (
          <form onSubmit={handleServiceSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Rate Service Company
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  How would you rate your overall experience with this service company?
                </p>
              </div>

              <StarRating
                rating={serviceRating.clearScopeRating}
                onRatingChange={(rating) => setServiceRating(prev => ({ ...prev, clearScopeRating: rating }))}
                label="Clear/Correct Scope"
                disabled={serviceMutation.isPending}
              />
              <Textarea
                placeholder="Optional feedback about scope clarity..."
                value={serviceRating.clearScopeFeedback}
                onChange={(e) => setServiceRating(prev => ({ ...prev, clearScopeFeedback: e.target.value }))}
                disabled={serviceMutation.isPending}
                data-testid="textarea-scope-feedback"
              />

              <StarRating
                rating={serviceRating.communicationRating}
                onRatingChange={(rating) => setServiceRating(prev => ({ ...prev, communicationRating: rating }))}
                label="Communication"
                disabled={serviceMutation.isPending}
              />
              <Textarea
                placeholder="Optional feedback about communication..."
                value={serviceRating.communicationFeedback}
                onChange={(e) => setServiceRating(prev => ({ ...prev, communicationFeedback: e.target.value }))}
                disabled={serviceMutation.isPending}
                data-testid="textarea-service-communication-feedback"
              />

              <StarRating
                rating={serviceRating.overallSatisfactionRating}
                onRatingChange={(rating) => setServiceRating(prev => ({ ...prev, overallSatisfactionRating: rating }))}
                label="Overall Satisfaction"
                disabled={serviceMutation.isPending}
              />
              <Textarea
                placeholder="Optional feedback about overall experience..."
                value={serviceRating.overallSatisfactionFeedback}
                onChange={(e) => setServiceRating(prev => ({ ...prev, overallSatisfactionFeedback: e.target.value }))}
                disabled={serviceMutation.isPending}
                data-testid="textarea-overall-satisfaction-feedback"
              />
            </div>

            <div className="flex space-x-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setActiveTab('dispatcher')}
                disabled={serviceMutation.isPending}
                data-testid="button-back-to-dispatcher"
              >
                Back
              </Button>
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={serviceMutation.isPending}
                data-testid="button-submit-service-rating"
              >
                {serviceMutation.isPending ? "Submitting..." : "Submit All Ratings"}
              </Button>
            </div>
          </form>
        );

      default:
        return null;
    }
  };

  // Check if all ratings have been submitted
  const allRatingsSubmitted = existingRatings?.fieldAgent && existingRatings?.dispatcher && existingRatings?.service;

  if (allRatingsSubmitted) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        {triggerComponent && <DialogTrigger asChild>{triggerComponent}</DialogTrigger>}
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Feedback Already Submitted</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              You have already submitted comprehensive feedback for this work order.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {triggerComponent && <DialogTrigger asChild>{triggerComponent}</DialogTrigger>}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-minimal">
        <DialogHeader>
          <DialogTitle>Client Feedback - {workOrderTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {renderTabContent()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}