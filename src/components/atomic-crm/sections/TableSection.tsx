import type { SectionComponentProps } from "./registry";

export function TableSection({ data }: SectionComponentProps) {
  const headers = data?.headers as string[] | undefined;
  const rows = data?.rows as string[][] | undefined;
  if (!headers?.length || !rows?.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {headers.map((h) => (
              <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-foreground">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {row.map((cell, j) => (
                <td key={j} className={`py-2.5 px-3 text-xs ${j === 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
