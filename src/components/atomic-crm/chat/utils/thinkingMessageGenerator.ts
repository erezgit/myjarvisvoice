import type { ThinkingMessage } from "../types";

// Browser-compatible path.basename implementation
function basename(filePath: string): string {
  return filePath.split('/').pop() || filePath.split('\\').pop() || 'unknown';
}

interface ThinkingPattern {
  toolName: string;
  pattern: RegExp;
  messageTemplate: (matches: RegExpMatchArray, input: any) => string;
}

const THINKING_PATTERNS: ThinkingPattern[] = [
  {
    toolName: "Read",
    pattern: /.*/,
    messageTemplate: (_, input) => {
      const filename = basename(input.file_path || "unknown");
      return `Reading - ${filename}`;
    }
  },
  {
    toolName: "Glob",
    pattern: /tickets/,
    messageTemplate: () => "Searching - tickets"
  },
  {
    toolName: "Glob",
    pattern: /\*\*\/\*/,
    messageTemplate: () => "Scanning - project files"
  },
  {
    toolName: "Bash",
    pattern: /ls -la/,
    messageTemplate: () => "Exploring - workspace structure"
  },
  {
    toolName: "WebSearch",
    pattern: /.*/,
    messageTemplate: (_, input) => {
      const query = (input.query as string) || "web";
      const displayQuery = query.length > 40 ? query.slice(0, 40) + "..." : query;
      return `Web search - ${displayQuery}`;
    }
  },
  {
    toolName: "WebFetch",
    pattern: /.*/,
    messageTemplate: (_, input) => {
      const url = (input.url as string) || "unknown";
      try {
        const domain = new URL(url).hostname;
        return `Web fetch - ${domain}`;
      } catch {
        return `Web fetch - ${url.slice(0, 30)}`;
      }
    }
  }
];

export function generateThinkingMessage(
  toolName: string,
  toolInput: Record<string, unknown>,
  timestamp: number
): ThinkingMessage | null {
  const command = toolInput.command as string || "";
  const filePath = toolInput.file_path as string || "";
  const pattern = toolInput.pattern as string || "";

  // Create search string combining all relevant data
  const searchString = `${command} ${filePath} ${pattern}`.toLowerCase();

  for (const thinkingPattern of THINKING_PATTERNS) {
    if (thinkingPattern.toolName === toolName) {
      const match = searchString.match(thinkingPattern.pattern);
      if (match) {
        return {
          type: "thinking",
          content: thinkingPattern.messageTemplate(match, toolInput),
          timestamp
        };
      }
    }
  }

  return null;
}