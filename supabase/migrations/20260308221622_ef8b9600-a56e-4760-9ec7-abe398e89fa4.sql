
-- Drop the restrictive update policy
DROP POLICY "Authenticated users can update rooms" ON public.rooms;

-- Allow any authenticated user to update rooms (needed for collaborative code editing)
CREATE POLICY "Authenticated users can update rooms" ON public.rooms
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
