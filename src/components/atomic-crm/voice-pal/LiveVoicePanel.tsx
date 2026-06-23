import { useState, useCallback } from "react";
import { Mic, Loader2, AlertCircle, Volume2 } from "lucide-react";

/**
 * Local voice panel (open-source offline build).
 *
 * The original cloud app used LiveKit here for a real-time agent call. This
 * fork is fully offline, so the panel instead speaks text through the bundled
 * local Kokoro engine (via the server's /api/voice endpoint). Same visual
 * shell — no cloud, no tokens, no keys.
 */
export function LiveVoicePanel() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speak = useCallback(async () => {
    const message = text.trim() || "Hello, this is My Jarvis Voice speaking locally with Kokoro.";
    setBusy(true);
    setError(null);
    try {
      const voice = localStorage.getItem("voice-pal-voice") || "am_echo";
      const res = await fetch("http://localhost:3001/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, voice }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed: ${res.status}`);
      }
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to speak");
    } finally {
      setBusy(false);
    }
  }, [text]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8">
      <div className="w-16 h-16 rounded-full bg-green-600/10 flex items-center justify-center">
        <Mic className="w-7 h-7 text-green-600" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-[#1a1a1a]">Talk to Jarvis</p>
        <p className="text-xs text-muted-foreground mt-1">Local voice · Kokoro · offline</p>
      </div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && speak()}
        placeholder="Type something to say…"
        className="w-full max-w-sm px-4 py-2 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40"
      />
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <button
        onClick={speak}
        disabled={busy}
        className="px-6 py-2.5 rounded-full bg-green-600 text-white text-sm font-medium hover:bg-green-500 transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {busy ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Speaking…</>
        ) : (
          <><Volume2 className="w-4 h-4" /> Speak</>
        )}
      </button>
    </div>
  );
}
