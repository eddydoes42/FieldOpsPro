import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  User, 
  CheckCircle, 
  CheckCircle2, 
  Car, 
  Wrench, 
  DoorOpen, 
  CheckSquare, 
  Calendar, 
  Plus, 
  Clock,
  AlertTriangle
} from "lucide-react";
import { useState } from "react";

interface WorkOrder {
  id: string;
  title: string;
  assigneeId?: string;
  assignmentProgressStatus?: string;
  isScheduled?: boolean;
  status: string;
  confirmedAt?: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

interface WorkOrderStatusIndicatorsProps {
  workOrder: WorkOrder;
  assignedAgent?: User;
  assignedByUser?: User;
  onAssignmentProgress?: (workOrderId: string, status: string) => void;
  onSchedule?: (workOrderId: string) => void;
}

export function AssignmentStatusIndicator({ workOrder, assignedAgent, assignedByUser }: WorkOrderStatusIndicatorsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!workOrder.assigneeId) {
    return null;
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <button className="text-green-600 hover:text-green-800 transition-colors">
          <User className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto scrollbar-minimal">
        <DialogHeader>
          <DialogTitle>Assignment Information</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Assigned Field Agent</h4>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="font-medium">{assignedAgent?.firstName} {assignedAgent?.lastName}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{assignedAgent?.email}</p>
              {assignedAgent?.phone && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{assignedAgent.phone}</p>
              )}
            </div>
          </div>
          
          {assignedByUser && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Assigned By</h4>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="font-medium">{assignedByUser.firstName} {assignedByUser.lastName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{assignedByUser.email}</p>
                {assignedByUser.phone && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{assignedByUser.phone}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProgressStatusIndicator({ workOrder, onAssignmentProgress }: { workOrder: WorkOrder; onAssignmentProgress?: (workOrderId: string, status: string) => void }) {
  const getNextStatus = () => {
    switch (workOrder.assignmentProgressStatus) {
      case 'confirm':
        return { status: 'in_route', label: 'In Route', icon: CheckCircle2, color: 'text-green-600 hover:text-green-700' };
      case 'in_route':
        return { status: 'check_in', label: 'Check In', icon: Car, color: 'text-blue-600 hover:text-blue-700' };
      case 'check_in':
        return { status: 'check_out', label: 'Check Out', icon: Wrench, color: 'text-orange-600 hover:text-orange-700' };
      case 'check_out':
        return { status: 'mark_complete', label: 'Mark Complete', icon: DoorOpen, color: 'text-purple-600 hover:text-purple-700' };
      case 'mark_complete':
        return { status: 'mark_incomplete', label: 'Mark Incomplete', icon: CheckSquare, color: 'text-red-600 hover:text-red-700' };
      default:
        return { status: 'confirm', label: 'Confirm', icon: CheckCircle, color: 'text-gray-600 hover:text-gray-700' };
    }
  };

  const getCurrentIcon = () => {
    switch (workOrder.assignmentProgressStatus) {
      case 'confirm':
        return <CheckCircle className="h-5 w-5 text-gray-500" />;
      case 'in_route':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'check_in':
        return <Car className="h-5 w-5 text-blue-500" />;
      case 'check_out':
        return <Wrench className="h-5 w-5 text-orange-500" />;
      case 'mark_complete':
        return <DoorOpen className="h-5 w-5 text-purple-500" />;
      case 'mark_incomplete':
        return <CheckSquare className="h-5 w-5 text-red-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const nextAction = getNextStatus();
  const NextIcon = nextAction.icon;

  const handleClick = () => {
    if (onAssignmentProgress) {
      onAssignmentProgress(workOrder.id, nextAction.status);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Current status icon */}
      {getCurrentIcon()}
      
      {/* Next action button */}
      {onAssignmentProgress && (
        <button
          onClick={handleClick}
          className={`transition-colors ${nextAction.color}`}
          title={nextAction.label}
        >
          <NextIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function ActiveStatusIndicator({ workOrder }: { workOrder: WorkOrder }) {
  const isActive = workOrder.assigneeId && workOrder.confirmedAt;
  
  return (
    <div className="flex items-center">
      <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
    </div>
  );
}

export function PathToCompletionIndicator({ workOrder }: { workOrder: WorkOrder }) {
  const getPathIcon = () => {
    // If not scheduled, show grey calendar
    if (!workOrder.isScheduled) {
      return <Calendar className="h-5 w-5 text-gray-500" />;
    }
    
    // If scheduled but not started, show green plus
    if (workOrder.isScheduled && workOrder.assignmentProgressStatus === 'confirm') {
      return <Plus className="h-5 w-5 text-green-500" />;
    }
    
    // If in progress (check_in, check_out, mark_complete)
    if (['check_in', 'check_out', 'mark_complete'].includes(workOrder.assignmentProgressStatus || '')) {
      return (
        <Badge variant="outline" className="text-xs">
          In Progress
        </Badge>
      );
    }
    
    // If mark_incomplete, show pending approval
    if (workOrder.assignmentProgressStatus === 'mark_incomplete') {
      return (
        <Badge variant="outline" className="text-xs text-orange-600">
          Pending Approval
        </Badge>
      );
    }
    
    return <Calendar className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="flex items-center">
      {getPathIcon()}
    </div>
  );
}

// Combined status indicators component
export function WorkOrderStatusIndicators({ workOrder, assignedAgent, assignedByUser, onAssignmentProgress, onSchedule }: WorkOrderStatusIndicatorsProps) {
  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">Assignment:</span>
        <AssignmentStatusIndicator 
          workOrder={workOrder} 
          assignedAgent={assignedAgent} 
          assignedByUser={assignedByUser} 
        />
      </div>
      
      <div className="flex items-center space-x-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">Progress:</span>
        <ProgressStatusIndicator workOrder={workOrder} onAssignmentProgress={onAssignmentProgress} />
      </div>
      
      <div className="flex items-center space-x-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">Active:</span>
        <ActiveStatusIndicator workOrder={workOrder} />
      </div>
      
      <div className="flex items-center space-x-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">Path:</span>
        <PathToCompletionIndicator workOrder={workOrder} />
      </div>
    </div>
  );
}