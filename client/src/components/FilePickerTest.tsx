import { useRef } from "react";
import { Button } from "@/components/ui/button";

/**
 * Test component to verify file picker functionality
 * Provides a simple isolated test for the file input behavior
 */
export function FilePickerTest() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    try {
      console.log('=== FilePickerTest: Button clicked ===');
      console.log('File input ref:', fileInputRef.current);
      
      if (!fileInputRef.current) {
        console.error('File input ref is null');
        alert('Error: File input not available');
        return;
      }
      
      console.log('Triggering file input click...');
      fileInputRef.current.click();
      console.log('File input click triggered successfully');
    } catch (error) {
      console.error('Error triggering file picker:', error);
      alert(`Error: ${error}`);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      console.log('=== FilePickerTest: File input changed ===');
      console.log('Files selected:', event.target.files);
      console.log('Number of files:', event.target.files?.length || 0);
      
      if (event.target.files && event.target.files.length > 0) {
        const fileNames = Array.from(event.target.files).map(f => f.name);
        console.log('File names:', fileNames);
        alert(`Files selected: ${fileNames.join(', ')}`);
      }
    } catch (error) {
      console.error('Error in file change handler:', error);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
      <h3 className="text-lg font-semibold mb-3">File Picker Test</h3>
      <p className="text-sm text-muted-foreground mb-4">
        This is a test component to verify file picker functionality works properly.
      </p>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
        onChange={handleFileChange}
        className="hidden"
        data-testid="test-file-input"
      />
      
      <Button
        onClick={handleButtonClick}
        variant="outline"
        className="w-full"
        data-testid="test-file-picker-button"
      >
        🧪 Test File Picker (Click to open File Explorer)
      </Button>
    </div>
  );
}