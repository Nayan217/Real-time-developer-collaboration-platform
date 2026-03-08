import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface RoomCardProps {
  room: {
    name: string;
    room_code: string;
    language: string;
    is_active: boolean;
    created_at: string;
  };
  onClick: () => void;
}

const RoomCard = ({ room, onClick }: RoomCardProps) => {
  const copyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(room.room_code);
    toast.success('Room code copied!');
  };

  return (
    <Card
      className="cursor-pointer border-border bg-card transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between">
          <h3 className="font-semibold">{room.name}</h3>
          <Badge variant={room.is_active ? 'default' : 'secondary'} className="text-xs">
            {room.is_active ? 'Active' : 'Closed'}
          </Badge>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <code className="rounded bg-muted px-2 py-1 font-mono text-sm text-primary">
            {room.room_code}
          </code>
          <button onClick={copyCode} className="text-muted-foreground hover:text-foreground">
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="capitalize">{room.language}</span>
          <span>{new Date(room.created_at).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoomCard;
