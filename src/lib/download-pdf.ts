import { toast } from "sonner";

// ─── PDF (pixel-perfect screenshot) ─────────────────────────────────────────

export async function downloadAsPdf(
  element: HTMLElement,
  filename: string,
) {
  const [{ toPng }, { default: jsPDF }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);

  await document.fonts.ready;

  const dataUrl = await toPng(element, {
    pixelRatio: 3,
    cacheBust: true,
  });

  const w = element.offsetWidth;
  const h = element.offsetHeight;

  const pdf = new jsPDF({
    orientation: w > h ? "landscape" : "portrait",
    unit: "px",
    format: [w, h],
    hotfixes: ["px_scaling"],
  });

  pdf.addImage(dataUrl, "PNG", 0, 0, w, h);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

// ─── Markdown (plain text) ──────────────────────────────────────────────────

export function downloadAsMarkdown(content: string, filename: string) {
  const name = filename.endsWith(".md") ? filename : `${filename}.md`;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── DOCX (Microsoft Word) ──────────────────────────────────────────────────

export async function downloadAsDocx(content: string, filename: string) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } =
    await import("docx");
  const { saveAs } = await import("file-saver");

  const lines = content.split("\n");
  const children: InstanceType<typeof Paragraph>[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Main title (# heading)
    if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: trimmed.slice(2),
              bold: true,
              size: 32,
              font: "Calibri",
            }),
          ],
        })
      );
      continue;
    }

    // Section heading (## heading)
    if (trimmed.startsWith("## ")) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: trimmed.slice(3),
              bold: true,
              size: 26,
              font: "Calibri",
            }),
          ],
        })
      );
      continue;
    }

    // Sub heading (### heading)
    if (trimmed.startsWith("### ")) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
          children: [
            new TextRun({
              text: trimmed.slice(4),
              bold: true,
              size: 22,
              font: "Calibri",
            }),
          ],
        })
      );
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 120 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          },
          children: [],
        })
      );
      continue;
    }

    // Code block lines (indented with 4 spaces or inside ```)
    if (trimmed.startsWith("```")) {
      continue; // Skip fences, the indented content will be handled as code
    }

    if (line.startsWith("    ") || line.startsWith("\t")) {
      children.push(
        new Paragraph({
          spacing: { before: 20, after: 20 },
          indent: { left: 360 },
          children: [
            new TextRun({
              text: line.replace(/^\t/, "    "),
              font: "Consolas",
              size: 18,
              color: "333333",
            }),
          ],
        })
      );
      continue;
    }

    // Bullet points
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({
              text: trimmed.slice(2),
              size: 20,
              font: "Calibri",
            }),
          ],
        })
      );
      continue;
    }

    // Empty line
    if (trimmed === "") {
      children.push(new Paragraph({ spacing: { before: 60, after: 60 }, children: [] }));
      continue;
    }

    // Bold line (label: value pattern like "Classification: Public")
    const labelMatch = trimmed.match(/^\*\*(.+?)\*\*:\s*(.+)$/);
    if (labelMatch) {
      children.push(
        new Paragraph({
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({ text: `${labelMatch[1]}: `, bold: true, size: 20, font: "Calibri" }),
            new TextRun({ text: labelMatch[2], size: 20, font: "Calibri" }),
          ],
        })
      );
      continue;
    }

    // Regular paragraph
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text: trimmed,
            size: 20,
            font: "Calibri",
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBlob(doc);
  const name = filename.endsWith(".docx") ? filename : `${filename}.docx`;
  saveAs(buffer, name);
}

// ─── Unified handler ────────────────────────────────────────────────────────

export type DownloadFormat = "pdf" | "markdown" | "docx";

export async function handleDownload(
  ref: React.RefObject<HTMLElement | null>,
  filename: string,
  format?: DownloadFormat,
  markdownContent?: string,
) {
  const fmt = format ?? "pdf";
  const baseName = filename.replace(/\.\w+$/, "");

  try {
    if (fmt === "pdf") {
      if (!ref.current) return;
      await downloadAsPdf(ref.current, `${baseName}.pdf`);
      toast.success(`${baseName}.pdf downloaded`, { icon: null, duration: 2000 });
    } else if (fmt === "markdown") {
      const md = markdownContent ?? extractTextAsMarkdown(ref.current);
      downloadAsMarkdown(md, `${baseName}.md`);
      toast.success(`${baseName}.md downloaded`, { icon: null, duration: 2000 });
    } else if (fmt === "docx") {
      const md = markdownContent ?? extractTextAsMarkdown(ref.current);
      await downloadAsDocx(md, `${baseName}.docx`);
      toast.success(`${baseName}.docx downloaded`, { icon: null, duration: 2000 });
    }
  } catch (err) {
    console.error(`${fmt.toUpperCase()} download failed:`, err);
    toast.error(`Download failed`, { icon: null, duration: 3000 });
  }
}

// ─── Text extraction from DOM → Markdown ────────────────────────────────────

function extractTextAsMarkdown(el: HTMLElement | null): string {
  if (!el) return "";
  const lines: string[] = [];

  function walk(node: Node, depth = 0) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) lines.push(text);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const elem = node as HTMLElement;
    const tag = elem.tagName.toLowerCase();

    // Skip buttons and interactive elements
    if (tag === "button" || tag === "select" || elem.classList.contains("print:hidden")) return;

    if (tag === "h1") {
      lines.push(`\n# ${elem.textContent?.trim()}`);
      return;
    }
    if (tag === "h2") {
      lines.push(`\n## ${elem.textContent?.trim()}`);
      return;
    }
    if (tag === "h3") {
      lines.push(`\n### ${elem.textContent?.trim()}`);
      return;
    }
    if (tag === "h4") {
      lines.push(`\n### ${elem.textContent?.trim()}`);
      return;
    }
    if (tag === "pre") {
      lines.push("\n```");
      lines.push(elem.textContent?.trim() ?? "");
      lines.push("```\n");
      return;
    }
    if (tag === "li") {
      lines.push(`- ${elem.textContent?.trim()}`);
      return;
    }
    if (tag === "hr") {
      lines.push("\n---\n");
      return;
    }

    for (const child of Array.from(node.childNodes)) {
      walk(child, depth + 1);
    }

    // Add spacing after block elements
    if (["div", "p", "section"].includes(tag)) {
      const last = lines[lines.length - 1];
      if (last && last !== "" && !last.startsWith("\n")) {
        // Only add blank if there's real content
      }
    }
  }

  walk(el);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
