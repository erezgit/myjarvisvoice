import { useState } from "react";
import { Download, FileText, FileType, FileSpreadsheet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { handleDownload, type DownloadFormat } from "@/lib/download-pdf";

export function DownloadButton({
  contentRef,
  filename,
  markdownContent,
}: {
  contentRef: React.RefObject<HTMLElement | null>;
  filename: string;
  markdownContent?: string;
}) {
  const [downloading, setDownloading] = useState(false);

  const onDownload = async (format: DownloadFormat) => {
    setDownloading(true);
    await handleDownload(contentRef, filename, format, markdownContent);
    setDownloading(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
          title="Download"
        >
          {downloading ? (
            <div className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => onDownload("pdf")} className="cursor-pointer gap-2">
          <FileText className="w-3.5 h-3.5 text-red-400" />
          <span className="text-sm">PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDownload("docx")} className="cursor-pointer gap-2">
          <FileType className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-sm">Word (.docx)</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDownload("markdown")} className="cursor-pointer gap-2">
          <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm">Markdown (.md)</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
