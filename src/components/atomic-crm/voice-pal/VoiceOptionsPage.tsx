import { useState, useRef } from "react";
import { Check, Play, Pause, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/admin/use-theme";

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

export function VoiceOptionsPage() {
  const [selected, setSelected] = useState(() => localStorage.getItem("voice-pal-voice") || "nova");
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const selectVoice = (id: string) => {
    setSelected(id);
    localStorage.setItem("voice-pal-voice", id);
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
    <div className="h-full flex flex-col bg-background">
      <div className="shrink-0 px-5 pt-6 pb-4">
        <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: '"SF Pro Rounded", "Nunito", system-ui, sans-serif' }}>
          Voice Options
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Choose your preferred AI voice</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Voice (Local · Kokoro)</h2>
        <div className="flex flex-col gap-2.5">
          {voices.map((voice) => {
            const isSelected = selected === voice.id;
            const isPreviewing = previewingId === voice.id;
            return (
              <div
                key={voice.id}
                onClick={() => selectVoice(voice.id)}
                className={`relative flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  isSelected
                    ? "border-[#58a6ff] bg-[#58a6ff]/5"
                    : "border-border bg-card hover:bg-muted/60"
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={voice.avatar}
                    alt={voice.name}
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                  <div
                    className="hidden w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
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
                  <div className="text-sm font-semibold text-foreground">{voice.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{voice.description}</div>
                </div>
                <button
                  onClick={(e) => previewVoice(voice, e)}
                  className={`p-2 rounded-full transition-colors shrink-0 ${
                    isPreviewing
                      ? "bg-[#58a6ff] text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {isPreviewing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
              </div>
            );
          })}
        </div>

        {/* Appearance — dark mode (reuses the app's ThemeProvider / useTheme) */}
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-7 mb-3">Appearance</h2>
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-border bg-card hover:bg-muted/60 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-muted shrink-0">
            {isDark ? <Moon className="w-5 h-5 text-[#58a6ff]" /> : <Sun className="w-5 h-5 text-amber-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">Dark mode</div>
            <div className="text-xs text-muted-foreground mt-0.5">Match the dark terminals</div>
          </div>
          <div className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${isDark ? "bg-[#58a6ff]" : "bg-muted-foreground/30"}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isDark ? "translate-x-5" : "translate-x-1"}`} />
          </div>
        </button>
      </div>
    </div>
  );
}

VoiceOptionsPage.path = "/voice-pal/voices";
