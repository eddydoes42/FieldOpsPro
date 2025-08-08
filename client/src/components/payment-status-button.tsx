import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Clock, CheckCircle, Receipt } from "lucide-react";

interface PaymentStatusButtonProps {
  workOrder: {
    id: string;
    status: string;
    paymentStatus?: string | null;
  };
  isAdmin: boolean;
  onUpdatePaymentStatus: (workOrderId: string, paymentStatus: string) => void;
  isLoading?: boolean;
}

export default function PaymentStatusButton({ 
  workOrder, 
  isAdmin, 
  onUpdatePaymentStatus, 
  isLoading = false 
}: PaymentStatusButtonProps) {
  // Only show for completed work orders
  if (workOrder.status !== 'completed') {
    return null;
  }

  // Get the next payment status based on current status
  const getNextPaymentStatus = (currentStatus: string | null) => {
    switch (currentStatus) {
      case null:
      case undefined:
        return 'pending_payment';
      case 'pending_payment':
        return 'payment_approved';
      case 'payment_approved':
        return 'payment_received';
      case 'payment_received':
        return 'paid';
      default:
        return null;
    }
  };

  // Get button text based on current status
  const getButtonText = (currentStatus: string | null) => {
    switch (currentStatus) {
      case null:
      case undefined:
        return 'Pending Payment';
      case 'pending_payment':
        return 'Payment Approved';
      case 'payment_approved':
        return 'Payment Received';
      case 'payment_received':
        return 'Paid';
      default:
        return 'Paid';
    }
  };

  // Get button icon based on current status
  const getButtonIcon = (currentStatus: string | null) => {
    switch (currentStatus) {
      case null:
      case undefined:
        return <DollarSign className="h-4 w-4" />;
      case 'pending_payment':
        return <Clock className="h-4 w-4" />;
      case 'payment_approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'payment_received':
        return <Receipt className="h-4 w-4" />;
      default:
        return <Receipt className="h-4 w-4" />;
    }
  };

  // Get button color based on current status
  const getButtonVariant = (currentStatus: string | null) => {
    switch (currentStatus) {
      case null:
      case undefined:
        return 'outline';
      case 'pending_payment':
        return 'secondary';
      case 'payment_approved':
        return 'default';
      case 'payment_received':
        return 'default';
      default:
        return 'outline';
    }
  };

  // Get badge color for payment status
  const getBadgeColor = (currentStatus: string | null) => {
    switch (currentStatus) {
      case null:
      case undefined:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'payment_approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'payment_received':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const currentStatus = workOrder.paymentStatus || null;
  const nextStatus = getNextPaymentStatus(currentStatus);
  const buttonText = getButtonText(currentStatus);
  const buttonIcon = getButtonIcon(currentStatus);
  const buttonVariant = getButtonVariant(currentStatus) as "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;

  // If payment is complete, show a badge instead of button
  if (currentStatus === 'paid') {
    return (
      <Badge className={getBadgeColor(currentStatus)}>
        <Receipt className="h-3 w-3 mr-1" />
        Paid
      </Badge>
    );
  }

  // Only admins can update payment status
  if (!isAdmin) {
    // Show current status as a badge for non-admins
    return (
      <Badge className={getBadgeColor(currentStatus)}>
        {buttonIcon}
        <span className="ml-1">{buttonText}</span>
      </Badge>
    );
  }

  const handleClick = () => {
    if (nextStatus) {
      onUpdatePaymentStatus(workOrder.id, nextStatus);
    }
  };

  return (
    <Button
      variant={buttonVariant}
      size="sm"
      onClick={handleClick}
      disabled={isLoading || !nextStatus}
      className="flex items-center gap-2"
    >
      {buttonIcon}
      {buttonText}
    </Button>
  );
}