import React, { useRef } from "react";
import { Paperclip } from "lucide-react";

interface FileUploadButtonLabelProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  isUploading?: boolean;
}

/**
 * FileUploadButtonLabel - Uses native HTML label wrapping for instant file dialog
 *
 * This implementation uses a label element that wraps the hidden file input.
 * When the user clicks anywhere on the label (including the visible button),
 * it naturally triggers the file input without any programmatic JavaScript.
 * This creates a truly trusted event chain and eliminates browser security delays.
 */
export function FileUploadButtonLabel({
  onFileSelect,
  disabled = false,
  isUploading = false
}: FileUploadButtonLabelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[FILE_UPLOAD_LABEL] File selected via native label click at', performance.now());
    const file = e.target.files?.[0];
    if (file) {
      console.log(`[FILE_UPLOAD_LABEL] File: ${file.name}, size: ${file.size} bytes`);
      onFileSelect(file);
      // Reset input so same file can be selected again
      e.target.value = "";
    }
  };

  // Add click handler to track timing
  const handleLabelClick = (e: React.MouseEvent<HTMLLabelElement>) => {
    console.log('[FILE_UPLOAD_LABEL] Label clicked at', performance.now());
    console.log('[FILE_UPLOAD_LABEL] Event is trusted:', e.isTrusted);

    // Set markers to measure when browser becomes responsive
    setTimeout(() => {
      console.log('[FILE_UPLOAD_LABEL] 100ms after click - browser responsive check');
    }, 100);

    setTimeout(() => {
      console.log('[FILE_UPLOAD_LABEL] 1 second after click');
    }, 1000);

    setTimeout(() => {
      console.log('[FILE_UPLOAD_LABEL] 5 seconds after click');
    }, 5000);

    setTimeout(() => {
      console.log('[FILE_UPLOAD_LABEL] 10 seconds after click - dialog should be open by now');
    }, 10000);
  };

  return (
    <label
      onClick={handleLabelClick}
      className={`
        inline-block p-2 bg-neutral-100 hover:bg-neutral-200
        dark:bg-slate-700 dark:hover:bg-slate-600
        text-neutral-600 dark:text-slate-300
        rounded-lg transition-all duration-200
        shadow-sm hover:shadow-md
        ${(disabled || isUploading) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
      `}
      title={isUploading ? "Uploading..." : "Upload file"}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="hidden"
        aria-label="Upload file"
      />

      {/* Visible button content */}
      {isUploading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <Paperclip className="w-4 h-4" />
      )}
    </label>
  );
}