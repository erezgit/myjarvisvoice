import {
  Kanban,
  Users,
  FileText,
  Target,
  ChefHat,
  BookMarked,
  Wallet,
  Map,
  GraduationCap,
  NotebookPen,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useContentPage } from "../hooks/useContentPage";
import { EditableText } from "../misc/EditableText";

const BLUE = "#58a6ff";
const ORANGE = "#f0883e";
const PURPLE = "#a78bfa";
const GREEN = "#3fb950";
const TEAL = "#39d353";
const PINK = "#f778ba";
const YELLOW = "#e3b341";
const RED = "#f85149";
const CYAN = "#56d364";
const INDIGO = "#79c0ff";

// Icons and colors stay in code — they're layout, not content
const USE_CASE_VISUALS: { icon: LucideIcon; color: string }[] = [
  { icon: Kanban, color: BLUE },
  { icon: Users, color: ORANGE },
  { icon: FileText, color: PURPLE },
  { icon: Target, color: GREEN },
  { icon: ChefHat, color: YELLOW },
  { icon: BookMarked, color: TEAL },
  { icon: Wallet, color: RED },
  { icon: Map, color: CYAN },
  { icon: GraduationCap, color: INDIGO },
  { icon: NotebookPen, color: PINK },
];

type UseCasesContent = {
  title: string;
  subtitle: string;
  use_cases: { title: string; description: string }[];
  footer_text: string;
};

export function UseCasesPage() {
  const { content, isPending, updateField } =
    useContentPage<UseCasesContent>("use-cases");

  if (isPending) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-6 animate-pulse">
        <div className="mb-8 space-y-3">
          <div className="h-9 w-72 rounded bg-muted" />
          <div className="h-5 w-96 rounded bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      {/* Header */}
      <div className="mb-8">
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

      {/* Use Case Grid */}
      <div className="grid grid-cols-2 gap-3">
        {content.use_cases?.map((uc, index) => {
          const { icon: Icon, color } = USE_CASE_VISUALS[index] ?? {
            icon: Sparkles,
            color: BLUE,
          };
          return (
            <div
              key={index}
              className="flex items-start gap-3.5 p-4 rounded-xl border border-border bg-card transition-colors hover:bg-muted/40 group"
            >
              {/* Icon + number */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{
                    backgroundColor: color,
                    color: "#0d1117",
                  }}
                >
                  {index + 1}
                </div>
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <EditableText
                  value={uc.title}
                  onSave={(v) => updateField(`use_cases.${index}.title`, v)}
                  className="text-sm font-semibold text-foreground mb-0.5 leading-tight"
                  placeholder="Use case title..."
                />
                <EditableText
                  value={uc.description}
                  onSave={(v) => updateField(`use_cases.${index}.description`, v)}
                  className="text-xs text-muted-foreground leading-relaxed"
                  placeholder="Description..."
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <EditableText
          value={content.footer_text ?? ""}
          onSave={(v) => updateField("footer_text", v)}
          className="text-sm text-muted-foreground text-center leading-relaxed"
          placeholder="Footer text..."
        />
      </div>
    </div>
  );
}

UseCasesPage.path = "/kb/use-cases";
