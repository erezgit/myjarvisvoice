import { useState, useEffect } from "react";
import { Heart, Copy, Download } from "lucide-react";
import { VoicePlayerInline } from "./VoicePlayerInline";
import { UnlikeConfirm } from "./UnlikeConfirm";

type VoiceMessage = {
  id: number;
  message: string;
  voice: string;
  audio_path: string;
  duration_ms: number | null;
  liked: number;
  created_at: string;
};

export function LikesPage() {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [unlikeId, setUnlikeId] = useState<number | null>(null);

  const fetchMessages = () => {
    fetch("http://localhost:3001/api/voice_messages")
      .then((r) => r.json())
      .then((all: VoiceMessage[]) => setMessages(all.filter((m) => m.liked)))
      .catch(console.error);
  };

  useEffect(() => {
    fetchMessages();
    const es = new EventSource("http://localhost:3001/api/events");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.resource === "voice_messages") fetchMessages();
    };
    return () => es.close();
  }, []);

  const handleUnlike = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setUnlikeId(id);
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

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 px-10 pt-8 pb-4">
        <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: '"Nunito", "SF Pro Rounded", system-ui, sans-serif' }}>
          Liked Messages
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{messages.length} favorites</p>
      </div>

      {/* Banner */}
      <div className="shrink-0 px-10 pb-6">
        <div className="relative overflow-hidden rounded-2xl h-36">
          <div
            className="w-full h-full"
            style={{ background: "linear-gradient(120deg, #7f1d1d 0%, #be123c 50%, #7c3aed 100%)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/15 to-transparent flex items-end px-8 pb-4">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2" style={{ fontFamily: '"Nunito", "SF Pro Rounded", system-ui, sans-serif' }}>
                <Heart className="w-5 h-5 fill-current text-red-400" />
                Your favorites
              </h2>
              <p className="text-white/70 text-sm mt-0.5">
                Messages you loved, saved for easy replay
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-10">
        <div className="space-y-px">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="flex items-start gap-5 py-3.5 px-4 -mx-4 rounded-xl hover:bg-black/[0.02] transition-colors group"
            >
              {/* Time */}
              <span className="text-sm text-muted-foreground w-20 shrink-0 tabular-nums pt-0.5">
                {formatTime(msg.created_at)}
              </span>

              {/* Content: text + player */}
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-sm text-foreground leading-relaxed">
                  {msg.message}
                </p>
                <VoicePlayerInline audioUrl={`http://localhost:3001${msg.audio_path}`} />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0 pt-0.5 opacity-100">
                <button
                  onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(msg.message); }}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <a
                  href={`http://localhost:3001${msg.audio_path}`}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={(e) => handleUnlike(msg.id, e)}
                  className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {messages.length === 0 && (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">❤️</div>
            <p className="text-sm text-muted-foreground">No liked messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">Heart a message to save it here</p>
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

LikesPage.path = "/voice-pal/likes";
