import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SECTION_REGISTRY, type SectionData } from "./registry";

function SectionWrapper({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-5 text-left"
      >
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="px-5 pb-5 -mt-1">{children}</div>}
    </div>
  );
}

export function SectionRenderer({ sections }: { sections: SectionData[] }) {
  if (!sections || !Array.isArray(sections)) return null;

  return (
    <div className="space-y-6">
      {sections.map((section, i) => {
        const Component = SECTION_REGISTRY[section.type];
        if (!Component) {
          return (
            <div key={i} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-sm text-amber-500">
                Unknown section type: <code className="font-mono">{section.type}</code>
              </p>
            </div>
          );
        }
        return (
          <SectionWrapper key={i} title={section.title}>
            <Component data={section.data} />
          </SectionWrapper>
        );
      })}
    </div>
  );
}
