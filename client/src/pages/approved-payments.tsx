import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { StashLayout } from "@/components/layout/stash-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { DollarSign, TrendingUp, Calendar, Building2, Users, FileText, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Sample data structure for different role views
interface PaymentRecord {
  id: string;
  amount: number;
  description: string;
  workOrderId?: string;
  projectId?: string;
  companyName: string;
  status: 'approved' | 'pending' | 'paid';
  approvedBy: string;
  approvedDate: string;
  paymentDate?: string;
  category: 'service_fee' | 'budget_amount' | 'field_payment' | 'project_payment';
}

// Role-based data views
const getSamplePayments = (role: string): PaymentRecord[] => {
  switch (role) {
    case 'operations_director':
      return [];
    
    case 'administrator':
    case 'project_manager':
      return [
        {
          id: 'BA-001',
          amount: 15000.00,
          description: 'Project Budget - Office Network Upgrade',
          projectId: 'PRJ-456',
          companyName: 'GlobalTech Industries',
          status: 'approved',
          approvedBy: 'John Smith (Admin)',
          approvedDate: '2024-01-20',
          category: 'budget_amount'
        },
        {
          id: 'BA-002',
          amount: 8500.00,
          description: 'Budget Allocation - Security Implementation',
          workOrderId: 'WO-125',
          companyName: 'SecureNet LLC',
          status: 'paid',
          approvedBy: 'Sarah Johnson (PM)',
          approvedDate: '2024-01-17',
          paymentDate: '2024-01-19',
          category: 'budget_amount'
        }
      ];
    
    case 'manager':
      return [
        {
          id: 'MP-001',
          amount: 3200.00,
          description: 'Team Payment - Server Maintenance',
          workOrderId: 'WO-126',
          companyName: 'CloudFirst Solutions',
          status: 'approved',
          approvedBy: 'Mike Davis (Admin)',
          approvedDate: '2024-01-19',
          category: 'field_payment'
        },
        {
          id: 'MP-002',
          amount: 2800.00,
          description: 'Field Work Payment - Network Troubleshooting',
          workOrderId: 'WO-127',
          companyName: 'NetworkPro Inc',
          status: 'paid',
          approvedBy: 'Lisa Chen (PM)',
          approvedDate: '2024-01-16',
          paymentDate: '2024-01-18',
          category: 'field_payment'
        }
      ];
    
    case 'dispatcher':
    case 'field_engineer':
    case 'field_agent':
      return [
        {
          id: 'FP-001',
          amount: 850.00,
          description: 'Field Assignment - Router Configuration',
          workOrderId: 'WO-128',
          companyName: 'TechNet Services',
          status: 'approved',
          approvedBy: 'Tom Wilson (Manager)',
          approvedDate: '2024-01-21',
          category: 'field_payment'
        },
        {
          id: 'FP-002',
          amount: 1200.00,
          description: 'Installation Payment - Firewall Setup',
          workOrderId: 'WO-129',
          companyName: 'CyberShield Corp',
          status: 'paid',
          approvedBy: 'Maria Garcia (Manager)',
          approvedDate: '2024-01-17',
          paymentDate: '2024-01-20',
          category: 'field_payment'
        }
      ];
    
    default:
      return [];
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'approved':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'service_fee':
      return <Building2 className="h-4 w-4" />;
    case 'budget_amount':
      return <TrendingUp className="h-4 w-4" />;
    case 'field_payment':
      return <Users className="h-4 w-4" />;
    case 'project_payment':
      return <FileText className="h-4 w-4" />;
    default:
      return <DollarSign className="h-4 w-4" />;
  }
};

export default function ApprovedPayments() {
  const { user } = useAuth();
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Get effective role for role testing
  const getEffectiveRole = () => {
    const permanentRole = localStorage.getItem('selectedRole');
    const testingRole = localStorage.getItem('testingRole');
    if (permanentRole) return permanentRole;
    if (testingRole) return testingRole;
    return (user as any)?.roles?.[0] || 'field_agent';
  };

  const effectiveRole = getEffectiveRole();
  const payments = getSamplePayments(effectiveRole);

  const handleViewDetails = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setIsDialogOpen(true);
  };

  const getTotalAmount = () => {
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getPaidAmount = () => {
    return payments
      .filter(payment => payment.status === 'paid')
      .reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getApprovedAmount = () => {
    return payments
      .filter(payment => payment.status === 'approved')
      .reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getRoleBasedTitle = () => {
    switch (effectiveRole) {
      case 'operations_director':
        return 'Service Fee Payments';
      case 'administrator':
      case 'project_manager':
        return 'Budget Allocations';
      case 'manager':
        return 'Team Payments';
      case 'dispatcher':
      case 'field_engineer':
      case 'field_agent':
        return 'Field Payments';
      default:
        return 'Approved Payments';
    }
  };

  const getRoleBasedDescription = () => {
    switch (effectiveRole) {
      case 'operations_director':
        return 'Service fees collected from client companies for completed work orders and projects.';
      case 'administrator':
      case 'project_manager':
        return 'Budget amounts approved for work orders and project execution.';
      case 'manager':
        return 'Payment amounts approved by administrators and project managers for your team.';
      case 'dispatcher':
      case 'field_engineer':
      case 'field_agent':
        return 'Payment amounts approved by managers for your field work.';
      default:
        return 'View your approved payment records and status.';
    }
  };

  return (
    <StashLayout>
      <div className="container mx-auto px-4 py-6 space-y-6" data-testid="approved-payments-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2" data-testid="page-title">
              <DollarSign className="h-6 w-6 text-green-600" />
              {getRoleBasedTitle()}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1" data-testid="page-description">
              {getRoleBasedDescription()}
            </p>
          </div>
          <Badge variant="outline" className="text-sm" data-testid="role-badge">
            {effectiveRole.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card data-testid="total-amount-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="total-amount">
                ${getTotalAmount().toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                All approved payments
              </p>
            </CardContent>
          </Card>

          <Card data-testid="paid-amount-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="paid-amount">
                ${getPaidAmount().toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Successfully paid
              </p>
            </CardContent>
          </Card>

          <Card data-testid="pending-amount-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Pending</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" data-testid="pending-amount">
                ${getApprovedAmount().toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting payment
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payments List */}
        <Card data-testid="payments-list-card">
          <CardHeader>
            <CardTitle>Payment Records</CardTitle>
            <CardDescription>
              View detailed payment information and status updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-8" data-testid="no-payments-message">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No approved payments found.</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Payments will appear here once work orders are completed and approved.
                </p>
              </div>
            ) : (
              <div className="space-y-4" data-testid="payments-list">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    data-testid={`payment-item-${payment.id}`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          {getCategoryIcon(payment.category)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {payment.description}
                          </p>
                          <Badge className={cn("text-xs", getStatusColor(payment.status))}>
                            {payment.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>{payment.companyName}</span>
                          {payment.workOrderId && (
                            <span>WO: {payment.workOrderId}</span>
                          )}
                          {payment.projectId && (
                            <span>Project: {payment.projectId}</span>
                          )}
                          <span>Approved: {new Date(payment.approvedDate).toLocaleDateString()}</span>
                          {payment.paymentDate && (
                            <span>Paid: {new Date(payment.paymentDate).toLocaleDateString()}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Approved by: {payment.approvedBy}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          ${payment.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {payment.id}
                        </p>
                      </div>
                      {payment.status === 'approved' && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleViewDetails(payment)}
                          data-testid={`view-details-${payment.id}`}
                        >
                          View Details
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md max-h-[85vh] overflow-y-auto mx-auto">
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
              <DialogDescription>
                Complete information for payment {selectedPayment?.id}
              </DialogDescription>
            </DialogHeader>
            
            {selectedPayment && (
              <div className="space-y-4">
                {/* Payment Amount */}
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    ${selectedPayment.amount.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Payment Amount
                  </p>
                </div>

                {/* Payment Info */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {selectedPayment.description}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Company
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {selectedPayment.companyName}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Payment ID
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">
                        {selectedPayment.id}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Status
                      </label>
                      <Badge className={cn("text-xs mt-1", getStatusColor(selectedPayment.status))}>
                        {selectedPayment.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {selectedPayment.workOrderId && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Work Order
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">
                        {selectedPayment.workOrderId}
                      </p>
                    </div>
                  )}

                  {selectedPayment.projectId && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Project
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">
                        {selectedPayment.projectId}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Approved By
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {selectedPayment.approvedBy}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Approved Date
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">
                        {new Date(selectedPayment.approvedDate).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedPayment.paymentDate && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Payment Date
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">
                          {new Date(selectedPayment.paymentDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Category
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      {getCategoryIcon(selectedPayment.category)}
                      <p className="text-sm text-gray-900 dark:text-white">
                        {selectedPayment.category.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </StashLayout>
  );
}