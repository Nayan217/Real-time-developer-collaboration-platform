import { useState } from 'react';
import { GitBranch, GitCommit, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface GitPanelProps {
  currentBranch: string;
  onBranchChange: (branch: string) => void;
}

const BRANCHES = ['main', 'develop', 'feature/new-ui', 'bugfix/hotfix'];

const GitPanel = ({ currentBranch, onBranchChange }: GitPanelProps) => {
  const [commitMessage, setCommitMessage] = useState('');
  const [showBranches, setShowBranches] = useState(false);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="border-b border-border px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Source Control
        </span>
      </div>

      <ScrollArea className="flex-1">
        {/* Branch Selector */}
        <div className="border-b border-border p-3">
          <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Branch</label>
          <div className="relative">
            <button
              onClick={() => setShowBranches(!showBranches)}
              className="flex w-full items-center justify-between rounded border border-border bg-secondary px-2.5 py-1.5 text-xs"
            >
              <span className="flex items-center gap-1.5">
                <GitBranch className="h-3 w-3 text-success" />
                {currentBranch}
              </span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {showBranches && (
              <div className="absolute left-0 top-full z-10 mt-1 w-full rounded border border-border bg-popover py-1 shadow-lg">
                {BRANCHES.map(b => (
                  <button
                    key={b}
                    className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-xs hover:bg-secondary"
                    onClick={() => { onBranchChange(b); setShowBranches(false); }}
                  >
                    <GitBranch className="h-3 w-3" />
                    {b}
                    {b === currentBranch && <span className="ml-auto text-primary">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Commit Section */}
        <div className="p-3">
          <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Commit</label>
          <Input
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Commit message..."
            className="mb-2 h-8 text-xs"
          />
          <Button size="sm" className="w-full text-xs" disabled={!commitMessage.trim()}>
            <GitCommit className="mr-1 h-3 w-3" />
            Commit & Push
          </Button>
        </div>

        {/* Placeholder commit history */}
        <div className="border-t border-border p-3">
          <span className="text-[11px] font-medium text-muted-foreground">Recent Commits</span>
          <div className="mt-2 space-y-2">
            <div className="rounded bg-secondary/50 p-2">
              <p className="text-xs text-foreground">Initial commit</p>
              <p className="text-[10px] text-muted-foreground">abc1234 • just now</p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default GitPanel;
