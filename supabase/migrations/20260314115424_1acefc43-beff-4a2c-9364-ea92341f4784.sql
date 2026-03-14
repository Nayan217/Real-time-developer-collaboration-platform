ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can upsert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO public
USING (auth.uid() = id);