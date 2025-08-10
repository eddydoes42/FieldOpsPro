import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface WorkOrder {
  id: string;
  status: string;
  workStatus?: string;
  title: string;
  assignee?: {
    firstName: string;
    lastName: string;
  };
  createdBy?: {
    firstName: string;
    lastName: string;
  };
  isClientCreated?: boolean;
}

interface UseRatingTriggerProps {
  workOrders: WorkOrder[];
}

interface RatingTrigger {
  workOrder: WorkOrder;
  ratingType: 'client' | 'service';
}

export function useRatingTrigger({ workOrders }: UseRatingTriggerProps) {
  const { user } = useAuth();
  const [ratingTrigger, setRatingTrigger] = useState<RatingTrigger | null>(null);
  const [completedOrders, setCompletedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Check if any work orders have been completed that weren't completed before
    const newlyCompletedOrders = workOrders.filter(order => 
      order.status === 'completed' && 
      (order.workStatus === 'completed' || !order.workStatus) &&
      !completedOrders.has(order.id)
    );

    if (newlyCompletedOrders.length > 0) {
      // Update the set of completed orders
      setCompletedOrders(prev => new Set([...prev, ...newlyCompletedOrders.map(o => o.id)]));

      // Determine which type of rating to show
      const orderToRate = newlyCompletedOrders[0]; // Rate the first completed order
      
      const userRoles = (user as any)?.roles || [];
      const isClient = userRoles.includes('client');
      const isServiceCompanyUser = userRoles.some((role: string) => 
        ['administrator', 'manager', 'dispatcher', 'field_agent'].includes(role)
      );

      if (isClient && orderToRate.isClientCreated) {
        // Client rating service company for their own work order
        setRatingTrigger({
          workOrder: orderToRate,
          ratingType: 'client'
        });
      } else if (isServiceCompanyUser && orderToRate.isClientCreated) {
        // Service company user rating client for client-created work order
        setRatingTrigger({
          workOrder: orderToRate,
          ratingType: 'service'
        });
      }
    }
  }, [workOrders, completedOrders, user]);

  const closeRatingDialog = () => {
    setRatingTrigger(null);
  };

  return {
    ratingTrigger,
    closeRatingDialog,
    isRatingDialogOpen: !!ratingTrigger
  };
}