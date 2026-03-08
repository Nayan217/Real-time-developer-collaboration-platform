
-- Drop the overly permissive update policy on rooms
DROP POLICY "Room owner can update room" ON public.rooms;

-- Create a proper update policy - any authenticated user in the room can update code
-- but we allow all authenticated users to update (for collaborative editing)
CREATE POLICY "Authenticated users can update rooms" ON public.rooms
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
