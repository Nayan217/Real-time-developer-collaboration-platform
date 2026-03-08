import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANGUAGE_IDS: Record<string, number> = {
  javascript: 63,
  typescript: 74,
  python: 71,
  cpp: 54,
  java: 62,
  go: 60,
};

const PISTON_LANGS: Record<string, { language: string; version: string }> = {
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  python: { language: 'python', version: '3.10.0' },
  cpp: { language: 'c++', version: '10.2.0' },
  java: { language: 'java', version: '15.0.2' },
  go: { language: 'go', version: '1.16.2' },
};

async function executeWithJudge0(code: string, languageId: number, apiKey: string) {
  const submitRes = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=true&wait=true', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
    },
    body: JSON.stringify({
      source_code: btoa(code),
      language_id: languageId,
      stdin: '',
    }),
  });

  if (!submitRes.ok) throw new Error(`Judge0 HTTP ${submitRes.status}`);

  const result = await submitRes.json();
  const decode = (s: string | null) => s ? atob(s) : '';

  return {
    stdout: decode(result.stdout),
    stderr: decode(result.stderr) || decode(result.compile_output) || '',
    exitCode: result.status?.id === 3 ? 0 : 1,
    executionTime: parseFloat(result.time || '0'),
    status: result.status?.description || 'Unknown',
  };
}

async function executeWithPiston(code: string, language: string) {
  const pistonLang = PISTON_LANGS[language];
  if (!pistonLang) throw new Error(`Unsupported language: ${language}`);

  const res = await fetch('https://emkc.org/api/v2/piston/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: pistonLang.language,
      version: pistonLang.version,
      files: [{ content: code }],
    }),
  });

  if (!res.ok) throw new Error(`Piston HTTP ${res.status}`);

  const result = await res.json();
  const run = result.run || {};

  return {
    stdout: run.stdout || '',
    stderr: run.stderr || '',
    exitCode: run.code ?? 0,
    executionTime: 0,
    status: run.code === 0 ? 'Accepted' : 'Error',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language } = await req.json();
    const languageId = LANGUAGE_IDS[language] || 63;
    const JUDGE0_KEY = Deno.env.get('JUDGE0_API_KEY');

    let result;

    // Try Judge0 first if key is available
    if (JUDGE0_KEY) {
      try {
        result = await executeWithJudge0(code, languageId, JUDGE0_KEY);
      } catch (e) {
        console.error('Judge0 failed, falling back to Piston:', e.message);
        result = await executeWithPiston(code, language);
      }
    } else {
      // Fallback to Piston
      result = await executeWithPiston(code, language);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ stdout: '', stderr: error.message, exitCode: 1, executionTime: 0, status: 'Error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
