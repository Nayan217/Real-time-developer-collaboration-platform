import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const JoinRoomModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);

    const { data } = await supabase
      .from('rooms')
      .select('room_code')
      .eq('room_code', code.toUpperCase().trim())
      .single();

    if (data) {
      onClose();
      navigate(`/room/${data.room_code}`);
    } else {
      toast.error('Room not found');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join a Room</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Room Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="font-mono text-lg tracking-widest"
            />
          </div>
          <Button onClick={handleJoin} disabled={loading || code.length !== 6} className="w-full">
            {loading ? 'Joining...' : 'Join Room'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinRoomModal;
