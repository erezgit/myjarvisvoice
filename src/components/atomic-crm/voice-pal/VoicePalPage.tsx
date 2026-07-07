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

// Full MyJarvis roster → avatar + brand color. Keys are lowercase; look them up
// via agentMeta() so a capitalized agent_name ("Atlas") still resolves.
const AGENT_META: Record<string, { label: string; avatar: string; color: string }> = {
  jarvis: { label: "Jarvis", avatar: "/avatars/jarvis.jpg", color: "#2563eb" },
  atlas: { label: "Atlas", avatar: "/avatars/atlas.jpg", color: "#ea580c" },
  ben: { label: "Ben", avatar: "/avatars/ben.jpg", color: "#0891b2" },
  nova: { label: "Nova", avatar: "/avatars/nova.jpg", color: "#7c3aed" },
  emma: { label: "Emma", avatar: "/avatars/emma.jpg", color: "#db2777" },
  cleo: { label: "Cleo", avatar: "/avatars/cleo.jpg", color: "#65a30d" },
  kai: { label: "Kai", avatar: "/avatars/kai.jpg", color: "#0ea5e9" },
  dave: { label: "Dave", avatar: "/avatars/dave.jpg", color: "#a16207" },
  leo: { label: "Leo", avatar: "/avatars/leo.jpg", color: "#f59e0b" },
  echo: { label: "Echo", avatar: "/avatars/echo.jpg", color: "#16a34a" },
};

function agentMeta(agent: string | null) {
  return agent ? AGENT_META[agent.toLowerCase()] : undefined;
}

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <p
      className={`text-[15px] text-foreground leading-relaxed ${expanded ? "" : "line-clamp-4"} cursor-pointer`}
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
    <div className="flex h-full flex-col bg-background">
      {/* Model download flow — shows only until the local Kokoro model is present */}
      <ModelDownloadBanner />

      {/* Today's voice feed */}
      <div className="flex-1 px-4 py-4 space-y-2.5">
        {todayMessages.map((msg) => (
          <div
            key={msg.id}
            className="group rounded-xl border border-border bg-card px-4 py-3.5 space-y-2.5 transition-colors hover:border-muted-foreground/30"
          >
            {/* Top row: avatar + name + time + action icons */}
            <div className="flex items-center gap-2">
              {agentMeta(msg.agent) ? (
                <img
                  src={agentMeta(msg.agent)!.avatar}
                  alt={agentMeta(msg.agent)!.label}
                  className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-border"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-muted shrink-0 flex items-center justify-center">
                  <Mic className="w-3 h-3 text-muted-foreground" />
                </div>
              )}
              {agentMeta(msg.agent) && (
                <span className="text-sm font-medium text-foreground">
                  {agentMeta(msg.agent)!.label}
                </span>
              )}
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {formatTime(msg.created_at)}
              </span>
              {/* Action buttons */}
              <div className={`flex items-center gap-0.5 ml-auto transition-opacity ${
                msg.liked ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}>
                <button
                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(msg.message); }}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <a
                  href={`http://localhost:3001${msg.audio_path}`}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={(e) => handleLikeClick(msg.id, !!msg.liked, e)}
                  className={`p-1 rounded-md transition-colors ${
                    msg.liked
                      ? "text-red-500 hover:bg-red-500/10"
                      : "text-muted-foreground hover:text-red-400 hover:bg-muted"
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
            <p className="text-sm text-muted-foreground">No voice messages yet today</p>
            <p className="text-xs text-muted-foreground mt-1">New messages will appear here</p>
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
