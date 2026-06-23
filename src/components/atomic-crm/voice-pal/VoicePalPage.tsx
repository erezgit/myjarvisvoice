import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { Heart, Copy, Download, Mic } from "lucide-react";
import { LiveVoicePanel } from "./LiveVoicePanel";

// Mini mode detection via window width
function useIsMiniMode() {
  return useSyncExternalStore(
    (cb) => { window.addEventListener("resize", cb); return () => window.removeEventListener("resize", cb); },
    () => window.innerWidth < 500
  );
}
import { VoicePlayerInline } from "./VoicePlayerInline";
import { UnlikeConfirm } from "./UnlikeConfirm";
import { ModelDownloadBanner } from "./ModelDownloadBanner";
import { audioManager } from "./audioManager";

type VoiceMessage = {
  id: number;
  message: string;
  voice: string;
  audio_path: string;
  duration_ms: number | null;
  liked: number;
  agent: string | null;
  created_at: string;
};

const AGENT_META: Record<string, { label: string; avatar: string; color: string }> = {
  jarvis: { label: "Jarvis", avatar: "./avatars/jarvis.jpg", color: "#2563eb" },
  atlas: { label: "Atlas", avatar: "./avatars/atlas.jpg", color: "#ea580c" },
  nova: { label: "Nova", avatar: "./avatars/nova.jpg", color: "#7c3aed" },
  echo: { label: "Echo", avatar: "./avatars/echo.jpg", color: "#16a34a" },
  bolt: { label: "Bolt", avatar: "./avatars/jarvis.jpg", color: "#f59e0b" },
  spark: { label: "Spark", avatar: "./avatars/echo.jpg", color: "#ef4444" },
};

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <p
      className={`text-sm text-muted-foreground leading-relaxed ${expanded ? "" : "line-clamp-3"} cursor-pointer`}
      onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
    >
      {text}
    </p>
  );
}

export function VoicePalPage() {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [unlikeId, setUnlikeId] = useState<number | null>(null);
  const [autoPlayId, setAutoPlayId] = useState<number | null>(null);
  const [voiceUnlocked, setVoiceUnlocked] = useState(() =>
    localStorage.getItem("audio-unlocked") === "true"
  );
  const latestIdRef = useRef<number>(0);

  const handleStartVoice = () => {
    // This click event will trigger audioManager's unlock listener
    audioManager.play(""); // silent unlock
    audioManager.pause();
    localStorage.setItem("audio-unlocked", "true");
    setVoiceUnlocked(true);
  };

  const fetchMessages = (isInitial = false) => {
    fetch("http://localhost:3001/api/voice_messages")
      .then((r) => r.json())
      .then((msgs: VoiceMessage[]) => {
        if (msgs.length > 0) {
          if (isInitial) {
            latestIdRef.current = msgs[0].id;
          } else if (msgs[0].id > latestIdRef.current) {
            latestIdRef.current = msgs[0].id;
            setAutoPlayId(msgs[0].id);
          }
        }
        setMessages(msgs);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchMessages(true);
    const es = new EventSource("http://localhost:3001/api/events");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.resource === "voice_messages") fetchMessages(false);
    };
    return () => es.close();
  }, []);

  const handleLikeClick = (id: number, isLiked: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLiked) {
      setUnlikeId(id);
    } else {
      fetch(`http://localhost:3001/api/voice_messages/${id}/like`, { method: "PATCH" });
    }
  };

  const confirmUnlike = () => {
    if (unlikeId) {
      fetch(`http://localhost:3001/api/voice_messages/${unlikeId}/like`, { method: "PATCH" });
      setUnlikeId(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr + "Z");
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  // Group messages by date
  const grouped = messages.reduce<Record<string, VoiceMessage[]>>((acc, msg) => {
    const d = new Date(msg.created_at + "Z");
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;
    if (d.toDateString() === today.toDateString()) label = "TODAY";
    else if (d.toDateString() === yesterday.toDateString()) label = "YESTERDAY";
    else label = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();

    if (!acc[label]) acc[label] = [];
    acc[label].push(msg);
    return acc;
  }, {});

  if (!voiceUnlocked) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white">
        <div className="text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-[#58a6ff]/10 flex items-center justify-center mx-auto">
            <Mic className="w-10 h-10 text-[#58a6ff]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#1a1a1a]" style={{ fontFamily: '"SF Pro Rounded", "Nunito", system-ui, sans-serif' }}>
              My Jarvis Voice
            </h1>
            <p className="text-sm text-[#999] mt-2">
              Tap below to enable voice playback
            </p>
          </div>
          <button
            onClick={handleStartVoice}
            className="px-8 py-3 rounded-full bg-[#58a6ff] text-white font-medium text-sm hover:bg-[#4090e0] transition-colors shadow-lg shadow-[#58a6ff]/25"
          >
            Start Voice
          </button>
        </div>
      </div>
    );
  }

  const miniMode = useIsMiniMode();

  return (
    <div className={`h-full flex flex-col ${miniMode ? "bg-[#f6f6f7]" : "bg-white"}`}>
      {/* Header — hidden in mini mode */}
      {!miniMode && (
      <div className="shrink-0 px-10 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#1a1a1a]" style={{ fontFamily: '"SF Pro Rounded", "Nunito", system-ui, sans-serif' }}>
            Welcome back, Erez
          </h1>
          <div className="flex items-center gap-4 text-sm text-[#666]">
            <span>🎙️ {messages.length} messages</span>
            <span>❤️ {messages.filter(m => m.liked).length} liked</span>
          </div>
        </div>
      </div>
      )}

      {/* Model download flow — shown until the local Kokoro model is present */}
      {!miniMode && <ModelDownloadBanner />}

      {/* Banner — hidden in mini mode */}
      {!miniMode && (
      <div className="shrink-0 px-10 pb-6">
        <div className="relative overflow-hidden rounded-2xl h-36">
          <div
            className="w-full h-full"
            style={{ background: "linear-gradient(120deg, #1e3a8a 0%, #4338ca 45%, #7c3aed 100%)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent flex items-end px-8 pb-4">
            <div>
              <h2 className="text-xl font-semibold text-white" style={{ fontFamily: '"SF Pro Rounded", "Nunito", system-ui, sans-serif' }}>
                Your AI voice companion
              </h2>
              <p className="text-white/70 text-sm mt-0.5">
                Play back, like your favorites, and choose your preferred voice
              </p>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Live Voice Panel */}
      <div className={`shrink-0 ${miniMode ? "px-3 pt-4" : "px-10"}`}>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <LiveVoicePanel />
        </div>
      </div>

      {/* Message Timeline */}
      <div className={`flex-1 overflow-y-auto ${miniMode ? "px-3 pt-2" : "px-10 pt-4"}`}>
        {Object.entries(grouped).map(([label, msgs]) => (
          <div key={label}>
            <div className="py-3">
              <span className="text-xs font-semibold text-[#999] tracking-wider">{label}</span>
            </div>
            <div className="space-y-px">
              {msgs.map((msg) => (
                  <div
                    key={msg.id}
                    className="py-3.5 px-4 -mx-4 rounded-xl hover:bg-black/[0.02] transition-colors group space-y-1.5"
                  >
                    {/* Top row: avatar + name + time + action icons */}
                    <div className="flex items-center gap-2">
                      {msg.agent && AGENT_META[msg.agent] ? (
                        <img
                          src={AGENT_META[msg.agent].avatar}
                          alt={AGENT_META[msg.agent].label}
                          className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-gray-200"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0 flex items-center justify-center">
                          <Mic className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                      )}
                      {msg.agent && AGENT_META[msg.agent] && (
                        <span className="text-sm font-medium text-[#1a1a1a]">
                          {AGENT_META[msg.agent].label}
                        </span>
                      )}
                      <span className="text-[10px] text-[#999] tabular-nums">
                        {formatTime(msg.created_at)}
                      </span>
                      {/* Action buttons */}
                      <div className={`flex items-center gap-0.5 ml-auto transition-opacity ${
                        msg.liked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(msg.message); }}
                          className="p-1 rounded-md hover:bg-black/5 text-[#999] hover:text-[#666] transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={`http://localhost:3001${msg.audio_path}`}
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded-md hover:bg-black/5 text-[#999] hover:text-[#666] transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={(e) => handleLikeClick(msg.id, !!msg.liked, e)}
                          className={`p-1 rounded-md transition-colors ${
                            msg.liked
                              ? "text-red-500 hover:bg-red-50"
                              : "text-[#999] hover:text-red-400 hover:bg-black/5"
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${msg.liked ? "fill-current" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {/* Message text — full width */}
                    <ExpandableText text={msg.message} />

                    {/* Player — full width */}
                    <VoicePlayerInline audioUrl={`http://localhost:3001${msg.audio_path}`} autoPlay={msg.id === autoPlayId} />
                  </div>
              ))}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">🎙️</div>
            <p className="text-sm text-[#999]">No voice messages yet</p>
            <p className="text-xs text-[#bbb] mt-1">Your AI conversations will appear here</p>
          </div>
        )}
      </div>
      <UnlikeConfirm
        isOpen={unlikeId !== null}
        onConfirm={confirmUnlike}
        onCancel={() => setUnlikeId(null)}
      />
    </div>
  );
}

VoicePalPage.path = "/voice-pal";
