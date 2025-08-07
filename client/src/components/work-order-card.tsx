import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

interface WorkOrderCardProps {
  workOrder: any;
  onStatusChange?: (id: string, status: string) => void;
  showActions?: boolean;
}

export default function WorkOrderCard({ workOrder, onStatusChange, showActions = true }: WorkOrderCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-300';
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300';
      case 'in_progress': return 'bg-orange-100 text-orange-800 dark:bg-orange-800/20 dark:text-orange-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-300';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-300';
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

        {/* Additional Details Section */}
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full text-sm text-gray-600 hover:text-gray-900 p-1 mb-3">
              <span className="flex items-center">
                <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} mr-2`}></i>
                {isOpen ? 'Hide Details' : 'Show Details'}
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mb-4">
            {workOrder.scopeOfWork && (
              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-1">Scope of Work</h5>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{workOrder.scopeOfWork}</p>
              </div>
            )}
            {workOrder.requiredTools && (
              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-1">Required Tools & Equipment</h5>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{workOrder.requiredTools}</p>
              </div>
            )}
            {workOrder.pointOfContact && (
              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-1">Point of Contact</h5>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{workOrder.pointOfContact}</p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
        
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
