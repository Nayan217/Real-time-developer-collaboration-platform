import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users } from 'lucide-react';

interface Participant {
  userId: string;
  username: string;
  color: string;
}

const ParticipantList = ({ participants }: { participants: Participant[] }) => {
  return (
    <div className="border-b border-border px-4 py-3">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Users className="h-3.5 w-3.5" /> Online ({participants.length})
      </h3>
      <div className="space-y-2">
        {participants.map((p) => (
          <div key={p.userId} className="flex items-center gap-2">
            <div className="relative">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs font-semibold" style={{ backgroundColor: p.color + '30', color: p.color }}>
                  {p.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card animate-pulse-dot"
                style={{ backgroundColor: p.color }}
              />
            </div>
            <span className="text-sm">{p.username}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParticipantList;
