import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import CodeEditor from '@/components/CodeEditor';
import ChatPanel from '@/components/ChatPanel';
import ParticipantList from '@/components/ParticipantList';
import OutputPanel from '@/components/OutputPanel';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Code2, Play, Copy, Check, ArrowLeft, Loader2, MessageSquare, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

const COLORS = ['#7c3aed', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'];

interface Participant {
  userId: string;
  username: string;
  color: string;
}

const Room = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [room, setRoom] = useState<any>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [output, setOutput] = useState({ stdout: '', stderr: '', status: '', time: '' });
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showChat, setShowChat] = useState(!isMobile);
  const [showParticipants, setShowParticipants] = useState(!isMobile);
  const [showOutput, setShowOutput] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const isRemoteUpdate = useRef(false);

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
        setCode(data.current_code || '');
        setLanguage(data.language);
      } else {
        toast.error('Room not found');
        navigate('/dashboard');
      }
    };
    fetchRoom();
  }, [roomCode, navigate]);

  // Realtime code sync
  useEffect(() => {
    if (!room) return;
    const channel = supabase
      .channel(`room-code:${room.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${room.id}`,
      }, (payload) => {
        const newCode = (payload.new as any).current_code;
        const newLang = (payload.new as any).language;
        if (newCode !== undefined) {
          isRemoteUpdate.current = true;
          setCode(newCode || '');
        }
        if (newLang) setLanguage(newLang);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room]);

  // Presence
  useEffect(() => {
    if (!room || !user || !profile) return;
    const color = COLORS[Math.abs(user.id.charCodeAt(0)) % COLORS.length];

    const channel = supabase.channel(`presence:${room.id}`, {
      config: { presence: { key: user.id } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: Participant[] = Object.entries(state).map(([key, values]: [string, any]) => ({
        userId: key,
        username: values[0]?.username || 'Unknown',
        color: values[0]?.color || '#7c3aed',
      }));
      setParticipants(users);
    });

    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      newPresences.forEach((p: any) => {
        if (p.userId !== user.id) toast.info(`${p.username} joined`);
      });
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      leftPresences.forEach((p: any) => {
        toast.info(`${p.username} left`);
      });
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId: user.id, username: profile.username, color });
      }
    });

    return () => { supabase.removeChannel(channel); };
  }, [room, user, profile]);

  // Code change handler with debounce
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }
    setSaved(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (room) {
        await supabase.from('rooms').update({ current_code: newCode }).eq('id', room.id);
        setSaved(true);
      }
    }, 300);
  }, [room]);

  // Language change
  const handleLanguageChange = async (lang: string) => {
    setLanguage(lang);
    if (room) {
      await supabase.from('rooms').update({ language: lang }).eq('id', room.id);
    }
  };

  // Run code
  const runCode = async () => {
    setRunning(true);
    setShowOutput(true);
    try {
      const { data, error } = await supabase.functions.invoke('execute-code', {
        body: { code, language },
      });
      if (error) throw error;
      setOutput(data || { stdout: '', stderr: 'Execution failed', status: 'Error', time: '' });
      toast.success('Code execution complete');
    } catch (err: any) {
      setOutput({ stdout: '', stderr: err.message, status: 'Error', time: '' });
      toast.error('Execution failed');
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

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Toolbar */}
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Code2 className="h-5 w-5 text-primary" />
          <span className="font-semibold">{room.name}</span>
          <button
            onClick={copyRoomCode}
            className="flex items-center gap-1 rounded bg-muted px-2 py-1 font-mono text-xs text-primary hover:bg-muted/80"
          >
            {roomCode}
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </button>
          <span className="text-xs text-muted-foreground">
            {saved ? '✓ Saved' : 'Saving...'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="h-8 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="cpp">C++</SelectItem>
              <SelectItem value="java">Java</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={runCode} disabled={running}>
            {running ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
            Run
          </Button>
          {isMobile && (
            <>
              <Button variant="ghost" size="icon" onClick={() => setShowParticipants(!showParticipants)}>
                <Users className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowChat(!showChat)}>
                <MessageSquare className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Participants sidebar */}
        {showParticipants && (
          <div className={`${isMobile ? 'absolute inset-y-0 left-0 z-30 w-60 bg-card shadow-xl' : 'w-60'} border-r border-border`}>
            <ParticipantList participants={participants} />
          </div>
        )}

        {/* Editor + Output */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className={showOutput ? 'flex-1' : 'h-full'} style={{ minHeight: '200px' }}>
            <CodeEditor value={code} onChange={handleCodeChange} language={language} />
          </div>
          {showOutput && (
            <div className="h-48 shrink-0">
              <OutputPanel {...output} />
            </div>
          )}
        </div>

        {/* Chat panel */}
        {showChat && (
          <div className={`${isMobile ? 'absolute inset-y-0 right-0 z-30 w-80 shadow-xl' : 'w-80'}`}>
            <ChatPanel roomId={room.id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Room;
