import { BookOpen, MessageCircle, Wrench, Sparkles, type LucideIcon } from "lucide-react";
import { useContentPage } from "../hooks/useContentPage";
import { EditableText } from "../misc/EditableText";

const BLUE = "#58a6ff";
const ORANGE = "#f0883e";
const PURPLE = "#a78bfa";
const GREEN = "#3fb950";

// Icons and colors stay in code — they're layout, not content
const FEATURE_ICONS: { icon: LucideIcon; color: string }[] = [
  { icon: BookOpen, color: BLUE },
  { icon: MessageCircle, color: ORANGE },
  { icon: Wrench, color: PURPLE },
];

type WelcomeContent = {
  hero_title: string;
  hero_subtitle: string;
  features: { title: string; description: string }[];
  footer_text: string;
};

export function WelcomePage() {
  const { content, isPending, updateField } =
    useContentPage<WelcomeContent>("welcome");

  if (isPending) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-6 animate-pulse">
        <div className="text-center mb-12 space-y-4">
          <div className="h-10 w-64 mx-auto rounded bg-muted" />
          <div className="h-6 w-96 mx-auto rounded bg-muted" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      {/* Hero */}
      <div className="text-center mb-12">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
          style={{
            backgroundColor: `color-mix(in srgb, ${BLUE} 15%, transparent)`,
          }}
        >
          <Sparkles className="w-8 h-8" style={{ color: BLUE }} />
        </div>

        <EditableText
          value={content.hero_title ?? ""}
          onSave={(v) => updateField("hero_title", v)}
          className="text-4xl font-bold text-foreground mb-4 leading-tight text-center"
        />

        <EditableText
          value={content.hero_subtitle ?? ""}
          onSave={(v) => updateField("hero_subtitle", v)}
          className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed text-center"
        />

        <div
          className="mt-2 h-0.5 w-16 mx-auto rounded-full"
          style={{ backgroundColor: BLUE }}
        />
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 gap-4">
        {content.features?.map((card, i) => {
          const { icon: Icon, color } = FEATURE_ICONS[i] ?? {
            icon: Sparkles,
            color: BLUE,
          };
          return (
            <div
              key={i}
              className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card transition-colors hover:bg-muted/40"
            >
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div className="flex-1">
                <EditableText
                  value={card.title}
                  onSave={(v) => updateField(`features.${i}.title`, v)}
                  className="text-base font-semibold text-foreground mb-1"
                  placeholder="Card title..."
                />
                <EditableText
                  value={card.description}
                  onSave={(v) => updateField(`features.${i}.description`, v)}
                  className="text-sm text-muted-foreground leading-relaxed"
                  multiline
                  rows={2}
                  placeholder="Card description..."
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="mt-10 text-center">
        <EditableText
          value={content.footer_text ?? ""}
          onSave={(v) => updateField("footer_text", v)}
          className="text-xs text-muted-foreground text-center"
          placeholder="Footer text..."
        />
        <div
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `color-mix(in srgb, ${GREEN} 12%, transparent)`,
            color: GREEN,
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: GREEN }}
          />
          Jarvis is ready
        </div>
      </div>
    </div>
  );
}

WelcomePage.path = "/kb/welcome";
