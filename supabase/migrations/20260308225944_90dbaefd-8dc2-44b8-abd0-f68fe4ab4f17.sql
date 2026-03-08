
-- room_files table
CREATE TABLE public.room_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  content text DEFAULT '',
  language text DEFAULT 'plaintext',
  version int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(room_id, file_path)
);
ALTER TABLE public.room_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view room files" ON public.room_files FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert room files" ON public.room_files FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update room files" ON public.room_files FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete room files" ON public.room_files FOR DELETE TO authenticated USING (true);

-- branch_locks table
CREATE TABLE public.branch_locks (
  room_id text PRIMARY KEY,
  branch_name text DEFAULT 'main',
  locked_by text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.branch_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view branch locks" ON public.branch_locks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert branch locks" ON public.branch_locks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update branch locks" ON public.branch_locks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Add columns to rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS repo_url text;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS active_branch text DEFAULT 'main';

-- Add column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS github_username text;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.branch_locks;
