import { useState, useEffect, useRef } from "react";
import { Heart, Copy, Download, Mic } from "lucide-react";
import { VoicePlayerInline } from "./VoicePlayerInline";
import { UnlikeConfirm } from "./UnlikeConfirm";
import { ModelDownloadBanner } from "./ModelDownloadBanner";

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
      className={`text-[15px] text-[#1a1a1a] leading-relaxed ${expanded ? "" : "line-clamp-4"} cursor-pointer`}
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
  const latestIdRef = useRef<number>(0);

  // The player is the single source of truth: when a NEW message arrives we flag
  // it so the inline player auto-plays it (sound + progress bar together).
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

  // Homepage shows only TODAY's feed.
  const today = new Date();
  const todayMessages = messages.filter((msg) => {
    const d = new Date(msg.created_at + "Z");
    return d.toDateString() === today.toDateString();
  });

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Model download flow — shows only until the local Kokoro model is present */}
      <ModelDownloadBanner />

      {/* Today's voice feed */}
      <div className="flex-1 px-4 py-4 space-y-2.5">
        {todayMessages.map((msg) => (
          <div
            key={msg.id}
            className="group rounded-xl border border-gray-200 bg-white px-4 py-3.5 space-y-2.5 transition-colors hover:border-gray-300"
          >
            {/* Top row: avatar + name + time + action icons */}
            <div className="flex items-center gap-2">
              {msg.agent && AGENT_META[msg.agent] ? (
                <img
                  src={AGENT_META[msg.agent].avatar}
                  alt={AGENT_META[msg.agent].label}
                  className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-gray-200"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-100 shrink-0 flex items-center justify-center">
                  <Mic className="w-3 h-3 text-gray-400" />
                </div>
              )}
              {msg.agent && AGENT_META[msg.agent] && (
                <span className="text-sm font-medium text-[#1a1a1a]">
                  {AGENT_META[msg.agent].label}
                </span>
              )}
              <span className="text-[11px] text-[#999] tabular-nums">
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

            {/* Message text */}
            <ExpandableText text={msg.message} />

            {/* Player — single source of truth for sound + progress */}
            <VoicePlayerInline audioUrl={`http://localhost:3001${msg.audio_path}`} autoPlay={msg.id === autoPlayId} />
          </div>
        ))}

        {todayMessages.length === 0 && (
          <div className="text-center py-24">
            <div className="text-4xl mb-3">🎙️</div>
            <p className="text-sm text-[#999]">No voice messages yet today</p>
            <p className="text-xs text-[#bbb] mt-1">New messages will appear here</p>
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
