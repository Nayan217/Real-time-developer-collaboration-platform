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
  yaml: 'yaml', yml: 'yaml', sh: 'shell', rs: 'rust',
  rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
};

function parseRepoUrl(url: string): { owner: string; repo: string } {
  // Handle https://github.com/owner/repo or https://github.com/owner/repo.git
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

    const { room_id, repo_url, branch } = await req.json();
    if (!room_id || !repo_url || !branch) {
      return new Response(JSON.stringify({ error: 'Missing room_id, repo_url, or branch' }), { status: 400, headers: corsHeaders });
    }

    // Get user's GitHub token using service role
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
      return new Response(JSON.stringify({ error: 'GitHub not connected. Please connect GitHub first.' }), { status: 400, headers: corsHeaders });
    }

    const ghToken = tokenData.access_token;
    const { owner, repo } = parseRepoUrl(repo_url);
    const ghHeaders = {
      'Authorization': `token ${ghToken}`,
      'Accept': 'application/vnd.github.v3+json',
    };

    // 1. Get file tree
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers: ghHeaders });
    if (!treeRes.ok) {
      const errText = await treeRes.text();
      throw new Error(`GitHub tree API failed: ${treeRes.status} - ${errText}`);
    }
    const treeData = await treeRes.json();
    const blobs = (treeData.tree || []).filter((item: any) => item.type === 'blob' && item.size < 500000); // Skip files > 500KB

    // 2. Fetch file contents (batch, max 100 files)
    const filesToInsert: any[] = [];
    const batchSize = 10;

    for (let i = 0; i < Math.min(blobs.length, 200); i += batchSize) {
      const batch = blobs.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (blob: any) => {
          try {
            const contentRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${blob.path}?ref=${branch}`, { headers: ghHeaders });
            if (!contentRes.ok) return null;
            const contentData = await contentRes.json();
            const content = contentData.content ? atob(contentData.content.replace(/\n/g, '')) : '';
            return {
              room_id,
              file_path: blob.path,
              content,
              language: getLang(blob.path),
              version: 0,
              github_sha: contentData.sha || blob.sha,
            };
          } catch {
            return null;
          }
        })
      );
      filesToInsert.push(...results.filter(Boolean));
    }

    // 3. Delete existing files for this room
    await serviceClient.from('room_files').delete().eq('room_id', room_id);

    // 4. Insert all files
    if (filesToInsert.length > 0) {
      const { error: insertError } = await serviceClient.from('room_files').insert(filesToInsert);
      if (insertError) throw new Error(`Failed to insert files: ${insertError.message}`);
    }

    // 5. Update/insert branch_locks
    await serviceClient.from('branch_locks').upsert({
      room_id: room_id,
      branch_name: branch,
      locked_by: userId,
      updated_at: new Date().toISOString(),
    });

    // 6. Update room's repo_url and active_branch
    await serviceClient.from('rooms').update({
      repo_url,
      active_branch: branch,
    }).eq('id', room_id);

    // 7. Fetch branches
    const branchesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, { headers: ghHeaders });
    const branchesData = branchesRes.ok ? await branchesRes.json() : [];
    const branchNames = branchesData.map((b: any) => b.name);

    // Store branches
    await serviceClient.from('room_branches').delete().eq('room_id', room_id);
    if (branchNames.length > 0) {
      await serviceClient.from('room_branches').insert(
        branchNames.map((name: string) => {
          const branchInfo = branchesData.find((b: any) => b.name === name);
          return {
            room_id,
            branch_name: name,
            last_commit_sha: branchInfo?.commit?.sha?.substring(0, 7) || null,
          };
        })
      );
    }

    return new Response(JSON.stringify({
      success: true,
      file_count: filesToInsert.length,
      branches: branchNames,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
