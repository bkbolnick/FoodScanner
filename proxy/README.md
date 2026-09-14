# FoodScanner AI proxy

A 100-line Cloudflare Worker that holds your Anthropic API key. The site sends its Claude requests here instead of to
api.anthropic.com, the Worker adds the key and streams the answer back. The key never appears in the repo, on GitHub
Pages or in anyone's browser, and every visitor gets the photo scan, the menu scanner and the meal planner without
typing a key.

## Deploy (about five minutes, free tier)

You need a Cloudflare account (free) and Node.js on your computer.

```sh
cd proxy
npx wrangler login                          # opens the browser once
npx wrangler deploy                         # prints the URL, e.g. https://foodscanner-proxy.<you>.workers.dev
npx wrangler secret put ANTHROPIC_API_KEY   # paste the key from https://console.anthropic.com/settings/keys
npx wrangler secret put PROXY_TOKEN         # optional, see "Keeping strangers out" below
```

Open the printed URL in a browser: it should say "FoodScanner AI proxy is running."

## Point the site at it

Two ways, pick one:

1. **Built in for everyone.** In `index.html`, set `DEFAULT_PROXY` (near the top of the main script) to the Worker
   URL and commit. Every visitor gets the AI features with no setup. If you deployed a `PROXY_TOKEN`, put the same
   value in `DEFAULT_PROXY_TOKEN`.
2. **Just your phone.** Open `https://bkbolnick.github.io/FoodScanner/#proxy=https://foodscanner-proxy.<you>.workers.dev`;
   the app asks once whether to send its AI requests through that host and then keeps the URL on that phone (a Home
   Screen icon made from the link asks again only after Safari has cleared the site's storage). Or paste it under
   Settings, AI features.

Either way, a key or proxy a user saves under Settings takes precedence over the built-in one.

## Keeping strangers out

The Worker URL is public, so someone who finds it could spend on your key. Four layers, in order of strength:

- **Spend limit** on the key in the Anthropic console. The only hard cap. Set it.
- **Rate limit**: uncomment the `LIMITER` block in `wrangler.toml` and redeploy; more than 30 requests a minute from
  one address are refused.
- **Allowed origins**: `ALLOWED_ORIGINS` limits browser use to your GitHub Pages site. Scripts can forge the header,
  so this stops casual reuse, not a determined one.
- **Proxy token**: with `PROXY_TOKEN` set, requests must carry `Authorization: Bearer <token>`. If the token is
  also written into the public `index.html` as `DEFAULT_PROXY_TOKEN`, it only deters scripts that never read the
  page; it is a real secret only when each user pastes it under Settings themselves.

The Worker forwards only the request fields the app uses and refuses server tools, MCP servers and containers; it sets
the beta header itself (so nobody can switch on fast mode at double the price) and forces the fallback setting to
`default`, so `ALLOWED_MODELS` and `MAX_TOKENS` really do bound what one request can cost. The rate limit is counted
before the origin and token checks, so guessing a token costs attempts too.

## Changing or rotating the key

`npx wrangler secret put ANTHROPIC_API_KEY` again. Nothing on the site changes.

## Running the checks

`npx wrangler dev` runs the Worker locally (it keeps state in `.wrangler/`, which is git-ignored, and reads local
secrets from `.dev.vars`, also ignored).

The Worker has no dependencies. The Playwright harness for the site (outside the repo) drives the Worker's `fetch`
handler directly in Node with a stubbed upstream and checks CORS, the token, the origin rule, the model and token
caps, the body checks and streaming.
