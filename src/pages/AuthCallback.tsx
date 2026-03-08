import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        console.log('GitHub OAuth callback - session:', { 
          hasProviderToken: !!session.provider_token,
          username: session.user.user_metadata?.user_name 
        });
        
        const providerToken = session.provider_token;
        if (providerToken) {
          const { error } = await supabase.from('github_tokens').upsert({
            user_id: session.user.id,
            access_token: providerToken,
            github_username: session.user.user_metadata?.user_name ?? null,
            updated_at: new Date().toISOString(),
          });
          
          if (error) {
            console.error('Failed to save GitHub token:', error);
          } else {
            console.log('GitHub token saved successfully');
          }
          
          // If opened as popup, notify parent and close
          if (window.opener) {
            window.opener.postMessage({ type: 'oauth-complete' }, '*');
            window.close();
          } else {
            navigate('/dashboard');
          }
        } else {
          console.warn('No provider_token in session');
          if (window.opener) {
            window.opener.postMessage({ type: 'oauth-complete' }, '*');
            window.close();
          } else {
            navigate('/dashboard');
          }
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
