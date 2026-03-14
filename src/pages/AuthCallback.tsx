import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let fallbackSubscription: { unsubscribe: () => void } | null = null;
    let redirected = false;

    async function saveTokenAndRedirect(session: any) {
      const providerToken = session.provider_token;
      const metadata = session.user.user_metadata ?? {};
      const username =
        metadata.user_name ??
        metadata.preferred_username ??
        session.user.email?.split('@')[0] ??
        'user';

      console.log('provider_token captured:', !!providerToken);

      const { error } = await supabase.from('profiles').upsert(
        {
          id: session.user.id,
          github_access_token: providerToken ?? null,
          github_username: metadata.user_name ?? null,
          avatar_url: metadata.avatar_url ?? null,
          username,
        },
        { onConflict: 'id' }
      );

      if (error) {
        console.error('Failed to save GitHub token:', error);
      } else {
        console.log('GitHub token saved successfully');
      }

      if (window.opener) {
        window.opener.postMessage({ type: 'oauth-complete' }, '*');
        window.close();
        return;
      }

      if (!redirected) {
        redirected = true;
        navigate('/dashboard');
      }
    }

    // getSession() catches token in callback URL hash immediately
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await saveTokenAndRedirect(session);
        return;
      }

      // fallback for delayed auth event
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
        if (!nextSession) return;
        await saveTokenAndRedirect(nextSession);
        subscription.unsubscribe();
      });

      fallbackSubscription = subscription;
    });

    return () => fallbackSubscription?.unsubscribe();
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
