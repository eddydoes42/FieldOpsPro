import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Star, Send, MessageSquare, Users, TrendingUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface WorkOrder {
  id: string;
  title: string;
  assignee?: {
    firstName: string;
    lastName: string;
  };
  createdBy?: {
    firstName: string;
    lastName: string;
  };
}

interface ClientRatingData {
  administrationRating: number;
  fieldTeamRating: number;
  overallRating: number;
  administrationFeedback?: string;
  fieldTeamFeedback?: string;
  overallFeedback?: string;
}

interface ServiceRatingData {
  communicationRating: number;
  requirementsClarityRating: number;
  paymentRating: number;
  communicationFeedback?: string;
  requirementsFeedback?: string;
  paymentFeedback?: string;
}

interface RatingSystemProps {
  workOrder: WorkOrder;
  isOpen: boolean;
  onClose: () => void;
}

const StarRating = ({ rating, onRatingChange, readOnly = false }: {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-6 w-6 cursor-pointer transition-colors ${
            star <= (hoverRating || rating)
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300 dark:text-gray-600"
          } ${readOnly ? "cursor-default" : "hover:scale-110"}`}
          onClick={() => !readOnly && onRatingChange?.(star)}
          onMouseEnter={() => !readOnly && setHoverRating(star)}
          onMouseLeave={() => !readOnly && setHoverRating(0)}
        />
      ))}
      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
        {rating > 0 ? `${rating}/5` : "Not rated"}
      </span>
    </div>
  );
};

export default function RatingSystem({ workOrder, isOpen, onClose }: RatingSystemProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Client rating service company state
  const [clientRating, setClientRating] = useState<ClientRatingData>({
    administrationRating: 0,
    fieldTeamRating: 0,
    overallRating: 0,
    administrationFeedback: "",
    fieldTeamFeedback: "",
    overallFeedback: ""
  });

  // Service company rating client state
  const [serviceRating, setServiceRating] = useState<ServiceRatingData>({
    communicationRating: 0,
    requirementsClarityRating: 0,
    paymentRating: 0,
    communicationFeedback: "",
    requirementsFeedback: "",
    paymentFeedback: ""
  });

  // Determine if user is client or service company
  const userRoles = (user as any)?.roles || [];
  const isClient = userRoles.includes('client');
  const ratingType = isClient ? 'client' : 'service';

  const submitRatingMutation = useMutation({
    mutationFn: async () => {
      const endpoint = ratingType === 'client' 
        ? '/api/ratings/client-service'
        : '/api/ratings/service-client';
      
      const data = ratingType === 'client' ? {
        workOrderId: workOrder.id,
        ...clientRating
      } : {
        workOrderId: workOrder.id,
        ...serviceRating
      };

      const response = await apiRequest("POST", endpoint, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Rating Submitted",
        description: "Thank you for your feedback!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to submit rating. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isFormValid = () => {
    if (ratingType === 'client') {
      return clientRating.administrationRating > 0 && 
             clientRating.fieldTeamRating > 0 && 
             clientRating.overallRating > 0;
    } else {
      return serviceRating.communicationRating > 0 && 
             serviceRating.requirementsClarityRating > 0 && 
             serviceRating.paymentRating > 0;
    }
  };

  const handleSubmit = () => {
    if (isFormValid()) {
      submitRatingMutation.mutate();
    }
  };

  const renderClientRatingForm = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Rate Our Service
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please rate your experience for work order: <strong>{workOrder.title}</strong>
        </p>
      </div>

      {/* Administration Rating */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-blue-600" />
            Administration (Management & Dispatch)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StarRating
            rating={clientRating.administrationRating}
            onRatingChange={(rating) => setClientRating(prev => ({ ...prev, administrationRating: rating }))}
          />
          <Textarea
            placeholder="Optional feedback about management and dispatch coordination..."
            value={clientRating.administrationFeedback}
            onChange={(e) => setClientRating(prev => ({ ...prev, administrationFeedback: e.target.value }))}
            className="min-h-[60px]"
          />
        </CardContent>
      </Card>

      {/* Field Team Rating */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5 text-green-600" />
            Field Team (Technicians)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StarRating
            rating={clientRating.fieldTeamRating}
            onRatingChange={(rating) => setClientRating(prev => ({ ...prev, fieldTeamRating: rating }))}
          />
          <Textarea
            placeholder="Optional feedback about field technician performance..."
            value={clientRating.fieldTeamFeedback}
            onChange={(e) => setClientRating(prev => ({ ...prev, fieldTeamFeedback: e.target.value }))}
            className="min-h-[60px]"
          />
        </CardContent>
      </Card>

      {/* Overall Rating */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Overall Satisfaction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StarRating
            rating={clientRating.overallRating}
            onRatingChange={(rating) => setClientRating(prev => ({ ...prev, overallRating: rating }))}
          />
          <Textarea
            placeholder="Optional overall feedback about our service..."
            value={clientRating.overallFeedback}
            onChange={(e) => setClientRating(prev => ({ ...prev, overallFeedback: e.target.value }))}
            className="min-h-[60px]"
          />
        </CardContent>
      </Card>
    </div>
  );

  const renderServiceRatingForm = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Rate Client Experience
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please rate the client for work order: <strong>{workOrder.title}</strong>
        </p>
      </div>

      {/* Communication Rating */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Communication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StarRating
            rating={serviceRating.communicationRating}
            onRatingChange={(rating) => setServiceRating(prev => ({ ...prev, communicationRating: rating }))}
          />
          <Textarea
            placeholder="Optional feedback about client communication..."
            value={serviceRating.communicationFeedback}
            onChange={(e) => setServiceRating(prev => ({ ...prev, communicationFeedback: e.target.value }))}
            className="min-h-[60px]"
          />
        </CardContent>
      </Card>

      {/* Requirements Clarity Rating */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-green-600" />
            Requirements Clarity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StarRating
            rating={serviceRating.requirementsClarityRating}
            onRatingChange={(rating) => setServiceRating(prev => ({ ...prev, requirementsClarityRating: rating }))}
          />
          <Textarea
            placeholder="Optional feedback about requirement clarity..."
            value={serviceRating.requirementsFeedback}
            onChange={(e) => setServiceRating(prev => ({ ...prev, requirementsFeedback: e.target.value }))}
            className="min-h-[60px]"
          />
        </CardContent>
      </Card>

      {/* Payment Rating */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Payment Promptness
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StarRating
            rating={serviceRating.paymentRating}
            onRatingChange={(rating) => setServiceRating(prev => ({ ...prev, paymentRating: rating }))}
          />
          <Textarea
            placeholder="Optional feedback about payment process..."
            value={serviceRating.paymentFeedback}
            onChange={(e) => setServiceRating(prev => ({ ...prev, paymentFeedback: e.target.value }))}
            className="min-h-[60px]"
          />
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            {ratingType === 'client' ? 'Service Rating' : 'Client Rating'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {ratingType === 'client' ? renderClientRatingForm() : renderServiceRatingForm()}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Skip for Now
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isFormValid() || submitRatingMutation.isPending}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {submitRatingMutation.isPending ? "Submitting..." : "Submit Rating"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}