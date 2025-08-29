import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, Upload, FileText, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DocumentUploaderProps {
  entityType: "work_order" | "project" | "task";
  entityId: string;
  maxNumberOfFiles?: number;
  maxFileSize?: number; // in bytes
  allowedFileTypes?: string[];
  onComplete?: () => void;
  onCancel?: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  category: string;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
}

/**
 * Document uploader component with file validation and progress tracking
 */
export function DocumentUploader({
  entityType,
  entityId,
  maxNumberOfFiles = 1,
  maxFileSize = 52428800, // 50MB default
  allowedFileTypes = [".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png"],
  onComplete,
  onCancel,
}: DocumentUploaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (uploadingFile: UploadingFile) => {
      const formData = new FormData();
      formData.append("file", uploadingFile.file);
      formData.append("entityType", entityType);
      formData.append("entityId", entityId);
      formData.append("category", uploadingFile.category);

      const response = await apiRequest("POST", "/api/documents/upload", formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents`] });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (selectedFiles.length + files.length > maxNumberOfFiles) {
      toast({
        title: "Too many files",
        description: `You can only upload ${maxNumberOfFiles} file(s) maximum.`,
        variant: "destructive",
      });
      return;
    }

    const validFiles: UploadingFile[] = [];
    
    for (const file of files) {
      // Check file size
      if (file.size > maxFileSize) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than ${Math.round(maxFileSize / 1024 / 1024)}MB.`,
          variant: "destructive",
        });
        continue;
      }

      // Check file type
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      if (allowedFileTypes.length > 0 && !allowedFileTypes.includes(fileExtension)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an allowed file type.`,
          variant: "destructive",
        });
        continue;
      }

      validFiles.push({
        file,
        progress: 0,
        category: "reference", // default category
        status: "pending",
      });
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    event.target.value = ""; // Reset input
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileCategory = (index: number, category: string) => {
    setSelectedFiles(prev => 
      prev.map((file, i) => i === index ? { ...file, category } : file)
    );
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const uploadingFile = selectedFiles[i];
        
        // Update status to uploading
        setSelectedFiles(prev => 
          prev.map((file, index) => 
            index === i ? { ...file, status: "uploading" as const, progress: 0 } : file
          )
        );

        try {
          // Simulate progress (since we can't track real upload progress easily with fetch)
          let progress = 0;
          const progressInterval = setInterval(() => {
            progress += 10;
            setSelectedFiles(prev => 
              prev.map((file, index) => 
                index === i ? { ...file, progress: Math.min(progress, 90) } : file
              )
            );
          }, 100);

          await uploadMutation.mutateAsync(uploadingFile);

          clearInterval(progressInterval);
          
          // Update to complete
          setSelectedFiles(prev => 
            prev.map((file, index) => 
              index === i ? { ...file, status: "complete" as const, progress: 100 } : file
            )
          );
        } catch (error: any) {
          console.error("Upload error:", error);
          setSelectedFiles(prev => 
            prev.map((file, index) => 
              index === i ? { 
                ...file, 
                status: "error" as const, 
                progress: 0,
                error: error.message || "Upload failed"
              } : file
            )
          );
        }
      }

      // Check if all uploads completed successfully
      const allComplete = selectedFiles.every(file => file.status === "complete");
      if (allComplete) {
        toast({
          title: "Upload complete",
          description: `${selectedFiles.length} file(s) uploaded successfully.`,
        });
        onComplete?.();
      }
    } finally {
      setIsUploading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "reference": return "📄 Reference";
      case "procedure": return "📋 Procedure";
      case "checklist": return "✅ Checklist";
      case "form": return "📝 Form";
      case "pre_visit": return "🚗 Pre-Visit";
      case "during_visit": return "🔧 During Visit";
      case "post_visit": return "📋 Post-Visit";
      default: return "📄 Other";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error": return <X className="h-4 w-4 text-red-500" />;
      case "uploading": return <Upload className="h-4 w-4 text-blue-500 animate-pulse" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const canUpload = selectedFiles.length > 0 && 
    selectedFiles.every(file => file.category && file.status !== "uploading") &&
    !isUploading;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Upload Documents</CardTitle>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Upload up to {maxNumberOfFiles} file(s). Max size: {Math.round(maxFileSize / 1024 / 1024)}MB each.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Input */}
        <div>
          <Input
            type="file"
            multiple={maxNumberOfFiles > 1}
            accept={allowedFileTypes.join(",")}
            onChange={handleFileSelect}
            disabled={isUploading || selectedFiles.length >= maxNumberOfFiles}
            className="cursor-pointer"
          />
          {allowedFileTypes.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Allowed types: {allowedFileTypes.join(", ")}
            </p>
          )}
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Selected Files ({selectedFiles.length}/{maxNumberOfFiles})</h4>
            {selectedFiles.map((uploadingFile, index) => (
              <Card key={index} className="p-3">
                <div className="space-y-3">
                  {/* File Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(uploadingFile.status)}
                      <span className="text-sm font-medium truncate">
                        {uploadingFile.file.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(uploadingFile.file.size / 1024)} KB
                      </Badge>
                    </div>
                    {uploadingFile.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Category Selection */}
                  {uploadingFile.status === "pending" && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Category *</label>
                      <Select 
                        value={uploadingFile.category} 
                        onValueChange={(value) => updateFileCategory(index, value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reference">📄 Reference</SelectItem>
                          <SelectItem value="procedure">📋 Procedure</SelectItem>
                          <SelectItem value="checklist">✅ Checklist</SelectItem>
                          <SelectItem value="form">📝 Form</SelectItem>
                          <SelectItem value="pre_visit">🚗 Pre-Visit</SelectItem>
                          <SelectItem value="during_visit">🔧 During Visit</SelectItem>
                          <SelectItem value="post_visit">📋 Post-Visit</SelectItem>
                          <SelectItem value="other">📄 Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {uploadingFile.status === "uploading" && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>Uploading...</span>
                        <span>{uploadingFile.progress}%</span>
                      </div>
                      <Progress value={uploadingFile.progress} className="h-2" />
                    </div>
                  )}

                  {/* Error Message */}
                  {uploadingFile.status === "error" && uploadingFile.error && (
                    <p className="text-xs text-red-600">{uploadingFile.error}</p>
                  )}

                  {/* Success Message */}
                  {uploadingFile.status === "complete" && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">
                        {getCategoryLabel(uploadingFile.category)}
                      </Badge>
                      <span className="text-xs text-green-600">Uploaded successfully</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isUploading}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleUpload} 
            disabled={!canUpload}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-pulse" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {selectedFiles.length} File(s)
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default DocumentUploader;