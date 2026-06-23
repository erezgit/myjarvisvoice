import { Fragment, useState, useCallback } from "react";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { ChatPanel } from "./ChatPanel";
import { generateId } from "@/utils/id";

const MAX_PANELS = 4;

/**
 * ChatColumn — Manages multiple ChatPanel instances stacked vertically.
 *
 * Each ChatPanel is fully self-contained (own provider tree, state, streaming).
 * This component only manages the instance array and renders a vertical PanelGroup.
 */
export function ChatColumn() {
  const [instances, setInstances] = useState<string[]>(() => [generateId()]);

  const handleSplit = useCallback(() => {
    setInstances((prev) => {
      if (prev.length >= MAX_PANELS) return prev;
      return [...prev, generateId()];
    });
  }, []);

  const handleClose = useCallback((id: string) => {
    setInstances((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((i) => i !== id);
    });
  }, []);

  // Single panel — no PanelGroup overhead needed
  if (instances.length === 1) {
    return (
      <ChatPanel
        instanceId={instances[0]}
        onSplit={handleSplit}
        canSplit={true}
        canClose={false}
      />
    );
  }

  return (
    <PanelGroup direction="vertical">
      {instances.map((id, i) => (
        <Fragment key={id}>
          {i > 0 && (
            <PanelResizeHandle className="h-px bg-border hover:bg-ring transition-colors" />
          )}
          <Panel minSize={20}>
            <ChatPanel
              instanceId={id}
              onSplit={handleSplit}
              onClose={() => handleClose(id)}
              canSplit={instances.length < MAX_PANELS}
              canClose={true}
            />
          </Panel>
        </Fragment>
      ))}
    </PanelGroup>
  );
}
