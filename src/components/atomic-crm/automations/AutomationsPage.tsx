import { useState } from 'react';
import { useGetList } from 'ra-core';
import { Bot, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AutomationsList } from './AutomationsList';
import { AutomationDialog } from './AutomationDialog';

const PURPLE = '#a78bfa';

export function AutomationsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: automations } = useGetList('automations', {
    pagination: { page: 1, perPage: 100 },
  });

  return (
    <div className="max-w-5xl px-6 pb-6 pt-0 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `color-mix(in srgb, ${PURPLE} 15%, transparent)` }}
          >
            <Bot className="w-5 h-5" style={{ color: PURPLE }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Automations</h1>
            <p className="text-sm text-muted-foreground">
              {automations?.length ?? 0} automation{(automations?.length ?? 0) !== 1 ? 's' : ''} configured
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Automation
        </Button>
      </div>

      <AutomationsList />

      <AutomationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}

AutomationsPage.path = '/automations';
