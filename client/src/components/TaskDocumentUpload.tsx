import { DocumentUploadControl } from "@/components/DocumentUploadControl";

interface TaskDocumentUploadProps {
  taskId: string;
  taskTitle: string;
  documentsRequired: number;
  canUpload?: boolean;
  disabled?: boolean;
}

/**
 * Task-specific document upload component that integrates with DocumentUploadControl
 * to provide document upload functionality for individual tasks.
 * 
 * Only shows the upload control when documentsRequired > 0 and the user has upload permissions.
 */
export function TaskDocumentUpload({
  taskId,
  taskTitle,
  documentsRequired,
  canUpload = true,
  disabled = false,
}: TaskDocumentUploadProps) {
  // Don't render anything if no documents are required
  if (documentsRequired === 0) {
    return null;
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
      <div className="mb-2">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Task Documents Required
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Upload {documentsRequired} document{documentsRequired !== 1 ? 's' : ''} for: {taskTitle}
        </p>
      </div>
      
      <DocumentUploadControl
        entityType="task"
        entityId={taskId}
        documentsRequired={documentsRequired}
        canUpload={canUpload}
        disabled={disabled}
      />
    </div>
  );
}

export default TaskDocumentUpload;