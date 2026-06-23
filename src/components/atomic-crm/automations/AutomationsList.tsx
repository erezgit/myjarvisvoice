import { useState } from 'react';
import { useGetList } from 'ra-core';
import { ChevronDown, ChevronRight, Pencil, Play, Loader2, Heart, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Automation, AutomationStatus } from '../types';
import { AutomationRunHistory } from './AutomationRunHistory';
import { AutomationDialog } from './AutomationDialog';
import { useRunAutomation } from './useRunAutomation';

const STATUS_BADGE: Record<AutomationStatus, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  paused: { label: 'Paused', className: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' },
  archived: { label: 'Archived', className: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30' },
};

function formatHeartbeat(seconds: number): string {
  if (seconds >= 3600) return `${seconds / 3600}h`;
  if (seconds >= 60) return `${seconds / 60}m`;
  return `${seconds}s`;
}

export function AutomationsList() {
  const { data, isPending } = useGetList<Automation>('automations', {
    sort: { field: 'created_at', order: 'DESC' },
    pagination: { page: 1, perPage: 50 },
  });

  const { run, stop, isRunning, isStopping } = useRunAutomation();
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);

  const toggleExpand = (id: string | number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isPending) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading automations...
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No automations yet. Create one to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          {data.map((automation, idx) => {
            const isExpanded = expandedIds.has(automation.id);
            const running = isRunning(automation.id);
            const badge = STATUS_BADGE[automation.status];
            const hasHeartbeat = automation.heartbeat_seconds != null;
            const hasSchedule = !!automation.schedule_cron;

            return (
              <div key={automation.id}>
                {idx > 0 && <div className="border-t" />}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => toggleExpand(automation.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{automation.name}</span>
                      {hasHeartbeat && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-pink-500/10 text-pink-500 border-pink-500/30">
                          <Heart className="h-3 w-3 mr-0.5" />
                          {formatHeartbeat(automation.heartbeat_seconds!)}
                        </Badge>
                      )}
                      {hasSchedule && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-500/10 text-violet-500 border-violet-500/30">
                          <Clock className="h-3 w-3 mr-0.5" />
                          cron
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {automation.prompt}
                    </div>
                  </div>

                  <Badge variant="outline" className={cn('text-[11px]', badge.className)}>
                    {badge.label}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                    onClick={() => run(automation)}
                    disabled={running || automation.status !== 'active'}
                    title="Run automation"
                  >
                    {running ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingAutomation(automation)}
                    title="Edit automation"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>

                {isExpanded && (
                  <div className="border-t bg-muted/30">
                    <AutomationRunHistory
                      automationId={automation.id}
                      onStop={stop}
                      isStopping={isStopping}
                      isHeartbeat={hasHeartbeat}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {editingAutomation && (
        <AutomationDialog
          open
          onClose={() => setEditingAutomation(null)}
          automation={editingAutomation}
        />
      )}
    </>
  );
}
