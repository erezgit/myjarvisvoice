import { useGetList } from 'ra-core';
import { Square, Loader2, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AutomationRun, AutomationRunStatus } from '../types';

const STATUS_CONFIG: Record<AutomationRunStatus, { label: string; className: string }> = {
  queued: { label: 'Queued', className: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' },
  running: { label: 'Running', className: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  completed: { label: 'Completed', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  failed: { label: 'Failed', className: 'bg-red-500/15 text-red-600 border-red-500/30' },
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDuration(start?: string | null, end?: string | null): string | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}m ${remSecs}s`;
}

type AutomationRunHistoryProps = {
  automationId: string | number;
  onStop?: (runId: string) => void;
  isStopping?: (runId: string) => boolean;
  isHeartbeat?: boolean;
};

export function AutomationRunHistory({ automationId, onStop, isStopping, isHeartbeat }: AutomationRunHistoryProps) {
  const { data, isPending } = useGetList<AutomationRun>('automation_runs', {
    filter: { 'automation_id@eq': automationId },
    sort: { field: 'queued_at', order: 'DESC' },
    pagination: { page: 1, perPage: 10 },
  });

  if (isPending) {
    return <div className="px-4 py-3 text-sm text-muted-foreground">Loading runs...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="px-4 py-3 text-sm text-muted-foreground">No runs yet</div>;
  }

  return (
    <div className="space-y-1 px-4 py-2">
      {data.map((run) => {
        const config = STATUS_CONFIG[run.status];
        const duration = formatDuration(run.started_at, run.completed_at);
        const canStop = isHeartbeat && run.status === 'running' && onStop;
        const stopping = isStopping?.(String(run.id));

        return (
          <div key={run.id} className="flex items-center gap-3 py-1.5 text-sm">
            <Badge variant="outline" className={cn('text-[11px] min-w-[80px] justify-center', config.className)}>
              {run.status === 'running' && (
                <span className="relative flex h-2 w-2 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
              )}
              {config.label}
            </Badge>
            <span className="text-muted-foreground">{formatRelativeTime(run.queued_at)}</span>
            {duration && (
              <span className="text-muted-foreground">{duration}</span>
            )}
            {run.error_message && (
              <span className="text-red-500 truncate max-w-[200px]" title={run.error_message}>
                {run.error_message}
              </span>
            )}
            {run.session_id && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                onClick={() => window.dispatchEvent(new CustomEvent('load-chat-session', { detail: { sessionId: run.session_id, automation: true } }))}
                title="View agent chat"
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
            )}
            {canStop && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={() => onStop(String(run.id))}
                disabled={stopping}
                title="Stop automation"
              >
                {stopping ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Square className="h-3 w-3 fill-current" />
                )}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
