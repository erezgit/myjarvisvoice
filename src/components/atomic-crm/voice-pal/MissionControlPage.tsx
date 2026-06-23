import { useState, useEffect, useRef } from "react";
import { VoicePlayerInline } from "./VoicePlayerInline";

type AgentName = "jarvis" | "atlas" | "nova" | "echo";

type VoiceMessage = {
  id: number;
  message: string;
  voice: string;
  audio_path: string;
  agent: string | null;
  created_at: string;
};

const AGENTS: { name: AgentName; label: string; color: string; emoji: string }[] = [
  { name: "jarvis", label: "Jarvis", color: "#2563eb", emoji: "🤖" },
  { name: "atlas", label: "Atlas", color: "#ea580c", emoji: "🧭" },
  { name: "nova", label: "Nova", color: "#7c3aed", emoji: "✨" },
  { name: "echo", label: "Echo", color: "#16a34a", emoji: "🔊" },
];

function formatTime(dateStr: string) {
  const d = new Date(dateStr + "Z");
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function AgentCard({ agent }: { agent: { name: AgentName; label: string; color: string; emoji: string } }) {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [autoPlayId, setAutoPlayId] = useState<number | null>(null);
  const latestIdRef = useRef<number>(0);

  const fetchMessages = (isInitial = false) => {
    fetch(`http://localhost:3001/api/voice_messages?agent=${agent.name}`)
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

  const latestUpdate = messages[0]?.created_at;

  return (
    <div className="bg-white rounded-xl h-full min-h-0 flex flex-col overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2 flex-shrink-0">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 ring-1 ring-gray-200"
          style={{ backgroundColor: agent.color + "15" }}
        >
          {agent.emoji}
        </div>
        <h3 className="font-semibold text-sm leading-none text-[#1a1a1a]">
          {agent.label}
        </h3>
        {latestUpdate && (
          <span className="ms-auto text-[10px] text-gray-400">
            {formatTime(latestUpdate)}
          </span>
        )}
      </div>

      {/* Scrollable messages — each with its own player */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 min-h-0">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-300 italic py-4 text-center">No updates yet</p>
        ) : (
          <div className="space-y-2 py-1">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-1">
                <p className="text-xs text-[#1a1a1a] leading-relaxed line-clamp-2">{msg.message}</p>
                <VoicePlayerInline
                  audioUrl={`http://localhost:3001${msg.audio_path}`}
                  autoPlay={msg.id === autoPlayId}
                />
                <span className="text-[10px] text-gray-400 block">{formatTime(msg.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function MissionControlPage() {
  return (
    <div className="fixed inset-0 left-[208px] flex flex-col px-10 pt-0 bg-white z-10">
      <div className="shrink-0 pt-4 pb-3">
        <h1 className="text-lg font-bold text-[#1a1a1a]">Mission Control</h1>
        <p className="text-xs text-gray-400">All agents, live voice feed</p>
      </div>

      <div className="flex-1 grid grid-cols-2 xl:grid-cols-4 xl:grid-rows-1 grid-rows-2 gap-3 min-h-0 pb-5">
        {AGENTS.map((a) => (
          <AgentCard key={a.name} agent={a} />
        ))}
      </div>
    </div>
  );
}

MissionControlPage.path = "/mission-control";
