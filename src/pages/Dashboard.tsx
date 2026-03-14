import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Plus, LogIn, LogOut, History, Code2, Github, Check, RotateCcw } from 'lucide-react';
import RoomCard from '@/components/RoomCard';
import CreateRoomModal from '@/components/CreateRoomModal';
import JoinRoomModal from '@/components/JoinRoomModal';
import { toast } from 'sonner';

interface Room {
  id: string;
  name: string;
  room_code: string;
  language: string;
  is_active: boolean;
  created_at: string;
  owner_id: string;
}

const Dashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [connectingGithub, setConnectingGithub] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<string>('checking...');

  useEffect(() => {
    if (!user) {
      setTokenStatus('not logged in');
      return;
    }

    const fetchRooms = async () => {
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setRooms(data);
    };
    fetchRooms();

    const checkGithub = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('github_access_token, github_username')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        setTokenStatus('❌ Could not check token status');
        return;
      }

      const hasToken = !!data?.github_access_token;
      setGithubConnected(hasToken);
      setGithubUsername(data?.github_username ?? null);
      setTokenStatus(
        hasToken
          ? `✅ Token saved for @${data?.github_username ?? 'unknown'}`
          : '❌ No token in DB — re-connect GitHub'
      );
    };

    checkGithub();
  }, [user]);

  const startGithubOAuth = async (forceReauth = false) => {
    setConnectingGithub(true);

    try {
      if (forceReauth) {
        await supabase.auth.signOut();
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          scopes: 'repo read:user user:email',
          redirectTo: window.location.origin + '/auth/callback',
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const isInIframe = window.self !== window.top;
        if (isInIframe) {
          const popup = window.open(data.url, 'github_oauth', 'width=600,height=700');
          if (!popup) {
            toast.error('Please allow popups for this site to continue with GitHub.');
            return;
          }

          const messageHandler = (event: MessageEvent) => {
            if (event.data?.type === 'oauth-complete') {
              popup?.close();
              window.removeEventListener('message', messageHandler);
              window.location.reload();
            }
          };

          window.addEventListener('message', messageHandler);
        } else {
          window.location.href = data.url;
        }
      }
    } catch (err: any) {
      console.error('OAuth error:', err);
      toast.error(err.message || 'Failed to connect GitHub');
    } finally {
      setConnectingGithub(false);
    }
  };

  const connectGithub = async () => {
    await startGithubOAuth(false);
  };

  const reconnectGithub = async () => {
    await startGithubOAuth(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">DevSync</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                {githubConnected ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs">
                    <Github className="h-3.5 w-3.5" />
                    {githubUsername}
                    <Check className="h-3 w-3 text-success" />
                  </span>
                ) : (
                  <Button variant="outline" size="sm" onClick={connectGithub} disabled={connectingGithub}>
                    <Github className="mr-1 h-4 w-4" />
                    Connect GitHub
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={reconnectGithub} disabled={connectingGithub}>
                  <RotateCcw className="mr-1 h-4 w-4" /> Reconnect GitHub
                </Button>
              </div>
              <span className="text-[11px] text-muted-foreground">{tokenStatus}</span>
            </div>
            <span className="text-sm text-muted-foreground">{profile?.username}</span>
            <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
              <History className="mr-1 h-4 w-4" /> History
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-1 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Your Rooms</h1>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowJoin(true)}>
              <LogIn className="mr-1 h-4 w-4" /> Join Room
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-1 h-4 w-4" /> Create Room
            </Button>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
            <Code2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-semibold text-muted-foreground">No rooms yet</h3>
            <p className="mb-6 text-sm text-muted-foreground">Create a room to start collaborating</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-1 h-4 w-4" /> Create Your First Room
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} onClick={() => navigate(`/room/${room.room_code}`)} />
            ))}
          </div>
        )}
      </main>

      <CreateRoomModal open={showCreate} onClose={() => setShowCreate(false)} />
      <JoinRoomModal open={showJoin} onClose={() => setShowJoin(false)} />
    </div>
  );
};

export default Dashboard;
