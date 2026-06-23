import type { SectionComponentProps } from "./registry";

export function MarkdownSection({ data }: SectionComponentProps) {
  const content = typeof data === "string" ? data : data?.content ?? "";
  if (!content) return null;

  // Simple markdown-to-HTML: headings, bold, italic, lists, code
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inList = false;
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="space-y-1 ml-4">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground list-disc">
              <span dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
            </li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      inList = true;
      listItems.push(trimmed.slice(2));
      continue;
    }

    if (inList) flushList();

    if (trimmed.startsWith("### ")) {
      elements.push(<h4 key={elements.length} className="text-sm font-semibold text-foreground mt-3 mb-1">{trimmed.slice(4)}</h4>);
    } else if (trimmed.startsWith("## ")) {
      elements.push(<h3 key={elements.length} className="text-base font-semibold text-foreground mt-4 mb-1">{trimmed.slice(3)}</h3>);
    } else if (trimmed.startsWith("# ")) {
      elements.push(<h2 key={elements.length} className="text-lg font-bold text-foreground mt-4 mb-2">{trimmed.slice(2)}</h2>);
    } else if (trimmed === "") {
      elements.push(<div key={elements.length} className="h-2" />);
    } else {
      elements.push(
        <p key={elements.length} className="text-sm text-muted-foreground leading-relaxed">
          <span dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />
        </p>
      );
    }
  }
  flushList();

  return <div>{elements}</div>;
}

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded bg-muted text-xs">$1</code>');
}
