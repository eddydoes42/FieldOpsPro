import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface WorkOrderCardProps {
  workOrder: any;
  onStatusChange?: (id: string, status: string) => void;
  showActions?: boolean;
}

export default function WorkOrderCard({ workOrder, onStatusChange, showActions = true }: WorkOrderCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{workOrder.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{workOrder.description}</p>
          </div>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${getStatusColor(workOrder.status)}`}>
            {workOrder.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="flex items-center text-gray-600">
            <i className="fas fa-map-marker-alt mr-2 text-gray-400"></i>
            <span>{workOrder.location}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <i className="fas fa-clock mr-2 text-gray-400"></i>
            <span>Est. {workOrder.estimatedHours || 'TBD'} hours</span>
          </div>
          <div className="flex items-center text-gray-600">
            <i className={`fas fa-exclamation-circle mr-2 ${getPriorityColor(workOrder.priority)}`}></i>
            <span className={getPriorityColor(workOrder.priority)}>
              {workOrder.priority} Priority
            </span>
          </div>
          <div className="flex items-center text-gray-600">
            <i className="fas fa-calendar mr-2 text-gray-400"></i>
            <span>Due: {workOrder.dueDate ? new Date(workOrder.dueDate).toLocaleDateString() : 'No due date'}</span>
          </div>
        </div>
        
        {showActions && (
          <div className="flex space-x-3">
            {workOrder.status === 'pending' && onStatusChange && (
              <Button 
                onClick={() => onStatusChange(workOrder.id, 'in_progress')}
                className="flex-1 text-sm"
              >
                <i className="fas fa-play mr-2"></i>Start Work
              </Button>
            )}
            {workOrder.status === 'in_progress' && onStatusChange && (
              <Button 
                onClick={() => onStatusChange(workOrder.id, 'completed')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
              >
                <i className="fas fa-check mr-2"></i>Complete
              </Button>
            )}
            <Button variant="secondary" className="flex-1 text-sm">
              <i className="fas fa-comment mr-2"></i>Message
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
