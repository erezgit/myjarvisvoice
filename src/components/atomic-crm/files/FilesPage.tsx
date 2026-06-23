import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  FileText,
  Folder,
  Image,
  FileSpreadsheet,
  FileCode,
  Film,
  Music,
  File,
  Home,
  ChevronRight,
  FolderOpen,
  ExternalLink,
  Download,
  MessageSquarePlus,
} from "lucide-react";

type FileEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  extension: string | null;
};

type DirListing = {
  path: string;
  parent: string;
  isHome: boolean;
  isJarvisDir: boolean;
  items: FileEntry[];
};

type HomePaths = {
  home: string;
  jarvisDir: string;
  desktop: string;
  documents: string;
  downloads: string;
};

const API = "http://localhost:3001";

function getFileIcon(entry: FileEntry) {
  if (entry.isDirectory) return Folder;
  switch (entry.extension) {
    case "pdf":
    case "doc":
    case "docx":
    case "txt":
    case "md":
    case "rtf":
      return FileText;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
    case "heic":
      return Image;
    case "xls":
    case "xlsx":
    case "csv":
      return FileSpreadsheet;
    case "js":
    case "ts":
    case "py":
    case "json":
    case "html":
    case "css":
      return FileCode;
    case "mp4":
    case "mov":
    case "avi":
    case "mkv":
      return Film;
    case "mp3":
    case "wav":
    case "aac":
    case "m4a":
      return Music;
    default:
      return File;
  }
}

function getFileColor(entry: FileEntry): string {
  if (entry.isDirectory) return "#58a6ff";
  switch (entry.extension) {
    case "pdf":
      return "#f85149";
    case "doc":
    case "docx":
      return "#58a6ff";
    case "xls":
    case "xlsx":
    case "csv":
      return "#3fb950";
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
    case "heic":
      return "#a78bfa";
    case "mp4":
    case "mov":
      return "#f0883e";
    case "mp3":
    case "wav":
      return "#f472b6";
    default:
      return "#8b949e";
  }
}

function getFileTypeLabel(entry: FileEntry): string {
  if (entry.isDirectory) return "Folder";
  switch (entry.extension) {
    case "pdf": return "PDF";
    case "doc": case "docx": return "Document";
    case "txt": case "md": case "rtf": return "Text";
    case "png": case "jpg": case "jpeg": case "gif": case "svg": case "webp": case "heic": return "Image";
    case "xls": case "xlsx": case "csv": return "Spreadsheet";
    case "js": case "ts": case "py": case "json": case "html": case "css": return "Code";
    case "mp4": case "mov": case "avi": case "mkv": return "Video";
    case "mp3": case "wav": case "aac": case "m4a": return "Audio";
    default: return entry.extension?.toUpperCase() || "File";
  }
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

export function FilesPage() {
  const [listing, setListing] = useState<DirListing | null>(null);
  const [homePaths, setHomePaths] = useState<HomePaths | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDir = useCallback(async (dirPath?: string) => {
    setIsLoading(true);
    try {
      const url = dirPath
        ? `${API}/api/files/list?path=${encodeURIComponent(dirPath)}`
        : `${API}/api/files/list`;
      const res = await fetch(url);
      const data = await res.json();
      setListing(data);
    } catch (err) {
      console.error("Failed to load directory:", err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Load home paths and default directory
    fetch(`${API}/api/files/home`)
      .then((r) => r.json())
      .then((paths) => {
        setHomePaths(paths);
        loadDir(paths.jarvisDir);
      })
      .catch(() => loadDir());
  }, [loadDir]);

  const handleOpen = async (entry: FileEntry) => {
    if (entry.isDirectory) {
      loadDir(entry.path);
    } else {
      await fetch(`${API}/api/files/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: entry.path }),
      });
    }
  };

  const handleReveal = async (entry: FileEntry) => {
    await fetch(`${API}/api/files/reveal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath: entry.path }),
    });
  };

  // Build breadcrumb from current path
  const getBreadcrumbs = () => {
    if (!listing || !homePaths) return [];
    const parts: { label: string; path: string }[] = [];
    let current = listing.path;
    const home = homePaths.home;

    if (current === home) {
      return [{ label: "Home", path: home }];
    }

    // Build path segments from home to current
    const relative = current.startsWith(home) ? current.slice(home.length) : current;
    const segments = relative.split("/").filter(Boolean);

    parts.push({ label: "Home", path: home });
    let accumulated = home;
    for (const seg of segments) {
      accumulated = accumulated + "/" + seg;
      parts.push({ label: seg, path: accumulated });
    }
    return parts;
  };

  // Quick-access sidebar locations
  const quickAccess = homePaths
    ? [
        { label: "My Jarvis", path: homePaths.jarvisDir, icon: FolderOpen },
        { label: "Desktop", path: homePaths.desktop, icon: Folder },
        { label: "Documents", path: homePaths.documents, icon: Folder },
        { label: "Downloads", path: homePaths.downloads, icon: Download },
      ]
    : [];

  if (isLoading && !listing) {
    return (
      <div className="px-6 pt-4 pb-6 max-w-6xl">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex h-full">
      {/* Sidebar — quick access */}
      <div className="w-44 shrink-0 border-r py-4 px-3 space-y-1">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-2">
          Locations
        </div>
        {quickAccess.map((loc) => {
          const isActive = listing?.path === loc.path;
          return (
            <button
              key={loc.path}
              onClick={() => loadDir(loc.path)}
              className={`flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-[#e3e3e6] dark:bg-sidebar-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-[#e3e3e6] dark:hover:bg-sidebar-accent hover:text-foreground"
              }`}
            >
              <loc.icon className="w-4 h-4" />
              {loc.label}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 px-6 pt-3 pb-6 overflow-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 mb-4 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <div key={crumb.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              <button
                onClick={() => loadDir(crumb.path)}
                className={`px-1.5 py-0.5 rounded hover:bg-muted transition-colors ${
                  i === breadcrumbs.length - 1
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {i === 0 ? <Home className="w-3.5 h-3.5" /> : crumb.label}
              </button>
            </div>
          ))}
        </div>

        {/* File grid */}
        {listing && listing.items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {listing.items.map((entry) => {
              const Icon = getFileIcon(entry);
              const color = getFileColor(entry);
              const typeLabel = getFileTypeLabel(entry);
              return (
                <div
                  key={entry.path}
                  className="group rounded-xl border bg-card hover:bg-accent/30 transition-all p-4 flex flex-col gap-2 cursor-pointer"
                  onDoubleClick={() => handleOpen(entry)}
                  onClick={() => {
                    if (entry.isDirectory) handleOpen(entry);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleReveal(entry);
                  }}
                  title={`${entry.name}${!entry.isDirectory ? `\n${formatSize(entry.size)} • ${formatDate(entry.modified)}` : ""}\n\nDouble-click to open`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color }} />
                    <span className="text-sm font-medium text-foreground leading-tight line-clamp-2 flex-1">
                      {entry.name}
                    </span>
                  </div>
                  {!entry.isDirectory && (
                    <span className="text-[10px] text-muted-foreground/60 pl-8">
                      {formatSize(entry.size)} • {formatDate(entry.modified)}
                    </span>
                  )}
                  <div className="flex items-center justify-between mt-auto pt-1">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        color,
                        backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
                      }}
                    >
                      {typeLabel}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.dispatchEvent(new CustomEvent('insert-file-path', { detail: { path: entry.path } }));
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-muted transition-all"
                      title="Add to chat"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">This folder is empty.</p>
          </div>
        )}
      </div>
    </div>
  );
}

FilesPage.path = "/files";
