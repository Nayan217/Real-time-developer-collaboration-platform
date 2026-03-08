import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_IDS: Record<string, number> = {
  javascript: 63,
  python: 71,
  cpp: 54,
  java: 62,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language } = await req.json();
    const languageId = LANGUAGE_IDS[language] || 63;

    const JUDGE0_KEY = Deno.env.get('JUDGE0_API_KEY');
    if (!JUDGE0_KEY) {
      return new Response(
        JSON.stringify({ stdout: '', stderr: 'Code execution service not configured. Add JUDGE0_API_KEY secret.', status: 'Error', time: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Submit code
    const submitRes = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': JUDGE0_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      },
      body: JSON.stringify({
        source_code: btoa(code),
        language_id: languageId,
        stdin: '',
      }),
    });

    const result = await submitRes.json();

    const decode = (s: string | null) => s ? atob(s) : '';

    return new Response(
      JSON.stringify({
        stdout: decode(result.stdout),
        stderr: decode(result.stderr) || decode(result.compile_output) || '',
        status: result.status?.description || 'Unknown',
        time: result.time || '',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ stdout: '', stderr: error.message, status: 'Error', time: '' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
