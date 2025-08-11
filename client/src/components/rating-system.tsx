import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  disabled?: boolean;
}

function StarRating({ value, onChange, label, disabled = false }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`p-1 transition-colors ${disabled ? 'cursor-default' : 'cursor-pointer hover:text-yellow-400'}`}
            onMouseEnter={() => !disabled && setHoverValue(star)}
            onMouseLeave={() => !disabled && setHoverValue(0)}
            onClick={() => !disabled && onChange(star)}
            disabled={disabled}
          >
            <Star
              className={`h-6 w-6 ${
                star <= (hoverValue || value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">{value}/5</span>
      </div>
    </div>
  );
}

interface FieldAgentRatingFormProps {
  workOrderId: string;
  fieldAgentName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function FieldAgentRatingForm({ workOrderId, fieldAgentName, onClose, onSuccess }: FieldAgentRatingFormProps) {
  const [ratings, setRatings] = useState({
    communicationRating: 0,
    timelinessRating: 0,
    workSatisfactionRating: 0,
  });
  const [feedback, setFeedback] = useState({
    communicationFeedback: '',
    timelinesFeedback: '',
    workSatisfactionFeedback: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitRatingMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/ratings/client-field-agent', 'POST', data),
    onSuccess: () => {
      toast({
        title: "Rating Submitted",
        description: "Thank you for rating the field agent's performance.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (ratings.communicationRating === 0 || ratings.timelinessRating === 0 || ratings.workSatisfactionRating === 0) {
      toast({
        title: "Incomplete Rating",
        description: "Please provide ratings for all categories.",
        variant: "destructive",
      });
      return;
    }

    submitRatingMutation.mutate({
      workOrderId,
      ...ratings,
      ...feedback,
    });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Rate Field Agent: {fieldAgentName}</CardTitle>
        <CardDescription>
          Please rate the field agent's performance across the following categories (1-5 stars)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <StarRating
          value={ratings.communicationRating}
          onChange={(value) => setRatings(prev => ({ ...prev, communicationRating: value }))}
          label="Communication"
          disabled={submitRatingMutation.isPending}
        />
        <div>
          <Label htmlFor="communication-feedback" className="text-sm">Communication Feedback (Optional)</Label>
          <Textarea
            id="communication-feedback"
            placeholder="Any specific feedback about communication..."
            value={feedback.communicationFeedback}
            onChange={(e) => setFeedback(prev => ({ ...prev, communicationFeedback: e.target.value }))}
            disabled={submitRatingMutation.isPending}
            className="mt-1"
          />
        </div>

        <StarRating
          value={ratings.timelinessRating}
          onChange={(value) => setRatings(prev => ({ ...prev, timelinessRating: value }))}
          label="Timeliness"
          disabled={submitRatingMutation.isPending}
        />
        <div>
          <Label htmlFor="timeliness-feedback" className="text-sm">Timeliness Feedback (Optional)</Label>
          <Textarea
            id="timeliness-feedback"
            placeholder="Any specific feedback about timeliness..."
            value={feedback.timelinesFeedback}
            onChange={(e) => setFeedback(prev => ({ ...prev, timelinesFeedback: e.target.value }))}
            disabled={submitRatingMutation.isPending}
            className="mt-1"
          />
        </div>

        <StarRating
          value={ratings.workSatisfactionRating}
          onChange={(value) => setRatings(prev => ({ ...prev, workSatisfactionRating: value }))}
          label="Work Satisfaction"
          disabled={submitRatingMutation.isPending}
        />
        <div>
          <Label htmlFor="work-satisfaction-feedback" className="text-sm">Work Satisfaction Feedback (Optional)</Label>
          <Textarea
            id="work-satisfaction-feedback"
            placeholder="Any specific feedback about work quality..."
            value={feedback.workSatisfactionFeedback}
            onChange={(e) => setFeedback(prev => ({ ...prev, workSatisfactionFeedback: e.target.value }))}
            disabled={submitRatingMutation.isPending}
            className="mt-1"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitRatingMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitRatingMutation.isPending}
          >
            {submitRatingMutation.isPending ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface DispatcherRatingFormProps {
  workOrderId: string;
  dispatcherName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DispatcherRatingForm({ workOrderId, dispatcherName, onClose, onSuccess }: DispatcherRatingFormProps) {
  const [ratings, setRatings] = useState({
    communicationRating: 0,
    managementRating: 0,
    fieldAgentRating: 0,
  });
  const [feedback, setFeedback] = useState({
    communicationFeedback: '',
    managementFeedback: '',
    fieldAgentFeedback: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitRatingMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/ratings/client-dispatcher', 'POST', data),
    onSuccess: () => {
      toast({
        title: "Rating Submitted",
        description: "Thank you for rating the dispatcher's performance.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (ratings.communicationRating === 0 || ratings.managementRating === 0 || ratings.fieldAgentRating === 0) {
      toast({
        title: "Incomplete Rating",
        description: "Please provide ratings for all categories.",
        variant: "destructive",
      });
      return;
    }

    submitRatingMutation.mutate({
      workOrderId,
      ...ratings,
      ...feedback,
    });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Rate Dispatcher: {dispatcherName}</CardTitle>
        <CardDescription>
          Please rate the dispatcher's performance across the following categories (1-5 stars)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <StarRating
          value={ratings.communicationRating}
          onChange={(value) => setRatings(prev => ({ ...prev, communicationRating: value }))}
          label="Communication"
          disabled={submitRatingMutation.isPending}
        />
        <div>
          <Label htmlFor="communication-feedback" className="text-sm">Communication Feedback (Optional)</Label>
          <Textarea
            id="communication-feedback"
            placeholder="Any specific feedback about communication..."
            value={feedback.communicationFeedback}
            onChange={(e) => setFeedback(prev => ({ ...prev, communicationFeedback: e.target.value }))}
            disabled={submitRatingMutation.isPending}
            className="mt-1"
          />
        </div>

        <StarRating
          value={ratings.managementRating}
          onChange={(value) => setRatings(prev => ({ ...prev, managementRating: value }))}
          label="Management"
          disabled={submitRatingMutation.isPending}
        />
        <div>
          <Label htmlFor="management-feedback" className="text-sm">Management Feedback (Optional)</Label>
          <Textarea
            id="management-feedback"
            placeholder="Any specific feedback about project management..."
            value={feedback.managementFeedback}
            onChange={(e) => setFeedback(prev => ({ ...prev, managementFeedback: e.target.value }))}
            disabled={submitRatingMutation.isPending}
            className="mt-1"
          />
        </div>

        <StarRating
          value={ratings.fieldAgentRating}
          onChange={(value) => setRatings(prev => ({ ...prev, fieldAgentRating: value }))}
          label="Field Agent Coordination"
          disabled={submitRatingMutation.isPending}
        />
        <div>
          <Label htmlFor="field-agent-feedback" className="text-sm">Field Agent Coordination Feedback (Optional)</Label>
          <Textarea
            id="field-agent-feedback"
            placeholder="Any specific feedback about field agent coordination..."
            value={feedback.fieldAgentFeedback}
            onChange={(e) => setFeedback(prev => ({ ...prev, fieldAgentFeedback: e.target.value }))}
            disabled={submitRatingMutation.isPending}
            className="mt-1"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitRatingMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitRatingMutation.isPending}
          >
            {submitRatingMutation.isPending ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ClientRatingFormProps {
  workOrderId: string;
  clientName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ClientRatingForm({ workOrderId, clientName, onClose, onSuccess }: ClientRatingFormProps) {
  const [ratings, setRatings] = useState({
    communicationRating: 0,
    clearScopeRating: 0,
    overallSatisfactionRating: 0,
  });
  const [feedback, setFeedback] = useState({
    communicationFeedback: '',
    clearScopeFeedback: '',
    overallSatisfactionFeedback: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitRatingMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/ratings/service-client', 'POST', data),
    onSuccess: () => {
      toast({
        title: "Rating Submitted",
        description: "Thank you for rating the client's cooperation.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ratings'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit rating",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (ratings.communicationRating === 0 || ratings.clearScopeRating === 0 || ratings.overallSatisfactionRating === 0) {
      toast({
        title: "Incomplete Rating",
        description: "Please provide ratings for all categories.",
        variant: "destructive",
      });
      return;
    }

    submitRatingMutation.mutate({
      workOrderId,
      ...ratings,
      ...feedback,
    });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Rate Client: {clientName}</CardTitle>
        <CardDescription>
          Please rate the client's cooperation across the following categories (1-5 stars)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <StarRating
          value={ratings.communicationRating}
          onChange={(value) => setRatings(prev => ({ ...prev, communicationRating: value }))}
          label="Communication"
          disabled={submitRatingMutation.isPending}
        />
        <div>
          <Label htmlFor="communication-feedback" className="text-sm">Communication Feedback (Optional)</Label>
          <Textarea
            id="communication-feedback"
            placeholder="Any specific feedback about communication..."
            value={feedback.communicationFeedback}
            onChange={(e) => setFeedback(prev => ({ ...prev, communicationFeedback: e.target.value }))}
            disabled={submitRatingMutation.isPending}
            className="mt-1"
          />
        </div>

        <StarRating
          value={ratings.clearScopeRating}
          onChange={(value) => setRatings(prev => ({ ...prev, clearScopeRating: value }))}
          label="Clear Scope"
          disabled={submitRatingMutation.isPending}
        />
        <div>
          <Label htmlFor="clear-scope-feedback" className="text-sm">Clear Scope Feedback (Optional)</Label>
          <Textarea
            id="clear-scope-feedback"
            placeholder="Any specific feedback about project scope clarity..."
            value={feedback.clearScopeFeedback}
            onChange={(e) => setFeedback(prev => ({ ...prev, clearScopeFeedback: e.target.value }))}
            disabled={submitRatingMutation.isPending}
            className="mt-1"
          />
        </div>

        <StarRating
          value={ratings.overallSatisfactionRating}
          onChange={(value) => setRatings(prev => ({ ...prev, overallSatisfactionRating: value }))}
          label="Overall Satisfaction"
          disabled={submitRatingMutation.isPending}
        />
        <div>
          <Label htmlFor="overall-satisfaction-feedback" className="text-sm">Overall Satisfaction Feedback (Optional)</Label>
          <Textarea
            id="overall-satisfaction-feedback"
            placeholder="Any specific feedback about overall satisfaction..."
            value={feedback.overallSatisfactionFeedback}
            onChange={(e) => setFeedback(prev => ({ ...prev, overallSatisfactionFeedback: e.target.value }))}
            disabled={submitRatingMutation.isPending}
            className="mt-1"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitRatingMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitRatingMutation.isPending}
          >
            {submitRatingMutation.isPending ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface RatingDisplayProps {
  rating: number;
  totalRatings?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
}

export function RatingDisplay({ rating, totalRatings, size = 'md', showNumber = true }: RatingDisplayProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
          }`}
        />
      ))}
      {showNumber && (
        <span className={`ml-1 ${textSizeClasses[size]} text-gray-600`}>
          {rating.toFixed(1)}
          {totalRatings && ` (${totalRatings})`}
        </span>
      )}
    </div>
  );
}