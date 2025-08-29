import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DocumentUploader } from "@/components/DocumentUploader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  filename: string;
  originalFilename: string;
  category: string;
  uploadedAt: string;
  uploadedById: string;
}

interface DocumentUploadControlProps {
  entityType: "work_order" | "project" | "task";
  entityId: string;
  documentsRequired: number;
  canUpload?: boolean;
  disabled?: boolean;
}

/**
 * Document Upload Control component that enforces document upload limits
 * based on the documentsRequired field. Service Company users can only upload
 * documents if documentsRequired > 0, and are limited to that exact number.
 */
export function DocumentUploadControl({
  entityType,
  entityId,
  documentsRequired,
  canUpload = true,
  disabled = false,
}: DocumentUploadControlProps) {
  const { toast } = useToast();
  const [showUploader, setShowUploader] = useState(false);

  // Query to fetch existing documents
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: [`/api/documents?entityType=${entityType}&entityId=${entityId}`],
    enabled: !!entityId,
  });

  const uploadedCount = documents.length;
  const canAddMore = uploadedCount < documentsRequired;
  const maxAdditionalFiles = documentsRequired - uploadedCount;
  const isComplete = uploadedCount >= documentsRequired;

  // Show upload button only if documents are required and user can add more
  const showUploadButton = canUpload && documentsRequired > 0 && canAddMore && !disabled;

  const handleUploadComplete = () => {
    setShowUploader(false);
    toast({
      title: "Document Uploaded",
      description: `Document uploaded successfully. ${maxAdditionalFiles - 1} more document(s) can be uploaded.`,
    });
  };

  const getStatusDisplay = () => {
    if (documentsRequired === 0) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          No documents required
        </div>
      );
    }

    if (isComplete) {
      return (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          All required documents uploaded ({uploadedCount}/{documentsRequired})
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-sm text-amber-600">
        <AlertCircle className="h-4 w-4" />
        {uploadedCount}/{documentsRequired} documents uploaded
      </div>
    );
  };

  if (documentsRequired === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="pt-6 pb-4 text-center">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No documents required for this {entityType.replace('_', ' ')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Document Status */}
      <Card className={isComplete ? "border-green-200 bg-green-50/50" : "border-amber-200 bg-amber-50/50"}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Document Upload Requirements</CardTitle>
            <Badge variant={isComplete ? "default" : "secondary"} className={isComplete ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
              {uploadedCount}/{documentsRequired}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {getStatusDisplay()}
          
          {documentsRequired > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {documentsRequired === 1 ? "1 document is" : `${documentsRequired} documents are`} required to be uploaded by Service Company users.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Upload Button */}
      {showUploadButton && (
        <div className="flex justify-center">
          <Button
            onClick={() => {
              try {
                console.log('Upload Document button clicked');
                setShowUploader(true);
              } catch (error) {
                console.error('Error showing uploader:', error);
              }
            }}
            className="flex items-center gap-2"
            disabled={disabled}
            data-testid="upload-document-button"
          >
            <Upload className="h-4 w-4" />
            Upload Document ({maxAdditionalFiles} remaining)
          </Button>
        </div>
      )}

      {/* Document Uploader Modal */}
      {showUploader && (
        <DocumentUploader
          entityType={entityType}
          entityId={entityId}
          maxNumberOfFiles={maxAdditionalFiles}
          maxFileSize={52428800} // 50MB
          allowedFileTypes={[".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png"]}
          onComplete={handleUploadComplete}
          onCancel={() => setShowUploader(false)}
        />
      )}

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Uploaded Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded border"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{doc.originalFilename}</span>
                    <Badge variant="outline" className="text-xs">
                      {doc.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default DocumentUploadControl;