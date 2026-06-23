import { MessageSquare, Wand2, Zap, Brain, type LucideIcon } from "lucide-react";
import { useContentPage } from "../hooks/useContentPage";
import { EditableText } from "../misc/EditableText";

const BLUE = "#58a6ff";
const ORANGE = "#f0883e";
const PURPLE = "#a78bfa";
const GREEN = "#3fb950";

// Icons and colors stay in code — they're layout, not content
const STEP_VISUALS: { icon: LucideIcon; color: string }[] = [
  { icon: MessageSquare, color: BLUE },
  { icon: Wand2, color: ORANGE },
  { icon: Zap, color: PURPLE },
  { icon: Brain, color: GREEN },
];

type HowItWorksContent = {
  title: string;
  subtitle: string;
  steps: { title: string; description: string; detail: string }[];
};

export function HowItWorksPage() {
  const { content, isPending, updateField } =
    useContentPage<HowItWorksContent>("how-it-works");

  if (isPending) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-6 animate-pulse">
        <div className="mb-10 space-y-3">
          <div className="h-9 w-64 rounded bg-muted" />
          <div className="h-5 w-96 rounded bg-muted" />
        </div>
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      {/* Header */}
      <div className="mb-10">
        <EditableText
          value={content.title ?? ""}
          onSave={(v) => updateField("title", v)}
          className="text-3xl font-bold text-foreground mb-2"
          placeholder="Page title..."
        />
        <EditableText
          value={content.subtitle ?? ""}
          onSave={(v) => updateField("subtitle", v)}
          className="text-muted-foreground"
          placeholder="Subtitle..."
        />
      </div>

      {/* Steps */}
      <div className="space-y-0">
        {content.steps?.map((step, index) => {
          const { icon: Icon, color } = STEP_VISUALS[index] ?? {
            icon: Brain,
            color: BLUE,
          };
          const isLast = index === (content.steps?.length ?? 0) - 1;

          return (
            <div key={index} className="flex gap-5">
              {/* Left: number + connector line */}
              <div className="flex flex-col items-center">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 z-10"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`,
                    color: color,
                    border: `1.5px solid color-mix(in srgb, ${color} 35%, transparent)`,
                  }}
                >
                  {index + 1}
                </div>
                {!isLast && (
                  <div
                    className="w-px flex-1 my-2"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)` }}
                  />
                )}
              </div>

              {/* Right: content */}
              <div className={`pb-8 flex-1 ${isLast ? "pb-0" : ""}`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className="p-1.5 rounded-md"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <EditableText
                    value={step.title}
                    onSave={(v) => updateField(`steps.${index}.title`, v)}
                    className="text-base font-semibold text-foreground"
                    placeholder="Step title..."
                  />
                </div>

                <EditableText
                  value={step.description}
                  onSave={(v) => updateField(`steps.${index}.description`, v)}
                  className="text-sm text-muted-foreground leading-relaxed mb-3"
                  multiline
                  rows={2}
                  placeholder="Step description..."
                />

                <div
                  className="px-3 py-2.5 rounded-lg text-xs leading-relaxed border"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${color} 6%, transparent)`,
                    borderColor: `color-mix(in srgb, ${color} 20%, transparent)`,
                  }}
                >
                  <EditableText
                    value={step.detail}
                    onSave={(v) => updateField(`steps.${index}.detail`, v)}
                    className="text-xs text-muted-foreground italic leading-relaxed"
                    placeholder="Example or detail..."
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary bar */}
      <div className="mt-10 grid grid-cols-4 gap-3">
        {content.steps?.map((step, index) => {
          const { color } = STEP_VISUALS[index] ?? { color: BLUE };
          return (
            <div
              key={index}
              className="rounded-lg px-3 py-2.5 text-center"
              style={{ backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}
            >
              <div className="text-xs font-semibold" style={{ color }}>
                Step {index + 1}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{step.title}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

HowItWorksPage.path = "/kb/how-it-works";
