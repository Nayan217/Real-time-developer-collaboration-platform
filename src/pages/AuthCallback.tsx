import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const providerToken = session.provider_token;
        if (providerToken) {
          // Non-blocking: store GitHub token then navigate
          supabase.from('github_tokens').upsert({
            user_id: session.user.id,
            access_token: providerToken,
            github_username: session.user.user_metadata?.user_name ?? null,
            updated_at: new Date().toISOString(),
          }).then(() => navigate('/dashboard'));
        } else {
          navigate('/dashboard');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-background text-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Connecting GitHub...</span>
      </div>
    </div>
  );
}
