import { useEffect, useRef, useState } from "react";
import { Download, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

/**
 * First-launch model download flow.
 *
 * Polls the local Kokoro engine (proxied via the server at /api/voice-engine/*).
 * If the ~350 MB model files are missing, shows a "Download model" button with a
 * progress bar. Once present, flips to "ready" and hides itself. Offline & free.
 */

type Health = { status: string; model_ready: boolean };
type Progress = {
  downloading: boolean;
  done: boolean;
  downloaded: number;
  total: number;
  error: string | null;
};

const API = "http://localhost:3001";

function fmtMB(n: number) {
  return `${(n / 1_000_000).toFixed(0)} MB`;
}

export function ModelDownloadBanner() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [reachable, setReachable] = useState(true);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [starting, setStarting] = useState(false);
  const poll = useRef<number | null>(null);

  const checkHealth = async () => {
    try {
      const r = await fetch(`${API}/api/voice-engine/health`);
      const h: Health = await r.json();
      setReachable(r.ok);
      setReady(!!h.model_ready);
      return !!h.model_ready;
    } catch {
      setReachable(false);
      setReady(false);
      return false;
    }
  };

  const pollProgress = async () => {
    try {
      const r = await fetch(`${API}/api/voice-engine/progress`);
      const p: Progress = await r.json();
      setProgress(p);
      if (p.done || (!p.downloading && !p.error)) {
        if (poll.current) window.clearInterval(poll.current);
        poll.current = null;
        checkHealth();
      }
    } catch {
      /* keep polling */
    }
  };

  const startDownload = async () => {
    setStarting(true);
    try {
      await fetch(`${API}/api/voice-engine/download`, { method: "POST" });
      if (!poll.current) {
        poll.current = window.setInterval(pollProgress, 1000);
      }
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    checkHealth();
    return () => {
      if (poll.current) window.clearInterval(poll.current);
    };
  }, []);

  // Ready or still loading state — render nothing once the model is present.
  if (ready === null || ready === true) return null;

  const pct =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
      : 0;
  const isDownloading = !!progress?.downloading;

  return (
    <div className="shrink-0 px-10 pb-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            {isDownloading ? (
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
            ) : (
              <Download className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#1a1a1a]">
              {isDownloading ? "Downloading voice model…" : "Voice model not installed"}
            </p>
            <p className="text-xs text-[#8a6d3b] mt-0.5">
              {!reachable
                ? "Local voice engine unreachable — start the engine, then refresh."
                : isDownloading
                ? `${fmtMB(progress!.downloaded)} / ${progress!.total ? fmtMB(progress!.total) : "~350 MB"}`
                : "My Jarvis Voice needs the Kokoro model (~350 MB) to speak. One-time download."}
            </p>
          </div>
          {!isDownloading && reachable && (
            <button
              onClick={startDownload}
              disabled={starting}
              className="px-4 py-2 rounded-full bg-amber-600 text-white text-sm font-medium hover:bg-amber-500 transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
            >
              {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download model (~350 MB)
            </button>
          )}
        </div>

        {isDownloading && (
          <div className="mt-3 h-2 w-full rounded-full bg-amber-100 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {progress?.error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-600">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Download failed: {progress.error}</span>
          </div>
        )}

        {progress?.done && (
          <div className="mt-3 flex items-center gap-2 text-xs text-green-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Model ready — voice is now available.</span>
          </div>
        )}
      </div>
    </div>
  );
}
