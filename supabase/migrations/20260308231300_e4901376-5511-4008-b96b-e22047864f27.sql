
-- Add github_sha to room_files
ALTER TABLE public.room_files ADD COLUMN IF NOT EXISTS github_sha text;

-- Create secure table for GitHub tokens (not profiles, to avoid leaking via public SELECT policy)
CREATE TABLE public.github_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  github_username text,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.github_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own token" ON public.github_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own token" ON public.github_tokens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own token" ON public.github_tokens FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- room_branches table
CREATE TABLE public.room_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  branch_name text NOT NULL,
  last_commit_sha text,
  UNIQUE(room_id, branch_name)
);
ALTER TABLE public.room_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view room branches" ON public.room_branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert room branches" ON public.room_branches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update room branches" ON public.room_branches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete room branches" ON public.room_branches FOR DELETE TO authenticated USING (true);

-- Enable realtime on room_branches
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_branches;
