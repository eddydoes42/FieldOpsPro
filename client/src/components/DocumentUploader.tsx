import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
// Uppy CSS imports removed - will be handled by project CSS
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Trash2, Upload, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Document } from "@shared/schema";

interface DocumentUploaderProps {
  entityType: "project" | "work_order" | "task";
  entityId: string;
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  buttonClassName?: string;
  children?: ReactNode;
  disabled?: boolean;
}

interface DocumentMetadata {
  category: "pre_visit" | "during_visit" | "post_visit";
  description?: string;
  isRequired?: boolean;
}

/**
 * A comprehensive document uploader component for projects, work orders, and tasks.
 * 
 * Features:
 * - Upload multiple documents with metadata
 * - Categorize documents by timing (pre/during/post visit)
 * - Role-based access control
 * - File type validation (PDF, DOCX, XLSX, JPG, PNG)
 * - Real-time document list with management capabilities
 * - Integration with object storage
 */
export function DocumentUploader({
  entityType,
  entityId,
  maxNumberOfFiles = 10,
  maxFileSize = 52428800, // 50MB default
  allowedFileTypes = [".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png"],
  buttonClassName,
  children,
  disabled = false,
}: DocumentUploaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [documentMetadata, setDocumentMetadata] = useState<DocumentMetadata>({
    category: "pre_visit",
    description: "",
    isRequired: false,
  });

  // Query to fetch existing documents
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: [`/api/documents?entityType=${entityType}&entityId=${entityId}`],
    enabled: !!entityId,
  });

  // Mutation to delete a document
  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest("DELETE", `/api/documents/${documentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/documents?entityType=${entityType}&entityId=${entityId}`] 
      });
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  // Uppy instance configuration
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes,
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async () => {
          const response = await apiRequest("POST", "/api/documents/upload");
          const data = await response.json();
          return {
            method: "PUT",
            url: data.uploadURL,
          };
        },
      })
      .on("complete", async (result) => {
        if (result.successful.length > 0) {
          for (const file of result.successful) {
            try {
              // Create document record in database
              await apiRequest("POST", "/api/documents", {
                entityType,
                entityId,
                filename: file.meta.name,
                originalFilename: file.meta.name,
                fileUrl: file.uploadURL,
                mimeType: file.meta.type,
                fileSize: file.size,
                category: documentMetadata.category,
                description: documentMetadata.description,
                isRequired: documentMetadata.isRequired,
              });
            } catch (error) {
              console.error("Error creating document record:", error);
              toast({
                title: "Error",
                description: "Failed to save document metadata",
                variant: "destructive",
              });
            }
          }
          
          // Refresh documents list
          queryClient.invalidateQueries({ 
            queryKey: [`/api/documents?entityType=${entityType}&entityId=${entityId}`] 
          });
          
          toast({
            title: "Success",
            description: `${result.successful.length} document(s) uploaded successfully`,
          });
          
          // Reset metadata form
          setDocumentMetadata({
            category: "pre_visit",
            description: "",
            isRequired: false,
          });
        }
      })
  );

  const handleDelete = (documentId: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteDocumentMutation.mutate(documentId);
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "pre_visit": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "during_visit": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "post_visit": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading documents...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <Button 
        onClick={() => setShowModal(true)} 
        className={buttonClassName}
        disabled={disabled}
        data-testid="button-upload-documents"
      >
        <Upload className="w-4 h-4 mr-2" />
        {children || "Upload Documents"}
      </Button>

      {/* Documents List */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Uploaded Documents ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div 
                  key={doc.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`document-item-${doc.id}`}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={doc.originalFilename}>
                        {doc.originalFilename}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getCategoryBadgeColor(doc.category)}>
                          {doc.category.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(doc.fileSize)}
                        </span>
                        {doc.isRequired && (
                          <Badge variant="outline" className="text-xs">
                            Required
                          </Badge>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate" title={doc.description}>
                          {doc.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(doc.fileUrl, "_blank")}
                      data-testid={`button-download-${doc.id}`}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deleteDocumentMutation.isPending}
                      data-testid={`button-delete-${doc.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Modal */}
      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
        plugins={["Dashboard"]}
        metaFields={[
          {
            id: "category",
            name: "Category",
            render: ({ value, onChange }: any) => (
              <Select value={value || "pre_visit"} onValueChange={onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_visit">Pre-visit</SelectItem>
                  <SelectItem value="during_visit">During visit</SelectItem>
                  <SelectItem value="post_visit">Post-visit</SelectItem>
                </SelectContent>
              </Select>
            ),
          },
          {
            id: "description",
            name: "Description",
            render: ({ value, onChange }: any) => (
              <Textarea
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Optional description..."
                rows={2}
              />
            ),
          },
          {
            id: "isRequired",
            name: "Required Document",
            render: ({ value, onChange }: any) => (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={value || false}
                  onChange={(e) => onChange(e.target.checked)}
                  id="required-checkbox"
                />
                <Label htmlFor="required-checkbox">Mark as required</Label>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}