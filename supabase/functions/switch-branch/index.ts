import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LANG_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', cpp: 'cpp', java: 'java', go: 'go',
  json: 'json', css: 'css', html: 'html', md: 'markdown',
};

function parseRepoUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
  if (!match) throw new Error('Invalid GitHub repo URL');
  return { owner: match[1], repo: match[2] };
}

function getLang(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  return LANG_MAP[ext] || 'plaintext';
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

    const { room_id, branch, repo_url } = await req.json();
    if (!room_id || !branch || !repo_url) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: corsHeaders });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: profileData, error: profileError } = await serviceClient
      .from('profiles')
      .select('github_access_token')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Failed to fetch GitHub token: ${profileError.message}`);
    }

    const ghToken = profileData?.github_access_token;
    if (!ghToken) {
      return new Response(JSON.stringify({ error: 'GitHub token missing — please disconnect and reconnect GitHub' }), { status: 400, headers: corsHeaders });
    }
    const { owner, repo } = parseRepoUrl(repo_url);
    const ghHeaders = {
      'Authorization': `token ${ghToken}`,
      'Accept': 'application/vnd.github.v3+json',
    };

    // Get file tree for new branch
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers: ghHeaders });
    if (!treeRes.ok) throw new Error(`Failed to fetch branch tree: ${treeRes.status}`);
    const treeData = await treeRes.json();
    const blobs = (treeData.tree || []).filter((item: any) => item.type === 'blob' && item.size < 500000);

    // Fetch contents
    const filesToInsert: any[] = [];
    const batchSize = 10;
    for (let i = 0; i < Math.min(blobs.length, 200); i += batchSize) {
      const batch = blobs.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (blob: any) => {
          try {
            const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${blob.path}?ref=${branch}`, { headers: ghHeaders });
            if (!res.ok) return null;
            const data = await res.json();
            const content = data.content ? atob(data.content.replace(/\n/g, '')) : '';
            return {
              room_id,
              file_path: blob.path,
              content,
              language: getLang(blob.path),
              version: 0,
              github_sha: data.sha || blob.sha,
            };
          } catch { return null; }
        })
      );
      filesToInsert.push(...results.filter(Boolean));
    }

    // Delete old files and insert new
    await serviceClient.from('room_files').delete().eq('room_id', room_id);
    if (filesToInsert.length > 0) {
      await serviceClient.from('room_files').insert(filesToInsert);
    }

    // Update branch lock and room
    await serviceClient.from('branch_locks').upsert({
      room_id,
      branch_name: branch,
      locked_by: userId,
      updated_at: new Date().toISOString(),
    });
    await serviceClient.from('rooms').update({ active_branch: branch }).eq('id', room_id);

    return new Response(JSON.stringify({
      success: true,
      file_count: filesToInsert.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
