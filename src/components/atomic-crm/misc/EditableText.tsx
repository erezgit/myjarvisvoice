import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}

/**
 * Inline editable text component.
 * Renders as an input/textarea styled to look like regular text.
 * Hover shows a subtle highlight. Focus adds a border.
 * Blur or Enter saves. Escape cancels.
 */
export function EditableText({
  value,
  onSave,
  className,
  placeholder = "Click to edit...",
  multiline = false,
  rows = 3,
}: EditableTextProps) {
  const [draft, setDraft] = useState(value);

  // Sync when external value changes (e.g., after a refetch)
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleBlur = () => {
    if (draft !== value) {
      onSave(draft);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
    if (e.key === "Escape") {
      setDraft(value);
      (e.target as HTMLElement).blur();
    }
  };

  const sharedClassName = cn(
    "w-full bg-transparent outline-none transition-colors",
    "border border-transparent rounded px-1 -mx-1",
    "hover:bg-accent/50 focus:bg-accent/30 focus:border-border",
    className
  );

  if (multiline) {
    return (
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={cn(sharedClassName, "resize-none")}
      />
    );
  }

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={sharedClassName}
    />
  );
}
