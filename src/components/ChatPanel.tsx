import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, MessageSquare } from 'lucide-react';
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
    <div className="flex h-full flex-col border-l border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="h-4 w-4 text-primary" /> Chat
        </h3>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {messages.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold text-primary">{msg.username}</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-foreground/90">{msg.content}</p>
          </div>
        ))}
        <div ref={scrollRef} />
      </ScrollArea>

      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="text-sm"
          />
          <Button size="icon" onClick={sendMessage} disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
