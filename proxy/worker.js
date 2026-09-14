// FoodScanner AI proxy: a Cloudflare Worker that holds the Anthropic API key so the public site never carries it.
// The app sends the same Messages API request it would send to api.anthropic.com; the Worker rate-limits, checks the
// origin and the optional shared token, keeps only the request fields the app uses, adds the key, forwards the request
// and streams the answer back. See README.md.

const UPSTREAM = 'https://api.anthropic.com/v1/messages';
const BETA = 'server-side-fallback-2026-07-01';   // the one beta the app relies on; a caller's own beta header is ignored (fast mode would double the price)
const MAX_BODY = 8 * 1024 * 1024;   // bytes; a 1568 px photo in base64 is about 1 MB, a week of meals a few KB
const ALLOWED_HEADERS = 'content-type, authorization, anthropic-version, anthropic-beta';
// Request fields that may reach Anthropic. Everything else is dropped (speed, thinking budgets beyond max_tokens are
// still bounded) and a few that would add cost or outbound connections on the key owner's account are refused outright.
const KEEP = ['model', 'max_tokens', 'messages', 'system', 'stream', 'output_config', 'fallbacks', 'metadata', 'temperature', 'top_p', 'top_k', 'stop_sequences', 'thinking'];
const REFUSE = ['tools', 'tool_choice', 'mcp_servers', 'container', 'context_management'];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '')) {
      return new Response('FoodScanner AI proxy is running. It only serves POST /v1/messages for the allowed origins.\n', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
    }
    if (request.method !== 'POST' || url.pathname !== '/v1/messages') return reply(404, 'not_found_error', 'Only POST /v1/messages is served here.', cors);
    if (!env.ANTHROPIC_API_KEY) return reply(500, 'api_error', 'The proxy has no ANTHROPIC_API_KEY secret. Run: wrangler secret put ANTHROPIC_API_KEY', cors);
    if (env.LIMITER) {   // optional Workers rate-limiting binding, per client address, counted before any other check so guesses cost too (see wrangler.toml)
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const { success } = await env.LIMITER.limit({ key: ip });
      if (!success) return reply(429, 'rate_limit_error', 'Too many requests from this address. Wait a minute and try again.', cors);
    }
    if (!originAllowed(origin, env)) return reply(403, 'permission_error', 'This origin is not allowed to use the proxy.', cors);
    if (env.PROXY_TOKEN) {
      const auth = request.headers.get('Authorization') || '';
      if (!timingSafeEqual(auth, 'Bearer ' + env.PROXY_TOKEN)) return reply(401, 'authentication_error', 'Missing or wrong proxy token.', cors);
    }
    const declared = Number(request.headers.get('Content-Length') || 0);
    if (declared > MAX_BODY) return reply(413, 'invalid_request_error', 'The request is too large.', cors);
    let text, body;
    try {
      const buf = await request.arrayBuffer();   // counted in bytes, whatever the declared length said
      if (buf.byteLength > MAX_BODY) return reply(413, 'invalid_request_error', 'The request is too large.', cors);
      text = new TextDecoder().decode(buf);
      body = JSON.parse(text);
    } catch (e) { return reply(400, 'invalid_request_error', 'The request body must be JSON.', cors); }
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray(body.messages)) return reply(400, 'invalid_request_error', 'The request body must be a Messages API request.', cors);
    for (const k of REFUSE) if (k in body) return reply(400, 'invalid_request_error', 'The proxy does not forward ' + k + '.', cors);
    const models = list(env.ALLOWED_MODELS);
    if (models.length && models.indexOf(String(body.model)) < 0) return reply(400, 'invalid_request_error', 'This model is not allowed by the proxy.', cors);
    // Rewrite only when something has to change; a photo body of a megabyte is otherwise forwarded as received, which
    // keeps the Worker well inside the free plan's CPU budget.
    let rewrite = false;
    const cap = Number(env.MAX_TOKENS) > 0 ? Number(env.MAX_TOKENS) : 32000;
    if (!(Number(body.max_tokens) > 0) || Number(body.max_tokens) > cap) { body.max_tokens = cap; rewrite = true; }
    if ('fallbacks' in body && body.fallbacks !== 'default') { body.fallbacks = 'default'; rewrite = true; }   // never an array naming a model outside ALLOWED_MODELS
    for (const k of Object.keys(body)) if (KEEP.indexOf(k) < 0) { delete body[k]; rewrite = true; }
    const headers = { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01', 'anthropic-beta': BETA };
    let upstream;
    try { upstream = await fetch(UPSTREAM, { method: 'POST', headers, body: rewrite ? JSON.stringify(body) : text }); }
    catch (e) { return reply(502, 'api_error', 'The proxy could not reach api.anthropic.com.', cors); }
    const out = new Headers(cors);
    out.set('content-type', upstream.headers.get('content-type') || 'application/json');
    out.set('cache-control', 'no-store');
    const reqId = upstream.headers.get('request-id');
    if (reqId) out.set('request-id', reqId);
    return new Response(upstream.body, { status: upstream.status, headers: out });   // streamed through, so SSE answers arrive as they are written
  }
};

function list(v) { return String(v || '').split(',').map(s => s.trim()).filter(Boolean); }
// With ALLOWED_ORIGINS set, only browsers on those pages get an answer; a request with no Origin header (curl, scripts)
// is refused too. Non-browser clients can forge the header, so the token and the rate limit are the real guards.
function originAllowed(origin, env) {
  const allowed = list(env.ALLOWED_ORIGINS);
  if (!allowed.length) return true;
  return allowed.indexOf('*') >= 0 || allowed.indexOf(origin) >= 0;
}
function corsHeaders(origin, env) {
  const allowed = list(env.ALLOWED_ORIGINS);
  const echo = !allowed.length || allowed.indexOf('*') >= 0 ? '*' : (allowed.indexOf(origin) >= 0 ? origin : 'null');
  return { 'access-control-allow-origin': echo, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': ALLOWED_HEADERS, 'access-control-expose-headers': 'request-id', 'access-control-max-age': '86400', 'vary': 'Origin' };
}
function reply(status, type, message, cors) {
  const out = new Headers(cors);
  out.set('content-type', 'application/json');
  out.set('cache-control', 'no-store');
  return new Response(JSON.stringify({ type: 'error', error: { type, message } }), { status, headers: out });
}
function timingSafeEqual(a, b) {
  const x = new TextEncoder().encode(String(a)), y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}
