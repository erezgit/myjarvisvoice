import { useState, useRef } from "react";
import { useGetList } from "ra-core";
import { ArrowLeft, FileText, FolderOpen } from "lucide-react";
import type { PageContent } from "../types";
import { SectionRenderer } from "../sections/SectionRenderer";
import type { SectionData } from "../sections/registry";
import { DownloadButton } from "../shared/DownloadButton";

type KbDocContent = {
  title: string;
  subtitle?: string;
  icon?: string;
  category?: string;
  sections: SectionData[];
};

const CATEGORY_COLORS: Record<string, string> = {
  "Product": "#a78bfa",
  "Operations": "#60a5fa",
  "Company": "#34d399",
  "Technical": "#f0883e",
  "Research": "#58a6ff",
  "Reference": "#f472b6",
};

function KbDocDetail({
  doc,
  onBack,
}: {
  doc: PageContent<KbDocContent>;
  onBack: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const content = doc.content;
  const filename = content.title.replace(/[^a-zA-Z0-9]+/g, "-").replace(/-+$/, "");

  return (
    <div className="px-6 pt-0 pb-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <DownloadButton contentRef={contentRef} filename={filename} />
      </div>

      <div ref={contentRef} className="space-y-6 bg-background p-6 rounded-xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">{content.title}</h1>
          {content.subtitle && (
            <p className="text-sm text-muted-foreground">{content.subtitle}</p>
          )}
        </div>

        <SectionRenderer sections={content.sections ?? []} />
      </div>
    </div>
  );
}

export function KnowledgeBasePage() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const { data: rawPages, isPending } = useGetList<PageContent<KbDocContent>>("page_content", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "page_slug", order: "ASC" },
  });

  const allPages = rawPages?.filter((p) => p.page_slug.startsWith("kb-doc/"));

  if (isPending) {
    return (
      <div className="px-6 pt-4 pb-6 max-w-5xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const docs = allPages ?? [];
  const selectedDoc = selectedSlug ? docs.find((d) => d.page_slug === selectedSlug) : null;

  // Group by category
  const categories = new Map<string, typeof docs>();
  docs.forEach((doc) => {
    const cat = doc.content?.category || "Other";
    if (!categories.has(cat)) categories.set(cat, []);
    categories.get(cat)!.push(doc);
  });

  // Detail view
  if (selectedDoc) {
    return <KbDocDetail doc={selectedDoc} onBack={() => setSelectedSlug(null)} />;
  }

  // Grid view
  return (
    <div className="px-6 pt-2 pb-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Knowledge Base</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {docs.length} documents
        </p>
      </div>

      {Array.from(categories.entries()).map(([category, categoryDocs]) => {
        const color = CATEGORY_COLORS[category] ?? "#a1a1aa";
        return (
          <div key={category} className="mb-6">
            {/* Category header */}
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="w-4 h-4" style={{ color }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color }}>
                {category}
              </span>
              <span className="text-xs text-muted-foreground">({categoryDocs.length})</span>
            </div>

            {/* Document grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {categoryDocs.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedSlug(doc.page_slug)}
                  className="group rounded-xl border bg-card hover:bg-accent/30 transition-all text-left p-4 flex flex-col gap-2"
                >
                  <span className="text-sm font-medium text-foreground leading-tight line-clamp-2">
                    {doc.content?.title?.replace(/^OPX 1000\s*[—–-]\s*/i, "") ?? doc.page_slug}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium self-start"
                    style={{
                      color,
                      backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
                    }}
                  >
                    {category}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {docs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No documents yet.</p>
        </div>
      )}
    </div>
  );
}

KnowledgeBasePage.path = "/knowledge-base";
