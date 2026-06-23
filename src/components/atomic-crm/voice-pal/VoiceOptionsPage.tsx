import { useState, useRef } from "react";
import { Check, Play, Pause } from "lucide-react";

type VoiceOption = {
  id: string;
  name: string;
  description: string;
  avatar: string;
  color: string;
};

const voices: VoiceOption[] = [
  { id: "alloy", name: "Alloy", description: "Neutral and balanced", avatar: "/avatars/voice-alloy.jpg", color: "#6b7280" },
  { id: "echo", name: "Echo", description: "Warm and clear", avatar: "/avatars/voice-echo.jpg", color: "#58a6ff" },
  { id: "fable", name: "Fable", description: "Expressive and British", avatar: "/avatars/voice-fable.jpg", color: "#f0883e" },
  { id: "onyx", name: "Onyx", description: "Deep and authoritative", avatar: "/avatars/voice-onyx.jpg", color: "#1a1a2e" },
  { id: "nova", name: "Nova", description: "Friendly and upbeat", avatar: "/avatars/voice-nova.jpg", color: "#a78bfa" },
  { id: "shimmer", name: "Shimmer", description: "Soft and gentle", avatar: "/avatars/voice-shimmer.jpg", color: "#3fb950" },
];

const grokVoices: VoiceOption[] = [
  { id: "Rex", name: "Rex", description: "Professional, confident, clear", avatar: "", color: "#3b82f6" },
  { id: "Leo", name: "Leo", description: "Authoritative, strong, decisive", avatar: "", color: "#f59e0b" },
  { id: "Sal", name: "Sal", description: "Smooth, balanced, versatile", avatar: "", color: "#8b5cf6" },
  { id: "Ara", name: "Ara", description: "Warm, friendly, conversational", avatar: "", color: "#ec4899" },
  { id: "Eve", name: "Eve", description: "Energetic, upbeat, engaging", avatar: "", color: "#10b981" },
];

const grokSampleTexts: Record<string, string> = {
  Rex: "Good to see you. I'm Rex — professional and clear. Let's get down to business.",
  Leo: "I'm Leo. When you need authority and direction, I'm here. What's the plan?",
  Sal: "Hey, I'm Sal. Smooth and easy going. I adapt to whatever you need.",
  Ara: "Hi there! I'm Ara. Warm and friendly, always happy to chat. How can I help?",
  Eve: "Hey! I'm Eve, full of energy and ready to go. What are we working on?",
};

const sampleTexts: Record<string, string> = {
  alloy: "Hey there, I'm Alloy. I keep things straightforward and easy to follow. What would you like to work on today?",
  echo: "Good to see you. I'm Echo — I'll keep you informed with a warm, steady tone. Let's get started.",
  fable: "Hello! I'm Fable. I bring a bit of character and expressiveness to everything I say. Shall we begin?",
  onyx: "I'm Onyx. When you need clarity and authority, I'm your voice. What's on the agenda?",
  nova: "Hi! I'm Nova, and I'm here to keep things upbeat and moving. Ready when you are!",
  shimmer: "Hey, I'm Shimmer. I'll guide you through things gently and clearly. How can I help?",
};

export function VoiceOptionsPage() {
  const [selected, setSelected] = useState(() => localStorage.getItem("voice-pal-voice") || "nova");
  const [liveSelected, setLiveSelected] = useState(() => localStorage.getItem("grok-live-voice") || "Rex");
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const selectVoice = (id: string) => {
    setSelected(id);
    localStorage.setItem("voice-pal-voice", id);
  };

  const selectLiveVoice = (id: string) => {
    setLiveSelected(id);
    localStorage.setItem("grok-live-voice", id);
  };

  const previewGrokVoice = async (voice: VoiceOption, e: React.MouseEvent) => {
    e.stopPropagation();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (previewingId === voice.id) {
      setPreviewingId(null);
      return;
    }

    setPreviewingId(voice.id);
    try {
      const res = await fetch("/api/voice-preview-xai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: grokSampleTexts[voice.id] || "Hello, this is a voice preview.", voice: voice.id }),
      });
      if (!res.ok) throw new Error("Preview failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch(() => setPreviewingId(null));
      audio.onended = () => {
        setPreviewingId(null);
        audioRef.current = null;
        URL.revokeObjectURL(url);
      };
    } catch {
      setPreviewingId(null);
    }
  };

  const previewVoice = (voice: VoiceOption, e: React.MouseEvent) => {
    e.stopPropagation();

    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (previewingId === voice.id) {
      setPreviewingId(null);
      return;
    }

    // Play from local pre-generated file — instant, no API call
    const audio = new Audio(`/voice-samples/${voice.id}.mp3`);
    audioRef.current = audio;
    setPreviewingId(voice.id);
    audio.play().catch(() => setPreviewingId(null));
    audio.onended = () => {
      setPreviewingId(null);
      audioRef.current = null;
    };
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="shrink-0 px-10 pt-8 pb-6">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]" style={{ fontFamily: '"SF Pro Rounded", "Nunito", system-ui, sans-serif' }}>
          Voice Options
        </h1>
        <p className="text-sm text-[#999] mt-1">Choose your preferred AI voice</p>
      </div>

      <div className="flex-1 overflow-y-auto px-10 pb-10">
        {/* Voice (Local Kokoro) */}
        <h2 className="text-sm font-medium text-[#999] uppercase tracking-wider mb-3">Voice (Local · Kokoro)</h2>
        <div className="grid grid-cols-2 gap-4 max-w-2xl mb-10">
          {voices.map((voice) => {
            const isSelected = selected === voice.id;
            const isPreviewing = previewingId === voice.id;
            return (
              <div
                key={voice.id}
                onClick={() => selectVoice(voice.id)}
                className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#58a6ff] bg-[#58a6ff]/5"
                    : "border-transparent bg-white hover:bg-[#f5f5f5]"
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={voice.avatar}
                    alt={voice.name}
                    className="w-14 h-14 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                  <div
                    className="hidden w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold"
                    style={{ backgroundColor: voice.color }}
                  >
                    {voice.name[0]}
                  </div>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#58a6ff] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#1a1a1a]">{voice.name}</div>
                  <div className="text-xs text-[#999] mt-0.5">{voice.description}</div>
                </div>
                <button
                  onClick={(e) => previewVoice(voice, e)}
                  className={`p-2 rounded-full transition-colors shrink-0 ${
                    isPreviewing
                      ? "bg-[#58a6ff] text-white"
                      : "bg-[#f0f0f0] text-[#666] hover:bg-[#e5e5e5]"
                  }`}
                >
                  {isPreviewing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
              </div>
            );
          })}
        </div>

        {/* Alternate local voice styles */}
        <h2 className="text-sm font-medium text-[#999] uppercase tracking-wider mb-1">More Voices (Local · Kokoro)</h2>
        <p className="text-xs text-[#bbb] mb-3">Additional voice styles — all synthesized offline, no cost</p>
        <div className="grid grid-cols-2 gap-4 max-w-2xl">
          {grokVoices.map((voice) => {
            const isSelected = liveSelected === voice.id;
            const isPreviewing = previewingId === voice.id;
            return (
              <div
                key={voice.id}
                onClick={() => selectLiveVoice(voice.id)}
                className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#8b5cf6] bg-[#8b5cf6]/5"
                    : "border-transparent bg-white hover:bg-[#f5f5f5]"
                }`}
              >
                <div className="relative shrink-0">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold"
                    style={{ backgroundColor: voice.color }}
                  >
                    {voice.name[0]}
                  </div>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#8b5cf6] flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#1a1a1a]">{voice.name}</div>
                  <div className="text-xs text-[#999] mt-0.5">{voice.description}</div>
                </div>
                <button
                  onClick={(e) => previewGrokVoice(voice, e)}
                  className={`p-2 rounded-full transition-colors shrink-0 ${
                    isPreviewing
                      ? "bg-[#8b5cf6] text-white"
                      : "bg-[#f0f0f0] text-[#666] hover:bg-[#e5e5e5]"
                  }`}
                >
                  {isPreviewing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

VoiceOptionsPage.path = "/voice-pal/voices";
