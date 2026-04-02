export interface Env {
  EO_API_KEY: string;
  EO_LIST_ID: string;
}

const ALLOWED_ORIGIN = 'https://lumeer.github.io';

function corsHeaders(origin: string): HeadersInit {
  const allowed = origin === ALLOWED_ORIGIN || origin.startsWith('http://localhost');
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    let email: string;
    try {
      const body = await request.json<{ email?: string }>();
      email = (body.email ?? '').trim();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    const eoResponse = await fetch(
      `https://emailoctopus.com/api/1.6/lists/${env.EO_LIST_ID}/contacts`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: env.EO_API_KEY,
          email_address: email,
          status: 'PENDING', // triggers double opt-in email
        }),
      }
    );

    // Treat duplicate (409) as success — don't leak subscription status
    if (eoResponse.status === 409) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    const data = await eoResponse.json();
    return new Response(JSON.stringify(data), {
      status: eoResponse.ok ? 200 : eoResponse.status,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  },
} satisfies ExportedHandler<Env>;
