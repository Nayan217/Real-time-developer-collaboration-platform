import { useState, useEffect } from 'react';
import { GitBranch, GitCommit, ChevronDown, Loader2, FolderGit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RoomBranch } from '@/types';

interface GitPanelProps {
  roomId: string;
  repoUrl: string | null;
  currentBranch: string;
  activeFilePath: string | null;
  activeFileContent: string;
  onBranchChange: (branch: string) => void;
  onLinkRepo: () => void;
}

const GitPanel = ({ roomId, repoUrl, currentBranch, activeFilePath, activeFileContent, onBranchChange, onLinkRepo }: GitPanelProps) => {
  const [commitMessage, setCommitMessage] = useState('');
  const [showBranches, setShowBranches] = useState(false);
  const [branches, setBranches] = useState<RoomBranch[]>([]);
  const [committing, setCommitting] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!roomId) return;
    const fetchBranches = async () => {
      const { data } = await supabase
        .from('room_branches' as any)
        .select('*')
        .eq('room_id', roomId);
      if (data) setBranches(data as any);
    };
    fetchBranches();
  }, [roomId, currentBranch]);

  const handleBranchSwitch = async (branchName: string) => {
    if (!repoUrl || branchName === currentBranch) {
      setShowBranches(false);
      return;
    }
    setSwitching(true);
    setShowBranches(false);
    try {
      const { data, error } = await supabase.functions.invoke('switch-branch', {
        body: { room_id: roomId, branch: branchName, repo_url: repoUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Switched to ${branchName} (${data.file_count} files)`);
      onBranchChange(branchName);
    } catch (err: any) {
      toast.error(err.message);
    }
    setSwitching(false);
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || !repoUrl || !activeFilePath) return;
    setCommitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('commit-and-push', {
        body: {
          room_id: roomId,
          file_path: activeFilePath,
          content: activeFileContent,
          message: commitMessage,
          repo_url: repoUrl,
          branch: currentBranch,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Pushed! Commit: ${data.commit_sha}`);
      setCommitMessage('');
    } catch (err: any) {
      toast.error(err.message);
    }
    setCommitting(false);
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="border-b border-border px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Source Control
        </span>
      </div>

      <ScrollArea className="flex-1">
        {!repoUrl ? (
          <div className="flex flex-col items-center justify-center px-3 py-8 text-center">
            <FolderGit2 className="mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="mb-3 text-xs text-muted-foreground">No repository linked</p>
            <Button size="sm" variant="outline" className="text-xs" onClick={onLinkRepo}>
              Link GitHub Repo
            </Button>
          </div>
        ) : (
          <>
            {/* Branch Selector */}
            <div className="border-b border-border p-3">
              <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Branch</label>
              <div className="relative">
                <button
                  onClick={() => setShowBranches(!showBranches)}
                  disabled={switching}
                  className="flex w-full items-center justify-between rounded border border-border bg-secondary px-2.5 py-1.5 text-xs disabled:opacity-50"
                >
                  <span className="flex items-center gap-1.5">
                    {switching ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitBranch className="h-3 w-3 text-success" />}
                    {currentBranch}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showBranches && (
                  <div className="absolute left-0 top-full z-10 mt-1 w-full rounded border border-border bg-popover py-1 shadow-lg">
                    {branches.length > 0 ? branches.map(b => (
                      <button
                        key={b.branch_name}
                        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-xs hover:bg-secondary"
                        onClick={() => handleBranchSwitch(b.branch_name)}
                      >
                        <GitBranch className="h-3 w-3" />
                        {b.branch_name}
                        {b.last_commit_sha && <span className="ml-auto font-mono text-[10px] text-muted-foreground">{b.last_commit_sha}</span>}
                        {b.branch_name === currentBranch && <span className="text-primary">✓</span>}
                      </button>
                    )) : (
                      <p className="px-2.5 py-1.5 text-xs text-muted-foreground">No branches loaded</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Commit Section */}
            <div className="p-3">
              <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                Commit {activeFilePath ? `(${activeFilePath.split('/').pop()})` : ''}
              </label>
              <Input
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Commit message..."
                className="mb-2 h-8 text-xs"
                onKeyDown={(e) => { if (e.key === 'Enter') handleCommit(); }}
              />
              <Button
                size="sm"
                className="w-full text-xs"
                disabled={!commitMessage.trim() || committing || !activeFilePath}
                onClick={handleCommit}
              >
                {committing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <GitCommit className="mr-1 h-3 w-3" />}
                Commit & Push
              </Button>
              {!activeFilePath && (
                <p className="mt-1.5 text-[10px] text-muted-foreground">Open a file to commit</p>
              )}
            </div>

            {/* Repo info */}
            <div className="border-t border-border p-3">
              <span className="text-[11px] font-medium text-muted-foreground">Repository</span>
              <p className="mt-1 truncate text-xs text-foreground/70">{repoUrl}</p>
            </div>
          </>
        )}
      </ScrollArea>
    </div>
  );
};

export default GitPanel;
