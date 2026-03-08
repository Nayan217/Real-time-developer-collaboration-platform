import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function parseRepoUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
  if (!match) throw new Error('Invalid GitHub repo URL');
  return { owner: match[1], repo: match[2] };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { room_id, file_path, content, message, repo_url, branch } = await req.json();
    if (!room_id || !file_path || content === undefined || !message || !repo_url || !branch) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tokenData } = await serviceClient
      .from('github_tokens')
      .select('access_token')
      .eq('user_id', userId)
      .single();

    if (!tokenData?.access_token) {
      return new Response(JSON.stringify({ error: 'GitHub not connected' }), { status: 400, headers: corsHeaders });
    }

    // Get current file's github_sha
    const { data: fileData } = await serviceClient
      .from('room_files')
      .select('github_sha')
      .eq('room_id', room_id)
      .eq('file_path', file_path)
      .single();

    const ghToken = tokenData.access_token;
    const { owner, repo } = parseRepoUrl(repo_url);

    // PUT to GitHub contents API
    const body: any = {
      message,
      content: btoa(content),
      branch,
    };
    if (fileData?.github_sha) {
      body.sha = fileData.github_sha;
    }

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file_path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${ghToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GitHub push failed: ${res.status} - ${errText}`);
    }

    const result = await res.json();
    const newSha = result.content?.sha;
    const commitSha = result.commit?.sha;

    // Update the file's github_sha in room_files
    if (newSha) {
      await serviceClient
        .from('room_files')
        .update({ github_sha: newSha })
        .eq('room_id', room_id)
        .eq('file_path', file_path);
    }

    return new Response(JSON.stringify({
      success: true,
      commit_sha: commitSha?.substring(0, 7) || '',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
