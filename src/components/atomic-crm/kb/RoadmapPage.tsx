import { useState } from "react";
import {
  Rocket,
  Flag,
  TrendingUp,
  Globe,
  Layers,
  HelpCircle,
  Users,
  Package,
  Megaphone,
  Mic,
  MessageSquare,
  User,
  Handshake,
  CircleDollarSign,
  ArrowRight,
  Check,
  X,
  AlertTriangle,
  Phone,
  PhoneCall,
  Bot,
  Zap,
  Shield,
} from "lucide-react";
import { useContentPage } from "../hooks/useContentPage";
import { EditableText } from "../misc/EditableText";

const BLUE = "#58a6ff";
const ORANGE = "#f0883e";
const PURPLE = "#a78bfa";
const GREEN = "#3fb950";
const RED = "#f85149";

type Phase = {
  id: string;
  title: string;
  month: string;
  tagline: string;
  motto: string;
  target_metric: string;
  target_description: string;
  activities: string[];
  product_questions: string[];
  hiring_questions: string[];
  team_notes: string[];
};

type ParallelTrack = {
  title: string;
  timeline: string;
  items: string[];
};

type FounderAnswer = {
  founder: string;
  points: string[];
};

type DiscussionTopic = {
  question: string;
  status: string;
  answers: FounderAnswer[];
  next_steps: string[];
};

type RoadmapContent = {
  title: string;
  subtitle: string;
  phases: Phase[];
  parallel_tracks: ParallelTrack[];
  discussions: DiscussionTopic[];
  footer: string;
};

const PHASE_STYLES: { color: string; icon: typeof Rocket }[] = [
  { color: BLUE, icon: Layers },
  { color: GREEN, icon: Flag },
  { color: ORANGE, icon: TrendingUp },
  { color: PURPLE, icon: Globe },
];

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "phase-0", label: "Phase 0" },
  { id: "phase-1", label: "Phase 1" },
  { id: "phase-2", label: "Phase 2" },
  { id: "phase-3", label: "Phase 3" },
  { id: "parallel", label: "Parallel" },
  { id: "answers", label: "Answers" },
  { id: "partners", label: "Partners" },
  { id: "voice", label: "Voice" },
];

const FOUNDER_COLORS: Record<string, string> = {
  Erez: BLUE,
  Tom: GREEN,
  Dvir: ORANGE,
  Yaron: PURPLE,
};

function PhaseCard({
  phase,
  index,
  updateField,
}: {
  phase: Phase;
  index: number;
  updateField: (path: string, value: string) => void;
}) {
  const style = PHASE_STYLES[index] ?? PHASE_STYLES[0];
  const Icon = style.icon;
  const color = style.color;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-xl p-6 border"
        style={{
          backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
          borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
        }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ color, backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
              >
                {phase.id}
              </span>
              <span className="text-xs text-muted-foreground">{phase.month}</span>
            </div>
            <EditableText
              value={phase.title}
              onSave={(v) => updateField(`phases.${index}.title`, v)}
              className="text-xl font-bold text-foreground mt-1"
            />
          </div>
        </div>
        <EditableText
          value={phase.tagline}
          onSave={(v) => updateField(`phases.${index}.tagline`, v)}
          className="text-sm text-muted-foreground italic"
        />
      </div>

      {/* Target Metric */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Rocket className="w-4 h-4" style={{ color }} />
          <span className="text-sm font-semibold" style={{ color }}>
            Target Metric
          </span>
        </div>
        <EditableText
          value={phase.target_metric}
          onSave={(v) => updateField(`phases.${index}.target_metric`, v)}
          className="text-2xl font-bold text-foreground mb-1"
        />
        <EditableText
          value={phase.target_description}
          onSave={(v) => updateField(`phases.${index}.target_description`, v)}
          className="text-sm text-muted-foreground"
          multiline
        />
      </div>

      {/* Key Activities */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4" style={{ color }} />
          <span className="text-sm font-semibold" style={{ color }}>
            Key Activities
          </span>
        </div>
        <div className="space-y-2">
          {phase.activities.map((activity, i) => (
            <div key={i} className="flex items-start gap-3">
              <span
                className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                style={{
                  backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
                  color,
                }}
              >
                {i + 1}
              </span>
              <EditableText
                value={activity}
                onSave={(v) => updateField(`phases.${index}.activities.${i}`, v)}
                className="text-sm text-muted-foreground flex-1"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Product Requirements */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-amber-400">
            Product Requirements & Questions
          </span>
        </div>
        <div className="space-y-2">
          {phase.product_questions.map((q, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-amber-400 text-sm mt-0.5">?</span>
              <EditableText
                value={q}
                onSave={(v) => updateField(`phases.${index}.product_questions.${i}`, v)}
                className="text-sm text-muted-foreground flex-1"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Hiring & Team */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4" style={{ color: PURPLE }} />
          <span className="text-sm font-semibold" style={{ color: PURPLE }}>
            Hiring & Team
          </span>
        </div>
        <div className="space-y-2">
          {phase.hiring_questions.map((q, i) => (
            <div key={i} className="flex items-start gap-3">
              <span style={{ color: PURPLE }} className="text-sm mt-0.5">?</span>
              <EditableText
                value={q}
                onSave={(v) => updateField(`phases.${index}.hiring_questions.${i}`, v)}
                className="text-sm text-muted-foreground flex-1"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Team Notes */}
      <div
        className="rounded-xl p-5 border"
        style={{
          backgroundColor: `color-mix(in srgb, ${GREEN} 5%, transparent)`,
          borderColor: `color-mix(in srgb, ${GREEN} 20%, transparent)`,
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="w-4 h-4" style={{ color: GREEN }} />
          <span className="text-sm font-semibold" style={{ color: GREEN }}>
            Team Notes & Discussion
          </span>
        </div>
        <div className="space-y-2">
          {phase.team_notes.map((note, i) => (
            <div key={i} className="flex items-start gap-3">
              <span style={{ color: GREEN }} className="text-sm mt-0.5">•</span>
              <EditableText
                value={note}
                onSave={(v) => updateField(`phases.${index}.team_notes.${i}`, v)}
                className="text-sm text-muted-foreground flex-1"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  content,
  updateField,
}: {
  content: RoadmapContent;
  updateField: (path: string, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Timeline */}
      <div className="space-y-4">
        {content.phases.map((phase, i) => {
          const style = PHASE_STYLES[i] ?? PHASE_STYLES[0];
          const Icon = style.icon;
          const color = style.color;
          return (
            <div
              key={i}
              className="flex items-start gap-5 rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/40"
            >
              <div className="flex flex-col items-center">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
                >
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>
                {i < content.phases.length - 1 && (
                  <div className="w-px h-8 bg-border mt-2" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ color, backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
                  >
                    {phase.id}
                  </span>
                  <span className="text-xs text-muted-foreground">{phase.month}</span>
                </div>
                <EditableText
                  value={phase.title}
                  onSave={(v) => updateField(`phases.${i}.title`, v)}
                  className="text-lg font-bold text-foreground"
                />
                <EditableText
                  value={phase.tagline}
                  onSave={(v) => updateField(`phases.${i}.tagline`, v)}
                  className="text-sm text-muted-foreground italic mt-1"
                />
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className="text-sm font-bold"
                    style={{ color }}
                  >
                    {phase.target_metric}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Parallel Tracks */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4" style={{ color: RED }} />
          <span className="text-sm font-semibold" style={{ color: RED }}>
            Parallel Initiatives
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {content.parallel_tracks.map((track, i) => {
            const trackColor = i === 0 ? ORANGE : GREEN;
            const TrackIcon = i === 0 ? Mic : Megaphone;
            return (
              <div
                key={i}
                className="rounded-lg p-4 border"
                style={{
                  backgroundColor: `color-mix(in srgb, ${trackColor} 5%, transparent)`,
                  borderColor: `color-mix(in srgb, ${trackColor} 20%, transparent)`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrackIcon className="w-4 h-4" style={{ color: trackColor }} />
                  <EditableText
                    value={track.title}
                    onSave={(v) => updateField(`parallel_tracks.${i}.title`, v)}
                    className="text-sm font-semibold"
                    style={{ color: trackColor }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{track.timeline}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ParallelTab({
  content,
  updateField,
}: {
  content: RoadmapContent;
  updateField: (path: string, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      {content.parallel_tracks.map((track, i) => {
        const trackColor = i === 0 ? ORANGE : GREEN;
        const TrackIcon = i === 0 ? Mic : Megaphone;
        return (
          <div
            key={i}
            className="rounded-xl p-6 border"
            style={{
              backgroundColor: `color-mix(in srgb, ${trackColor} 5%, transparent)`,
              borderColor: `color-mix(in srgb, ${trackColor} 25%, transparent)`,
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, ${trackColor} 20%, transparent)` }}
              >
                <TrackIcon className="w-5 h-5" style={{ color: trackColor }} />
              </div>
              <div>
                <EditableText
                  value={track.title}
                  onSave={(v) => updateField(`parallel_tracks.${i}.title`, v)}
                  className="text-base font-bold"
                  style={{ color: trackColor }}
                />
                <span className="text-xs text-muted-foreground">{track.timeline}</span>
              </div>
            </div>
            <div className="space-y-2">
              {track.items.map((item, j) => (
                <div key={j} className="flex items-start gap-3">
                  <span
                    className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${trackColor} 12%, transparent)`,
                      color: trackColor,
                    }}
                  >
                    {j + 1}
                  </span>
                  <EditableText
                    value={item}
                    onSave={(v) => updateField(`parallel_tracks.${i}.items.${j}`, v)}
                    className="text-sm text-muted-foreground flex-1"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VoiceTab() {
  const approaches = [
    {
      name: "Full Platform (Turnkey)",
      description: "End-to-end voice AI platforms — you configure, they handle telephony, STT, LLM, TTS, and infrastructure.",
      color: BLUE,
      icon: Phone,
      providers: [
        { name: "Vapi", pricing: "$0.05-0.15/min + LLM costs", strengths: "Most popular. Great API, easy integration, supports custom LLMs. Function calling, transfers, voicemail.", weaknesses: "Vendor lock-in. Costs add up at scale. Less control over latency." },
        { name: "Retell AI", pricing: "$0.07-0.15/min + LLM costs", strengths: "Very low latency (<800ms). Good dashboard. Emotion detection. Multi-language.", weaknesses: "Newer, smaller community. Fewer integrations than Vapi." },
        { name: "Bland AI", pricing: "$0.07-0.12/min", strengths: "Enterprise focus. Human-like voices. Good for outbound campaigns. Batch calling.", weaknesses: "Less developer-friendly. More sales-oriented than conversational AI." },
        { name: "Synthflow", pricing: "$0.08-0.13/min", strengths: "No-code builder. Good for non-technical teams. White-label ready.", weaknesses: "Less customizable. Limited advanced workflows." },
        { name: "Air AI", pricing: "Custom pricing", strengths: "Autonomous agents that can handle full sales calls. Very human-like.", weaknesses: "Expensive. Black box. Less control over agent behavior." },
      ],
    },
    {
      name: "Build Your Own Stack",
      description: "Assemble your own pipeline from best-in-class components: telephony + STT + LLM + TTS.",
      color: ORANGE,
      icon: Zap,
      providers: [
        { name: "Twilio + Deepgram + Claude + ElevenLabs", pricing: "~$0.03-0.08/min total", strengths: "Full control. Best-in-class components. Cheapest at scale. Own your data.", weaknesses: "Complex to build and maintain. Latency management is on you. Need engineers." },
        { name: "LiveKit + STT + LLM + TTS", pricing: "~$0.02-0.06/min", strengths: "Open source real-time framework. WebRTC. Very low latency. Self-hostable.", weaknesses: "Significant engineering effort. Need to handle edge cases (interruptions, silence, etc.)." },
        { name: "Pipecat (by Daily)", pricing: "Open source + component costs", strengths: "Open source Python framework for voice agents. Modular. Growing community.", weaknesses: "Still maturing. Less production-hardened. Python-only." },
      ],
    },
    {
      name: "Messaging-First (Not Phone)",
      description: "Voice messages in chat apps — not phone calls. User sends voice, AI responds with voice/text.",
      color: GREEN,
      icon: Mic,
      providers: [
        { name: "WhatsApp Voice Messages + Whisper + TTS", pricing: "~$0.01-0.03/message", strengths: "Async — no real-time pressure. Users already familiar. Works globally. Very cheap.", weaknesses: "Not real-time conversation. Back-and-forth latency. Less 'wow' factor." },
        { name: "In-App Voice (Web Speech API + LLM)", pricing: "~$0.01-0.02/interaction", strengths: "Browser-native. No telephony costs. Instant. Works in your existing app.", weaknesses: "Browser compatibility varies. Needs microphone permission. No phone number." },
        { name: "Telegram / Slack Voice + AI", pricing: "~$0.01-0.03/message", strengths: "Meet users where they are. Easy to prototype. Low friction.", weaknesses: "Platform dependent. Limited control over UX." },
      ],
    },
  ];

  const components = [
    { category: "Speech-to-Text (STT)", options: [
      { name: "Deepgram", detail: "Fastest. ~300ms latency. Best for real-time. $0.0043/min", color: BLUE },
      { name: "OpenAI Whisper", detail: "Most accurate. Open source option. $0.006/min (API) or free (self-hosted)", color: GREEN },
      { name: "AssemblyAI", detail: "Good accuracy + diarization. $0.01/min. Real-time available.", color: ORANGE },
      { name: "Google Cloud STT", detail: "Multi-language leader. $0.006-0.009/min. Best for non-English.", color: PURPLE },
    ]},
    { category: "Text-to-Speech (TTS)", options: [
      { name: "ElevenLabs", detail: "Most natural voices. Voice cloning. $0.03/1K chars. Industry leader.", color: BLUE },
      { name: "OpenAI TTS", detail: "Good quality, fast. $0.015/1K chars. Simple API.", color: GREEN },
      { name: "Cartesia (Sonic)", detail: "Ultra-low latency (<100ms). Streaming. Great for real-time. New but impressive.", color: ORANGE },
      { name: "PlayHT", detail: "Good voices, affordable. Voice cloning. $0.02/1K chars.", color: PURPLE },
      { name: "Deepgram Aura", detail: "Fast TTS from Deepgram. Low latency. Pairs well with their STT.", color: RED },
    ]},
    { category: "Telephony", options: [
      { name: "Twilio", detail: "Industry standard. Global numbers. $0.013/min. Most integrations.", color: BLUE },
      { name: "Vonage", detail: "Good alternative. WebSocket support. $0.01/min.", color: GREEN },
      { name: "Telnyx", detail: "Developer-friendly. Cheaper than Twilio. $0.005/min. Good latency.", color: ORANGE },
    ]},
    { category: "LLM (The Brain)", options: [
      { name: "Claude (Anthropic)", detail: "Best reasoning. Long context. Great for complex conversations. $3-15/M tokens.", color: BLUE },
      { name: "GPT-4o (OpenAI)", detail: "Fast, multimodal. Native voice mode coming. $2.5-10/M tokens.", color: GREEN },
      { name: "Gemini Flash (Google)", detail: "Cheapest for speed. Good enough for simple flows. $0.075/M tokens.", color: ORANGE },
      { name: "Groq (Llama 3)", detail: "Fastest inference. Open models. $0.05-0.08/M tokens. Best for latency.", color: PURPLE },
    ]},
  ];

  return (
    <div className="space-y-8">
      {/* Intro */}
      <div
        className="rounded-xl p-6 border"
        style={{
          backgroundColor: `color-mix(in srgb, ${ORANGE} 8%, transparent)`,
          borderColor: `color-mix(in srgb, ${ORANGE} 25%, transparent)`,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <PhoneCall className="w-5 h-5" style={{ color: ORANGE }} />
          <span className="text-lg font-bold" style={{ color: ORANGE }}>
            Voice Agent Options — Full Landscape
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Three fundamentally different approaches to voice AI, each with different cost, complexity, and user experience tradeoffs.
          The key decision: <strong className="text-foreground">real-time phone calls</strong> vs{" "}
          <strong className="text-foreground">async voice messages</strong> vs{" "}
          <strong className="text-foreground">in-app voice</strong>. Each serves different use cases.
        </p>
      </div>

      {/* 3 Approaches */}
      {approaches.map((approach, ai) => {
        const Icon = approach.icon;
        return (
          <div key={ai} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-5 border-b border-border">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `color-mix(in srgb, ${approach.color} 15%, transparent)` }}
                >
                  <Icon className="w-4 h-4" style={{ color: approach.color }} />
                </div>
                <span className="text-base font-bold" style={{ color: approach.color }}>
                  {approach.name}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{approach.description}</p>
            </div>
            <div className="divide-y divide-border">
              {approach.providers.map((p, pi) => (
                <div key={pi} className="p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-foreground">{p.name}</span>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        color: approach.color,
                        backgroundColor: `color-mix(in srgb, ${approach.color} 10%, transparent)`,
                      }}
                    >
                      {p.pricing}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Check className="w-3 h-3" style={{ color: GREEN }} />
                        <span className="text-[10px] font-semibold" style={{ color: GREEN }}>Strengths</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.strengths}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <AlertTriangle className="w-3 h-3" style={{ color: ORANGE }} />
                        <span className="text-[10px] font-semibold" style={{ color: ORANGE }}>Weaknesses</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.weaknesses}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Component Breakdown */}
      <div
        className="rounded-xl p-6 border"
        style={{
          backgroundColor: `color-mix(in srgb, ${PURPLE} 8%, transparent)`,
          borderColor: `color-mix(in srgb, ${PURPLE} 25%, transparent)`,
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Bot className="w-5 h-5" style={{ color: PURPLE }} />
          <span className="text-base font-bold" style={{ color: PURPLE }}>
            Component Breakdown — Build Your Own
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          If you build your own stack, here are the best options for each layer of the pipeline.
        </p>

        {components.map((cat, ci) => (
          <div key={ci} className="mb-5 last:mb-0">
            <span className="text-xs font-semibold text-foreground mb-2 block">{cat.category}</span>
            <div className="grid grid-cols-2 gap-2">
              {cat.options.map((opt, oi) => (
                <div
                  key={oi}
                  className="rounded-lg p-3"
                  style={{ backgroundColor: `color-mix(in srgb, ${opt.color} 5%, transparent)` }}
                >
                  <span className="text-xs font-bold" style={{ color: opt.color }}>{opt.name}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{opt.detail}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Cost Comparison */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <CircleDollarSign className="w-4 h-4" style={{ color: GREEN }} />
          <span className="text-sm font-semibold" style={{ color: GREEN }}>
            Cost Comparison — 1,000 Minutes/Month
          </span>
        </div>
        <div className="space-y-2">
          {[
            { approach: "Turnkey (Vapi/Retell)", cost: "$50-150/mo", complexity: "Low", timeToLaunch: "1-2 weeks", color: BLUE },
            { approach: "Build Your Own", cost: "$30-80/mo", complexity: "High", timeToLaunch: "2-3 months", color: ORANGE },
            { approach: "Async Voice Messages", cost: "$10-30/mo", complexity: "Low-Medium", timeToLaunch: "1-2 weeks", color: GREEN },
          ].map((row, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <span className="text-sm font-bold w-44 flex-shrink-0" style={{ color: row.color }}>{row.approach}</span>
              <div className="flex-1 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span><strong className="text-foreground">{row.cost}</strong> /mo</span>
                <span>Complexity: <strong className="text-foreground">{row.complexity}</strong></span>
                <span>Launch: <strong className="text-foreground">{row.timeToLaunch}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div
        className="rounded-xl p-6 border"
        style={{
          backgroundColor: `color-mix(in srgb, ${GREEN} 8%, transparent)`,
          borderColor: `color-mix(in srgb, ${GREEN} 25%, transparent)`,
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4" style={{ color: GREEN }} />
          <span className="text-sm font-semibold" style={{ color: GREEN }}>
            Recommended Path for myJarvis
          </span>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="space-y-2 ml-2">
            <div className="flex items-start gap-2">
              <span style={{ color: GREEN }} className="font-bold">Phase 1:</span>
              <span><strong className="text-foreground">Start with in-app voice messages</strong> — user speaks in the chat, Whisper transcribes, AI responds with text + ElevenLabs/OpenAI voice. Cheapest, fastest to ship, zero telephony complexity.</span>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: ORANGE }} className="font-bold">Phase 2:</span>
              <span><strong className="text-foreground">Add WhatsApp voice message support</strong> — users send voice notes, get AI voice responses back. Massive reach, async, low cost.</span>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: BLUE }} className="font-bold">Phase 3:</span>
              <span><strong className="text-foreground">Real-time phone agents via Vapi or Retell</strong> — once you have 50+ clients and proven the voice use case, invest in real-time. Start with a turnkey platform, migrate to custom stack at scale.</span>
            </div>
          </div>
          <p className="mt-3 text-xs">
            <strong className="text-foreground">Key insight:</strong> Don't start with phone calls. Start with voice-in-chat.
            It's 10x cheaper, 10x faster to build, and proves the concept before you invest in telephony infrastructure.
          </p>
        </div>
      </div>
    </div>
  );
}

function PartnersTab() {
  const models = [
    {
      name: "Referral Fee (One-Time)",
      description: "Partner refers a client, gets a flat fee or % of first deal when client signs.",
      typical: "10-25% of first year's revenue, or $50-500 flat per referral",
      color: GREEN,
      pros: ["Simple to track and pay", "Clean — one payment, done", "Easy to explain to partners", "Low ongoing cost"],
      cons: ["No incentive for partner to ensure client stays", "Partner may send low-quality leads for quick cash", "Less attractive for high-value partners"],
      bestFor: "Casual referrers, happy customers, informal networks",
      examples: "Dropbox, Notion, many early-stage SaaS",
    },
    {
      name: "Recurring Revenue Share",
      description: "Partner gets a % of recurring revenue for as long as the client pays.",
      typical: "15-30% of monthly revenue, for 12-24 months or lifetime",
      color: BLUE,
      pros: ["Aligns partner incentives with retention", "Very attractive to serious partners", "Creates ongoing relationships", "Partner becomes invested in client success"],
      cons: ["Complex to track over time", "Cash flow impact — paying out for months/years", "Need clear terms on churn/downgrades", "Accounting complexity"],
      bestFor: "Strategic partners, agencies, consultants who manage client relationships",
      examples: "HubSpot (20% recurring for 12 months), Shopify (20% recurring), GoHighLevel (40% recurring)",
    },
    {
      name: "Tiered Commission",
      description: "Commission % increases as partner brings more clients. Rewards volume.",
      typical: "Tier 1: 10-15% (1-5 clients) → Tier 2: 20-25% (6-15) → Tier 3: 30%+ (16+)",
      color: ORANGE,
      pros: ["Motivates partners to bring more volume", "Rewards top performers", "Scales naturally", "Creates loyalty and lock-in"],
      cons: ["More complex to manage", "Need clear tier definitions", "Can feel unfair to smaller partners"],
      bestFor: "Structured partner programs with multiple active partners",
      examples: "Salesforce partner tiers, AWS partner network",
    },
    {
      name: "Reseller / White-Label",
      description: "Partner buys at wholesale, sells at their own price. They own the client relationship.",
      typical: "30-50% margin (partner buys at 50-70% of retail price)",
      color: PURPLE,
      pros: ["Partner highly motivated (their own revenue)", "You get guaranteed revenue per seat", "Partner handles sales & support", "Scales without your sales team"],
      cons: ["You lose direct client relationship", "Brand dilution risk", "Partner controls the experience", "Lower per-unit revenue"],
      bestFor: "Agencies, IT consultants, and regional distributors who want to bundle your product",
      examples: "GoHighLevel (white-label SaaS), Vendasta, many B2B tools",
    },
    {
      name: "Profit Share",
      description: "Partner gets a % of profits (revenue minus costs) from referred clients.",
      typical: "20-40% of net profit from referred accounts",
      color: RED,
      pros: ["Fair — only pay when truly profitable", "Aligns with business health", "Can offer higher percentages"],
      cons: ["Hard to define and agree on 'profit'", "Requires financial transparency", "Partners distrust — 'you can hide costs'", "Accounting burden and potential disputes"],
      bestFor: "Co-founders, deep strategic partnerships, joint ventures — NOT casual referrals",
      examples: "Rare in SaaS — more common in consulting, real estate, finance",
    },
  ];

  const benchmarks = [
    { company: "HubSpot", model: "20% recurring revenue for 12 months", tier: "Solutions Partner" },
    { company: "Shopify", model: "20% recurring commission on referred merchants", tier: "Affiliate/Partner" },
    { company: "GoHighLevel", model: "40% recurring (SaaS mode) or white-label at wholesale", tier: "Agency Partner" },
    { company: "Salesforce", model: "15-25% referral fee + deal registration bonuses", tier: "AppExchange/Consulting" },
    { company: "Stripe", model: "Up to $500 per referral (volume-based)", tier: "Partner Program" },
    { company: "monday.com", model: "20% recurring for 12 months", tier: "Partner Program" },
  ];

  return (
    <div className="space-y-8">
      {/* Intro */}
      <div
        className="rounded-xl p-6 border"
        style={{
          backgroundColor: `color-mix(in srgb, ${ORANGE} 8%, transparent)`,
          borderColor: `color-mix(in srgb, ${ORANGE} 25%, transparent)`,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <Handshake className="w-5 h-5" style={{ color: ORANGE }} />
          <span className="text-lg font-bold" style={{ color: ORANGE }}>
            Partner Compensation Models
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          How do you compensate people who bring you business? Below are the 5 main models used in SaaS,
          with typical percentages, pros/cons, and real benchmarks. Your price point ($10-20/user/month)
          means individual deal sizes are small — so <strong className="text-foreground">recurring models</strong> and{" "}
          <strong className="text-foreground">volume incentives</strong> work better than one-time flat fees.
        </p>
      </div>

      {/* Models */}
      {models.map((model, i) => (
        <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, ${model.color} 15%, transparent)` }}
              >
                <CircleDollarSign className="w-4 h-4" style={{ color: model.color }} />
              </div>
              <span className="text-base font-bold" style={{ color: model.color }}>
                {model.name}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{model.description}</p>
            <div
              className="mt-3 inline-block px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                backgroundColor: `color-mix(in srgb, ${model.color} 10%, transparent)`,
                color: model.color,
              }}
            >
              Typical: {model.typical}
            </div>
          </div>

          {/* Pros & Cons */}
          <div className="grid grid-cols-2 divide-x divide-border">
            <div className="p-4">
              <span className="text-xs font-semibold" style={{ color: GREEN }}>Pros</span>
              <div className="space-y-1.5 mt-2">
                {model.pros.map((pro, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <Check className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: GREEN }} />
                    <span className="text-xs text-muted-foreground">{pro}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4">
              <span className="text-xs font-semibold" style={{ color: RED }}>Cons</span>
              <div className="space-y-1.5 mt-2">
                {model.cons.map((con, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <X className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: RED }} />
                    <span className="text-xs text-muted-foreground">{con}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Best For & Examples */}
          <div className="p-4 border-t border-border bg-muted/20">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">Best for</span>
                <p className="text-xs text-foreground mt-0.5">{model.bestFor}</p>
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-semibold uppercase text-muted-foreground">Who uses this</span>
                <p className="text-xs text-foreground mt-0.5">{model.examples}</p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Industry Benchmarks */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4" style={{ color: BLUE }} />
          <span className="text-sm font-semibold" style={{ color: BLUE }}>
            Industry Benchmarks — What Big SaaS Companies Pay
          </span>
        </div>
        <div className="space-y-2">
          {benchmarks.map((b, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <span className="text-sm font-bold text-foreground w-28 flex-shrink-0">{b.company}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground flex-1">{b.model}</span>
              <span className="text-[10px] text-muted-foreground">{b.tier}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation for myJarvis */}
      <div
        className="rounded-xl p-6 border"
        style={{
          backgroundColor: `color-mix(in srgb, ${GREEN} 8%, transparent)`,
          borderColor: `color-mix(in srgb, ${GREEN} 25%, transparent)`,
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4" style={{ color: GREEN }} />
          <span className="text-sm font-semibold" style={{ color: GREEN }}>
            Recommendation for myJarvis ($10-20/user/month)
          </span>
        </div>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            At your price point, individual deal values are <strong className="text-foreground">$120-240/year per user</strong>.
            This means:
          </p>
          <div className="space-y-2 ml-2">
            <div className="flex items-start gap-2">
              <span style={{ color: GREEN }}>1.</span>
              <span><strong className="text-foreground">Flat fees per referral don't work well</strong> — a $25-50 one-time payment isn't motivating enough for serious partners.</span>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: GREEN }}>2.</span>
              <span><strong className="text-foreground">Recurring revenue share is your best bet</strong> — 20-30% for 12 months gives partners $24-72/year per referred user. Stack enough users and it's meaningful.</span>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: GREEN }}>3.</span>
              <span><strong className="text-foreground">Consider a hybrid for agencies</strong> — 20% recurring + white-label option at 40-50% discount for partners who want to bundle/resell.</span>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: GREEN }}>4.</span>
              <span><strong className="text-foreground">Avoid profit share</strong> — too complex, too many arguments about what counts as cost. Keep it clean with revenue share.</span>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: GREEN }}>5.</span>
              <span><strong className="text-foreground">Start simple</strong> — launch with one model (e.g., 20% recurring for 12 months). Add tiers and reseller options once you have 5+ active partners.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Terms */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Handshake className="w-4 h-4" style={{ color: PURPLE }} />
          <span className="text-sm font-semibold" style={{ color: PURPLE }}>
            Key Terms to Define in Any Partner Agreement
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { term: "Attribution window", detail: "How long after a referral click/intro does the partner get credit? (30-90 days typical)" },
            { term: "Clawback clause", detail: "If client churns within X days, commission is reversed. (30-90 day clawback is standard)" },
            { term: "Payment schedule", detail: "Monthly, quarterly, or net-30/60? Monthly aligns with SaaS billing." },
            { term: "Exclusivity", detail: "Can the partner work with competitors? Usually non-exclusive for referral, exclusive for resellers." },
            { term: "Minimum commitment", detail: "Does the partner need to bring X clients/quarter to keep their tier? Prevents dead partnerships." },
            { term: "First-touch vs last-touch", detail: "Who gets credit if multiple partners touched the same lead? First-touch is simpler and fairer." },
          ].map((item, i) => (
            <div key={i} className="rounded-lg p-3 bg-muted/30">
              <span className="text-xs font-semibold" style={{ color: PURPLE }}>{item.term}</span>
              <p className="text-[11px] text-muted-foreground mt-1">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnswersTab({
  content,
  updateField,
}: {
  content: RoadmapContent;
  updateField: (path: string, value: string) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Founders */}
      <div className="flex items-center gap-3 flex-wrap">
        {["Erez", "Tom", "Dvir", "Yaron"].map((name) => {
          const color = FOUNDER_COLORS[name] ?? BLUE;
          return (
            <div
              key={name}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
                color,
                border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
              }}
            >
              <User className="w-3 h-3" />
              {name}
            </div>
          );
        })}
      </div>

      {/* Discussion Topics */}
      {(content.discussions ?? []).map((topic, ti) => {
        const statusColor =
          topic.status === "answered" ? GREEN :
          topic.status === "partial" ? ORANGE : "#6e7681";
        return (
          <div key={ti} className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Question Header */}
            <div className="p-5 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" style={{ color: ORANGE }} />
                  <span className="text-xs text-muted-foreground">Question {ti + 1}</span>
                </div>
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    color: statusColor,
                    backgroundColor: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
                  }}
                >
                  {topic.status}
                </span>
              </div>
              <EditableText
                value={topic.question}
                onSave={(v) => updateField(`discussions.${ti}.question`, v)}
                className="text-base font-semibold text-foreground"
              />
            </div>

            {/* Founder Answers */}
            <div className="divide-y divide-border">
              {topic.answers.map((answer, ai) => {
                const color = FOUNDER_COLORS[answer.founder] ?? BLUE;
                return (
                  <div key={ai} className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{
                          backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                          color,
                        }}
                      >
                        {answer.founder[0]}
                      </div>
                      <span className="text-sm font-semibold" style={{ color }}>
                        {answer.founder}
                      </span>
                    </div>
                    <div className="space-y-2 ml-9">
                      {answer.points.map((point, pi) => (
                        <div key={pi} className="flex items-start gap-2">
                          <span className="text-muted-foreground mt-1.5 text-[8px]">●</span>
                          <EditableText
                            value={point}
                            onSave={(v) =>
                              updateField(
                                `discussions.${ti}.answers.${ai}.points.${pi}`,
                                v
                              )
                            }
                            className="text-sm text-muted-foreground flex-1"
                            multiline
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Waiting for answers */}
              {["Erez", "Tom", "Dvir", "Yaron"]
                .filter((name) => !topic.answers.some((a) => a.founder === name))
                .map((name) => {
                  const color = FOUNDER_COLORS[name] ?? BLUE;
                  return (
                    <div key={name} className="p-5 opacity-40">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                            color,
                          }}
                        >
                          {name[0]}
                        </div>
                        <span className="text-sm text-muted-foreground italic">
                          {name} — waiting for input
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Next Steps */}
            {topic.next_steps.length > 0 && (
              <div
                className="p-4 border-t"
                style={{
                  backgroundColor: `color-mix(in srgb, ${GREEN} 5%, transparent)`,
                  borderColor: `color-mix(in srgb, ${GREEN} 15%, transparent)`,
                }}
              >
                <span className="text-xs font-semibold" style={{ color: GREEN }}>
                  Next Steps
                </span>
                <div className="space-y-1 mt-2">
                  {topic.next_steps.map((step, si) => (
                    <div key={si} className="flex items-start gap-2">
                      <span style={{ color: GREEN }} className="text-xs mt-0.5">→</span>
                      <EditableText
                        value={step}
                        onSave={(v) => updateField(`discussions.${ti}.next_steps.${si}`, v)}
                        className="text-xs text-muted-foreground flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function RoadmapPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { content, isPending, updateField } =
    useContentPage<RoadmapContent>("roadmap");

  if (isPending) {
    return (
      <div className="max-w-5xl px-6 pb-6 pt-0 animate-pulse">
        <div className="h-10 w-80 rounded bg-muted mb-4" />
        <div className="h-6 w-96 rounded bg-muted mb-8" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl px-6 pb-6 pt-0">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `color-mix(in srgb, ${ORANGE} 15%, transparent)` }}
          >
            <Rocket className="w-5 h-5" style={{ color: ORANGE }} />
          </div>
          <div>
            <EditableText
              value={content.title ?? ""}
              onSave={(v) => updateField("title", v)}
              className="text-2xl font-bold text-foreground"
            />
            <EditableText
              value={content.subtitle ?? ""}
              onSave={(v) => updateField("subtitle", v)}
              className="text-sm text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 p-1 rounded-xl bg-muted/40 w-fit flex-wrap">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={
                isActive
                  ? {
                      backgroundColor: `color-mix(in srgb, ${ORANGE} 18%, transparent)`,
                      color: ORANGE,
                      border: `1px solid color-mix(in srgb, ${ORANGE} 35%, transparent)`,
                    }
                  : {
                      color: "hsl(var(--muted-foreground))",
                      border: "1px solid transparent",
                    }
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab content={content} updateField={updateField} />
      )}
      {activeTab === "phase-0" && content.phases[0] && (
        <PhaseCard phase={content.phases[0]} index={0} updateField={updateField} />
      )}
      {activeTab === "phase-1" && content.phases[1] && (
        <PhaseCard phase={content.phases[1]} index={1} updateField={updateField} />
      )}
      {activeTab === "phase-2" && content.phases[2] && (
        <PhaseCard phase={content.phases[2]} index={2} updateField={updateField} />
      )}
      {activeTab === "phase-3" && content.phases[3] && (
        <PhaseCard phase={content.phases[3]} index={3} updateField={updateField} />
      )}
      {activeTab === "parallel" && (
        <ParallelTab content={content} updateField={updateField} />
      )}
      {activeTab === "answers" && (
        <AnswersTab content={content} updateField={updateField} />
      )}
      {activeTab === "partners" && <PartnersTab />}
      {activeTab === "voice" && <VoiceTab />}

      {/* Footer */}
      <div className="mt-10 text-center">
        <EditableText
          value={content.footer ?? ""}
          onSave={(v) => updateField("footer", v)}
          className="text-xs text-muted-foreground text-center"
        />
      </div>
    </div>
  );
}

RoadmapPage.path = "/kb/roadmap";
