import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, GitBranch, FolderGit2 } from 'lucide-react';
import { toast } from 'sonner';

interface LinkRepoModalProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  onCloned: () => void;
}

const LinkRepoModal = ({ open, onClose, roomId, onCloned }: LinkRepoModalProps) => {
  const { user } = useAuth();
  const [repoUrl, setRepoUrl] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [cloning, setCloning] = useState(false);

  const fetchBranches = async () => {
    if (!repoUrl.trim()) return;
    setLoadingBranches(true);
    try {
      // Extract owner/repo from URL
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
      if (!match) {
        toast.error('Invalid GitHub repo URL');
        setLoadingBranches(false);
        return;
      }

      // Get user's GitHub token
      const { data: tokenData } = await (supabase as any)
        .from('github_tokens')
        .select('access_token')
        .eq('user_id', user!.id)
        .single();

      if (!(tokenData as any)?.access_token) {
        toast.error('Please connect GitHub first from the Dashboard');
        setLoadingBranches(false);
        return;
      }

      const res = await fetch(`https://api.github.com/repos/${match[1]}/${match[2]}/branches`, {
        headers: {
          'Authorization': `token ${(tokenData as any).access_token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!res.ok) throw new Error(`Failed to fetch branches: ${res.status}`);
      const data = await res.json();
      const names = data.map((b: any) => b.name);
      setBranches(names);
      if (names.length > 0 && !names.includes(selectedBranch)) {
        setSelectedBranch(names[0]);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoadingBranches(false);
  };

  const handleClone = async () => {
    setCloning(true);
    try {
      const { data, error } = await supabase.functions.invoke('clone-repo', {
        body: { room_id: roomId, repo_url: repoUrl, branch: selectedBranch },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Cloned ${data.file_count} files from ${selectedBranch}`);
      onCloned();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    }
    setCloning(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderGit2 className="h-5 w-5" />
            Link GitHub Repository
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Repository URL</label>
            <div className="flex gap-2">
              <Input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="flex-1"
              />
              <Button variant="outline" size="sm" onClick={fetchBranches} disabled={loadingBranches || !repoUrl.trim()}>
                {loadingBranches ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch'}
              </Button>
            </div>
          </div>

          {branches.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Branch</label>
              <div className="grid max-h-40 gap-1 overflow-y-auto rounded border border-border p-2">
                {branches.map(b => (
                  <button
                    key={b}
                    className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                      b === selectedBranch ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                    }`}
                    onClick={() => setSelectedBranch(b)}
                  >
                    <GitBranch className="h-3.5 w-3.5" />
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button className="w-full" onClick={handleClone} disabled={cloning || !repoUrl.trim() || branches.length === 0}>
            {cloning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cloning...
              </>
            ) : (
              'Clone into Room'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LinkRepoModal;
