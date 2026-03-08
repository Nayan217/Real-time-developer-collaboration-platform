import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  username: string;
  content: string;
  user_id: string;
  created_at: string;
}

const ChatPanel = ({ roomId }: { roomId: string }) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (data) setMessages(data);
    };
    fetchMessages();

    const channel = supabase
      .channel(`messages:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user || !profile) return;
    const content = input.trim();
    setInput('');
    await supabase.from('messages').insert({
      room_id: roomId,
      user_id: user.id,
      username: profile.username,
      content,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="border-b border-border px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Chat
        </span>
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        {messages.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">No messages yet</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="mb-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-semibold text-primary">{msg.username}</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-foreground/85">{msg.content}</p>
          </div>
        ))}
        <div ref={scrollRef} />
      </ScrollArea>

      <div className="border-t border-border p-2">
        <div className="flex gap-1.5">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            className="h-7 text-xs"
          />
          <Button size="icon" className="h-7 w-7 shrink-0" onClick={sendMessage} disabled={!input.trim()}>
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
