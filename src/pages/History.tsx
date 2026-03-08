import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Code2, Users, Clock } from 'lucide-react';

interface SessionRecord {
  id: string;
  room_name: string;
  code_snapshot: string;
  language: string;
  participant_count: number;
  created_at: string;
}

const History = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setSessions(data);
      });
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold">Session History</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
            <Clock className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-semibold text-muted-foreground">No sessions yet</h3>
            <p className="text-sm text-muted-foreground">Your past coding sessions will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((s) => (
              <Card key={s.id} className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">{s.room_name}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {s.participant_count}
                      </span>
                      <span className="capitalize">{s.language}</span>
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <pre className="max-h-32 overflow-hidden rounded bg-muted p-3 font-mono text-xs text-muted-foreground">
                    {s.code_snapshot?.slice(0, 500) || 'No code snapshot'}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
