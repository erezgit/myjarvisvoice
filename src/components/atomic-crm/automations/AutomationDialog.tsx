import { useState } from 'react';
import { useCreate, useUpdate, useNotify, useGetIdentity } from 'ra-core';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Automation } from '../types';

type AutomationDialogProps = {
  open: boolean;
  onClose: () => void;
  automation?: Automation; // if provided, edit mode
};

type HeartbeatUnit = 'seconds' | 'minutes' | 'hours';

function heartbeatToUnit(seconds: number | null | undefined): { value: number; unit: HeartbeatUnit } {
  if (!seconds) return { value: 20, unit: 'seconds' };
  if (seconds >= 3600 && seconds % 3600 === 0) return { value: seconds / 3600, unit: 'hours' };
  if (seconds >= 60 && seconds % 60 === 0) return { value: seconds / 60, unit: 'minutes' };
  return { value: seconds, unit: 'seconds' };
}

function unitToSeconds(value: number, unit: HeartbeatUnit): number {
  if (unit === 'hours') return value * 3600;
  if (unit === 'minutes') return value * 60;
  return value;
}

export function AutomationDialog({ open, onClose, automation }: AutomationDialogProps) {
  const isEdit = !!automation;
  const [create] = useCreate();
  const [update] = useUpdate();
  const notify = useNotify();
  const { identity } = useGetIdentity();

  const [name, setName] = useState(automation?.name ?? '');
  const [prompt, setPrompt] = useState(automation?.prompt ?? '');
  const [maxBudget, setMaxBudget] = useState(automation?.max_budget_usd ?? 2.0);
  const [maxTurns, setMaxTurns] = useState(automation?.max_turns ?? 30);

  // Heartbeat fields
  const hasHeartbeat = automation?.heartbeat_seconds != null;
  const initialHb = heartbeatToUnit(automation?.heartbeat_seconds);
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(hasHeartbeat);
  const [heartbeatValue, setHeartbeatValue] = useState(initialHb.value);
  const [heartbeatUnit, setHeartbeatUnit] = useState<HeartbeatUnit>(initialHb.unit);

  // Scheduled end (datetime-local)
  const [scheduledEnd, setScheduledEnd] = useState(
    automation?.scheduled_end ? automation.scheduled_end.slice(0, 16) : ''
  );

  // Schedule cron
  const [scheduleCron, setScheduleCron] = useState(automation?.schedule_cron ?? '');

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !prompt.trim()) {
      notify('Name and prompt are required', { type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const data: Record<string, any> = {
        name: name.trim(),
        prompt: prompt.trim(),
        max_budget_usd: maxBudget,
        max_turns: maxTurns,
        heartbeat_seconds: heartbeatEnabled ? unitToSeconds(heartbeatValue, heartbeatUnit) : null,
        scheduled_end: heartbeatEnabled && scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
        schedule_cron: scheduleCron.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (isEdit) {
        await update('automations', {
          id: automation.id,
          data,
          previousData: automation,
        }, { returnPromise: true });
        notify('Automation updated');
      } else {
        await create('automations', {
          data: {
            ...data,
            created_by: 'owner',
            user_id: identity?.id ?? null,
            status: 'active',
            created_at: new Date().toISOString(),
          },
        }, { returnPromise: true });
        notify('Automation created');
      }
      onClose();
    } catch (err: any) {
      notify(`Failed to save: ${err.message}`, { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="sm:max-w-lg w-full flex flex-col gap-0">
        <SheetHeader className="border-b">
          <SheetTitle>{isEdit ? 'Edit Automation' : 'New Automation'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-4">
          <div className="space-y-2">
            <Label htmlFor="automation-name">Name</Label>
            <Input
              id="automation-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Daily Summary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="automation-prompt">Prompt</Label>
            <Textarea
              id="automation-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What should this automation do?"
              className="min-h-[200px] resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max-turns">Max Turns</Label>
              <Input
                id="max-turns"
                type="number"
                step="1"
                min="1"
                max="100"
                value={maxTurns}
                onChange={(e) => setMaxTurns(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Heartbeat toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Heartbeat (keep-alive)</Label>
              <p className="text-xs text-muted-foreground">
                Agent stays running and resumes on each heartbeat cycle
              </p>
            </div>
            <Switch
              checked={heartbeatEnabled}
              onCheckedChange={setHeartbeatEnabled}
            />
          </div>

          {heartbeatEnabled && (
            <div className="space-y-4 rounded-lg border p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Interval</Label>
                  <Input
                    type="number"
                    min="1"
                    max={heartbeatUnit === 'seconds' ? 3600 : heartbeatUnit === 'minutes' ? 60 : 24}
                    value={heartbeatValue}
                    onChange={(e) => setHeartbeatValue(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={heartbeatUnit} onValueChange={(v) => setHeartbeatUnit(v as HeartbeatUnit)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seconds">Seconds</SelectItem>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>End Time (optional)</Label>
                <Input
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={(e) => setScheduledEnd(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Agent will stop after this time. Leave empty to run indefinitely.
                </p>
              </div>
            </div>
          )}

          {/* Schedule cron */}
          <div className="space-y-2">
            <Label>Schedule (cron)</Label>
            <Input
              value={scheduleCron}
              onChange={(e) => setScheduleCron(e.target.value)}
              placeholder="e.g. 0 20 * * * (daily at 8pm)"
            />
            <p className="text-xs text-muted-foreground">
              Standard cron: minute hour day month weekday. Leave empty for manual trigger only.
            </p>
          </div>
        </div>

        <SheetFooter className="border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
