import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ActivityBar, { type ActivityPanel } from '@/components/layout/ActivityBar';
import StatusBar from '@/components/layout/StatusBar';
import FileExplorer from '@/components/explorer/FileExplorer';
import EditorTabs from '@/components/editor/EditorTabs';
import MonacoEditor from '@/components/editor/MonacoEditor';
import TerminalPanel, { type TerminalLine } from '@/components/terminal/TerminalPanel';
import GitPanel from '@/components/git/GitPanel';
import ChatPanel from '@/components/ChatPanel';
import { Button } from '@/components/ui/button';
import { Play, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import type { RoomFile, OpenTab, RoomParticipant } from '@/types';
import {
  Drawer, DrawerContent, DrawerTrigger
} from '@/components/ui/drawer';
import { Files, MessageSquare } from 'lucide-react';
import LinkRepoModal from '@/components/LinkRepoModal';

const COLORS = ['#7c3aed', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'];
const LANG_MAP: Record<string, string> = {
  typescript: 'TypeScript', javascript: 'JavaScript', python: 'Python',
  cpp: 'C++', java: 'Java', go: 'Go', json: 'JSON', css: 'CSS',
  html: 'HTML', markdown: 'Markdown', plaintext: 'Plain Text',
};

const Room = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [room, setRoom] = useState<any>(null);
  const [files, setFiles] = useState<RoomFile[]>([]);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Map<string, string>>(new Map());
  const [activePanel, setActivePanel] = useState<ActivityPanel>('files');
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [running, setRunning] = useState(false);
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);
  const [saved, setSaved] = useState(true);
  const [copied, setCopied] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [branch, setBranch] = useState('main');
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [showLinkRepo, setShowLinkRepo] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const isRemoteUpdate = useRef(false);

  // Active tab's file
  const activeTab = openTabs.find(t => t.id === activeTabId);
  const activeCode = activeTabId ? (fileContents.get(activeTabId) ?? '') : '';
  const activeLanguage = activeTab?.language || 'plaintext';

  // Fetch room
  useEffect(() => {
    if (!roomCode) return;
    const fetchRoom = async () => {
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single();
      if (data) {
        setRoom(data);
        setBranch((data as any).active_branch || 'main');
      } else {
        toast.error('Room not found');
        navigate('/dashboard');
      }
    };
    fetchRoom();
  }, [roomCode, navigate]);

  // Fetch files
  const fetchFiles = useCallback(async () => {
    if (!room) return;
    const { data } = await supabase
      .from('room_files')
      .select('*')
      .eq('room_id', room.id)
      .order('file_path');
    if (data) {
      setFiles(data as RoomFile[]);
      // Update file contents map
      const newContents = new Map(fileContents);
      data.forEach((f: any) => {
        if (!isRemoteUpdate.current || !newContents.has(f.id)) {
          // Only update if not currently being edited locally
          const currentTab = openTabs.find(t => t.id === f.id);
          if (!currentTab?.isDirty) {
            newContents.set(f.id, f.content || '');
          }
        }
      });
      setFileContents(newContents);
    }
  }, [room, openTabs]);

  useEffect(() => { fetchFiles(); }, [room]);

  // Realtime file sync
  useEffect(() => {
    if (!room) return;
    const channel = supabase
      .channel(`room-files:${room.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'room_files',
        filter: `room_id=eq.${room.id}`,
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const updated = payload.new as any;
          setFileContents(prev => {
            const next = new Map(prev);
            // Only update if this tab isn't dirty
            const tab = openTabs.find(t => t.id === updated.id);
            if (!tab?.isDirty) {
              next.set(updated.id, updated.content || '');
            }
            return next;
          });
          setFiles(prev => prev.map(f => f.id === updated.id ? { ...f, ...updated } : f));
        } else {
          fetchFiles();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room, openTabs, fetchFiles]);

  // Presence
  useEffect(() => {
    if (!room || !user || !profile) return;
    const color = COLORS[Math.abs(user.id.charCodeAt(0)) % COLORS.length];
    const channel = supabase.channel(`presence:${room.id}`, {
      config: { presence: { key: user.id } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: RoomParticipant[] = Object.entries(state).map(([key, values]: [string, any]) => ({
        userId: key,
        username: values[0]?.username || 'Unknown',
        color: values[0]?.color || '#7c3aed',
        activeFile: values[0]?.activeFile || '',
      }));
      setParticipants(users);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId: user.id,
          username: profile.username,
          color,
          activeFile: activeTab?.path || '',
        });
      }
    });

    return () => { supabase.removeChannel(channel); };
  }, [room, user, profile]);

  // Update presence when active file changes
  useEffect(() => {
    if (!room || !user || !profile) return;
    const color = COLORS[Math.abs(user.id.charCodeAt(0)) % COLORS.length];
    const channel = supabase.channel(`presence:${room.id}`);
    channel.track({
      userId: user.id,
      username: profile.username,
      color,
      activeFile: activeTab?.path || '',
    }).catch(() => {});
  }, [activeTab?.path]);

  // File select handler
  const handleFileSelect = useCallback((fileId: string, filePath: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    const existing = openTabs.find(t => t.id === fileId);
    if (!existing) {
      const name = filePath.split('/').pop() || filePath;
      setOpenTabs(prev => [...prev, { id: fileId, path: filePath, name, isDirty: false, language: file.language }]);
      if (!fileContents.has(fileId)) {
        setFileContents(prev => new Map(prev).set(fileId, file.content || ''));
      }
    }
    setActiveTabId(fileId);
  }, [files, openTabs, fileContents]);

  // Code change with debounce
  const handleCodeChange = useCallback((newCode: string) => {
    if (!activeTabId) return;
    setFileContents(prev => new Map(prev).set(activeTabId, newCode));
    setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isDirty: true } : t));
    setSaved(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      await supabase.from('room_files').update({
        content: newCode,
        version: files.find(f => f.id === activeTabId)?.version ? files.find(f => f.id === activeTabId)!.version + 1 : 1,
        updated_at: new Date().toISOString(),
      }).eq('id', activeTabId);
      setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isDirty: false } : t));
      setSaved(true);
    }, 300);
  }, [activeTabId, files]);

  // Tab close
  const handleTabClose = useCallback((tabId: string) => {
    setOpenTabs(prev => {
      const next = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(next.length > 0 ? next[next.length - 1].id : null);
      }
      return next;
    });
  }, [activeTabId]);

  // Run code
  const runCode = async () => {
    if (!activeTab) return;
    setRunning(true);
    setTerminalCollapsed(false);
    setTerminalLines(prev => [...prev, { type: 'system', text: `▶ Running ${LANG_MAP[activeLanguage] || activeLanguage}...` }]);

    try {
      const { data, error } = await supabase.functions.invoke('execute-code', {
        body: { code: activeCode, language: activeLanguage },
      });
      if (error) throw error;
      if (data?.stdout) {
        data.stdout.split('\n').forEach((line: string) => {
          setTerminalLines(prev => [...prev, { type: 'stdout', text: line }]);
        });
      }
      if (data?.stderr) {
        data.stderr.split('\n').forEach((line: string) => {
          setTerminalLines(prev => [...prev, { type: 'stderr', text: line }]);
        });
      }
      const time = data?.executionTime || data?.time || '?';
      const exitCode = data?.exitCode ?? 0;
      setTerminalLines(prev => [...prev, {
        type: 'system',
        text: exitCode === 0 ? `✓ Done in ${time}s` : `✗ Error — exit code ${exitCode}`
      }]);
    } catch (err: any) {
      setTerminalLines(prev => [...prev, { type: 'stderr', text: err.message }]);
    }
    setRunning(false);
  };

  // Copy room code
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode || '');
    setCopied(true);
    toast.success('Room code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Branch change
  const handleBranchChange = async (newBranch: string) => {
    setBranch(newBranch);
    if (room) {
      await supabase.from('rooms').update({ active_branch: newBranch } as any).eq('id', room.id);
    }
  };

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Sidebar content based on active panel
  const sidebarContent = () => {
    switch (activePanel) {
      case 'files':
        return (
          <FileExplorer
            roomId={room.id}
            roomName={room.name}
            files={files}
            activeFilePath={activeTab?.path || null}
            participants={participants}
            onFileSelect={handleFileSelect}
            onFilesChange={fetchFiles}
          />
        );
      case 'git':
        return <GitPanel currentBranch={branch} onBranchChange={handleBranchChange} />;
      case 'chat':
        return <ChatPanel roomId={room.id} />;
      default:
        return null;
    }
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex h-screen flex-col bg-background">
        {/* Mobile toolbar */}
        <header className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>←</Button>
            <span className="text-sm font-semibold">{room.name}</span>
            <button onClick={copyRoomCode} className="rounded bg-secondary px-2 py-0.5 font-mono text-[10px] text-primary">
              {roomCode} {copied ? <Check className="inline h-2.5 w-2.5" /> : <Copy className="inline h-2.5 w-2.5" />}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="default" onClick={runCode} disabled={running || !activeTab}>
              {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            </Button>
            <Drawer open={mobileDrawer} onOpenChange={setMobileDrawer}>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Files className="h-4 w-4" /></Button>
              </DrawerTrigger>
              <DrawerContent className="h-[70vh]">
                <div className="flex h-full">
                  <div className="w-12 border-r border-border">
                    <ActivityBar activePanel={activePanel} onPanelChange={setActivePanel} />
                  </div>
                  <div className="flex-1">{sidebarContent()}</div>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </header>

        <EditorTabs tabs={openTabs} activeTabId={activeTabId} onTabSelect={setActiveTabId} onTabClose={handleTabClose} />

        <div className="flex-1">
          {activeTab ? (
            <MonacoEditor
              value={activeCode}
              language={activeLanguage}
              onChange={handleCodeChange}
              onCursorChange={(line, col) => setCursorPos({ line, col })}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              Open a file to start editing
            </div>
          )}
        </div>

        {!terminalCollapsed && terminalLines.length > 0 && (
          <div className="h-32">
            <TerminalPanel
              lines={terminalLines}
              running={running}
              onClear={() => setTerminalLines([])}
              collapsed={terminalCollapsed}
              onToggleCollapse={() => setTerminalCollapsed(!terminalCollapsed)}
            />
          </div>
        )}

        <StatusBar
          branch={branch}
          language={LANG_MAP[activeLanguage] || activeLanguage}
          cursorLine={cursorPos.line}
          cursorCol={cursorPos.col}
          onlineCount={participants.length}
          saved={saved}
        />
      </div>
    );
  }

  // Desktop layout — CSS Grid
  return (
    <div className="grid h-screen bg-background" style={{
      gridTemplateColumns: `48px ${activePanel ? '240px' : '0px'} 1fr`,
      gridTemplateRows: `auto 1fr ${terminalCollapsed ? '30px' : '200px'} 24px`,
    }}>
      {/* Toolbar - spans full width */}
      <header className="col-span-3 flex items-center justify-between border-b border-border px-3 py-1.5" style={{ gridRow: 1 }}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => navigate('/dashboard')}>
            ← Dashboard
          </Button>
          <span className="text-sm font-semibold">{room.name}</span>
          <button
            onClick={copyRoomCode}
            className="flex items-center gap-1 rounded bg-secondary px-2 py-0.5 font-mono text-[11px] text-primary hover:bg-secondary/80"
          >
            {roomCode}
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
          <span className="text-[11px] text-muted-foreground">{saved ? '✓ Saved' : 'Saving...'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-7 gap-1 text-xs" onClick={runCode} disabled={running || !activeTab}>
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Run
          </Button>
        </div>
      </header>

      {/* Activity Bar */}
      <div style={{ gridRow: '2 / 5', gridColumn: 1 }}>
        <ActivityBar activePanel={activePanel} onPanelChange={setActivePanel} />
      </div>

      {/* Sidebar */}
      {activePanel && (
        <div className="overflow-hidden border-r border-border" style={{ gridRow: '2 / 4', gridColumn: 2 }}>
          {sidebarContent()}
        </div>
      )}

      {/* Editor Area */}
      <div className="flex flex-col overflow-hidden" style={{ gridRow: 2, gridColumn: activePanel ? 3 : '2 / 4' }}>
        <EditorTabs tabs={openTabs} activeTabId={activeTabId} onTabSelect={setActiveTabId} onTabClose={handleTabClose} />
        <div className="flex-1">
          {activeTab ? (
            <MonacoEditor
              value={activeCode}
              language={activeLanguage}
              onChange={handleCodeChange}
              onCursorChange={(line, col) => setCursorPos({ line, col })}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="mb-1 text-lg font-medium">DevSync</p>
                <p className="text-sm">Open a file from the explorer to start coding</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Terminal */}
      <div className="overflow-hidden" style={{ gridRow: 3, gridColumn: activePanel ? 3 : '2 / 4' }}>
        <TerminalPanel
          lines={terminalLines}
          running={running}
          onClear={() => setTerminalLines([])}
          collapsed={terminalCollapsed}
          onToggleCollapse={() => setTerminalCollapsed(!terminalCollapsed)}
        />
      </div>

      {/* Status Bar */}
      <div style={{ gridRow: 4, gridColumn: '1 / 4' }}>
        <StatusBar
          branch={branch}
          language={LANG_MAP[activeLanguage] || activeLanguage}
          cursorLine={cursorPos.line}
          cursorCol={cursorPos.col}
          onlineCount={participants.length}
          saved={saved}
        />
      </div>
    </div>
  );
};

export default Room;
