# FoodScanner AI proxy

A small Cloudflare Worker that holds the site's API keys. The site sends its Claude requests here instead of to
api.anthropic.com, the Worker adds the key and streams the answer back; with a USDA key it also answers the barcode
lookups against USDA FoodData Central. The keys never appear in the repo, on GitHub Pages or in anyone's browser, and
every visitor gets the photo scan, the menu scanner, the meal planner and USDA data without typing anything.

There are two ways to deploy it. The first needs nothing but a phone.

## From a phone (GitHub does the work)

The workflow in `.github/workflows/deploy-proxy.yml` deploys the Worker, sets its secrets and writes the Worker URL
into `index.html`, all from repository secrets. You collect the keys and paste them into GitHub once.

1. **Cloudflare.** Sign up or log in at https://dash.cloudflare.com (free plan). Open **Workers & Pages** once, so
   the account gets its `workers.dev` subdomain (the dashboard offers to set one up the first time). Then make a token:
   profile menu (top right) › **My Profile** › **API Tokens** › **Create Token** › the **Edit Cloudflare Workers**
   template › **Use template** › **Continue to summary** › **Create Token**. Copy it; it is shown once. Also copy
   the **Account ID**: it is the 32-character string in the dashboard's address after `dash.cloudflare.com/`, and
   under **Account details** on the Workers & Pages overview.
2. **Anthropic.** At https://console.anthropic.com add credit under **Billing**, set a **monthly spend limit** under
   **Limits** (the only hard cap on what a leaked URL can cost you), then **API keys** › **Create Key** and copy it.
3. **USDA** (optional). Fill in https://fdc.nal.usda.gov/api-key-signup; the key arrives by email within a minute.
4. **GitHub.** Open the repo in the phone's browser (the GitHub app cannot edit secrets; in Safari use the
   AA menu › **Request Desktop Website** if the Settings tab is hidden): **Settings** › **Secrets and variables** ›
   **Actions** › **New repository secret**, once per secret:

   | Name | Value |
   | --- | --- |
   | `CLOUDFLARE_API_TOKEN` | the token from step 1 |
   | `CLOUDFLARE_ACCOUNT_ID` | the account id from step 1 |
   | `ANTHROPIC_API_KEY` | the key from step 2 |
   | `USDA_API_KEY` | the key from step 3 (leave out to skip USDA) |

5. **Run it.** The workflow runs on every push to `main` that touches `proxy/`, so merging the pull request that
   added it starts the first deploy; later, **Actions** › **Deploy the AI proxy** › **Run workflow** runs it by hand
   (also in the phone's browser). The run's summary shows the Worker URL, the health check and whether `index.html`
   was updated. If the secrets were added after the merge, run the workflow by hand once.
6. **Check.** The workflow commits `DEFAULT_PROXY` into `index.html`; GitHub Pages publishes it a minute or two
   later. Open the site, **Settings** › **AI features** should say "Using the site's built-in AI proxy", and the
   USDA section should say lookups go through it.

Changing or rotating a key later: update the repository secret and run the workflow again. A secret you remove from
GitHub stays on the Worker; delete it in the Cloudflare dashboard (the Worker › **Settings** › **Variables and
Secrets**) if you want it gone.

## From a computer (wrangler)

You need a Cloudflare account (free) and Node.js.

```sh
cd proxy
npx wrangler login                          # opens the browser once
npx wrangler deploy                         # prints the URL, e.g. https://foodscanner-proxy.<you>.workers.dev
npx wrangler secret put ANTHROPIC_API_KEY   # paste the key from https://console.anthropic.com/settings/keys
npx wrangler secret put USDA_API_KEY        # optional, from https://fdc.nal.usda.gov/api-key-signup
npx wrangler secret put PROXY_TOKEN         # optional, see "Keeping strangers out" below
```

Open the printed URL in a browser: it should say "FoodScanner AI proxy is running."

Then point the site at it, one of:

1. **Built in for everyone.** In `index.html`, set `DEFAULT_PROXY` (near the top of the main script) to the Worker
   URL and commit (the phone route's workflow does this for you). If you deployed a `PROXY_TOKEN`, put the same value
   in `DEFAULT_PROXY_TOKEN`.
2. **Just your phone.** Open `https://bkbolnick.github.io/FoodScanner/#proxy=https://foodscanner-proxy.<you>.workers.dev`;
   the app asks once whether to send its AI requests through that host and then keeps the URL on that phone (a Home
   Screen icon made from the link asks again only after Safari has cleared the site's storage). Or paste it under
   Settings, AI features. USDA lookups use the built-in proxy only, not one saved this way.

Either way, a key or proxy a user saves under Settings takes precedence over the built-in one.

## What the Worker serves

- `POST /v1/messages`: the Messages API request the app would send to api.anthropic.com, forwarded with the Worker's
  key and streamed back. Only the request fields the app uses are forwarded; server tools, MCP servers and containers
  are refused; the beta header is the Worker's own (so nobody can switch on fast mode at double the price); the
  fallback setting is forced to `default`; `ALLOWED_MODELS` and `MAX_TOKENS` bound what one request can cost.
- `GET /usda/foods/search?query=…&dataType=Branded&pageSize=25`: the same search the app makes at
  api.nal.usda.gov, with the Worker's `USDA_API_KEY` added. Only the search fields are forwarded (never a caller's
  `api_key`) and the page size is capped. Without the secret the route answers 404 and the app stops asking for the
  rest of the page load. USDA keys are free and allow about 1,000 requests an hour, shared by everyone using the
  site; a saved key under Settings bypasses the proxy.
- `GET /`: a one-line health check.

## Keeping strangers out

The Worker URL is public, so someone who finds it could spend on your key. Four layers, in order of strength:

- **Spend limit** on the key in the Anthropic console. The only hard cap. Set it.
- **Rate limit**: uncomment the `LIMITER` block in `wrangler.toml` and redeploy; more than 30 requests a minute from
  one address are refused. It counts USDA lookups too.
- **Allowed origins**: `ALLOWED_ORIGINS` limits browser use to your GitHub Pages site. Scripts can forge the header,
  so this stops casual reuse, not a determined one.
- **Proxy token**: with `PROXY_TOKEN` set, requests must carry `Authorization: Bearer <token>`. If the token is
  also written into the public `index.html` as `DEFAULT_PROXY_TOKEN` (the phone route's workflow does that when
  `PROXY_TOKEN` is a repository secret), it only deters scripts that never read the page; it is a real secret only
  when it is set on the Worker alone and each user pastes it under Settings themselves.

The rate limit is counted before the origin and token checks, so guessing a token costs attempts too.

## Running the checks

`npx wrangler dev` runs the Worker locally (it keeps state in `.wrangler/`, which is git-ignored, and reads local
secrets from `.dev.vars`, also ignored).

The Worker has no dependencies. The Playwright harness for the site (outside the repo) drives the Worker's `fetch`
handler directly in Node with a stubbed upstream and checks CORS, the token, the origin rule, the model and token
caps, the body checks, the USDA route and streaming.
