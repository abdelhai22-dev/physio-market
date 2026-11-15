# PHYSIO MARKET — Live Market Radar

## Current search provider
The live discovery Worker uses **Tavily Search API** with the `basic` search depth.

- Each product is searched in two markets: Egypt (Arabic) and China (English). The public scan endpoint requires no login, email, Worker URL entry, or access token in the browser.
- Each Tavily basic query normally consumes one credit. A batch of up to eight products can therefore use up to 16 credits.
- The Worker returns source title, URL, snippet, observation time, market, and an explicitly unverified price hint when a currency-labelled amount appears in the snippet.
- Previous/current price, discount percentage, stock, and offer expiry are never invented. They remain unknown unless the source explicitly provides evidence.
- Search snippets are discovery leads, not verified supplier quotations.

## Cloudflare Worker setup

Worker name: `physio-market-radar`

Expected public URL:
`https://physio-market-radar.abdelhai22.workers.dev`

### Production configuration
In Cloudflare Dashboard → Workers & Pages → `physio-market-radar` → Settings:

1. Keep `TAVILY_API_KEY` as a **Secret** in Production.
2. Keep `ALLOWED_ORIGIN` set to `https://abdelhai22-dev.github.io` as a regular variable.
3. Production rate limit is configured in `wrangler.toml` as `RADAR_RATE_LIMITER`: 10 requests per 60 seconds per client IP.

### Worker Preview configuration
Worker Previews do not inherit Production variables, secrets, or bindings. The `previews` block in `wrangler.toml` now explicitly configures:

- `ALLOWED_ORIGIN` = `https://abdelhai22-dev.github.io`
- `RADAR_RATE_LIMITER` namespace ID `1001`, with 60 requests per 60 seconds.

In Cloudflare Dashboard → Worker → Settings → Variables and Secrets → **Previews Base**, add `TAVILY_API_KEY` again as a **Secret**, entering the existing Tavily key manually. Secret values cannot be copied from Production or stored in Git. Do not paste the key into GitHub or chat. The old `RADAR_ACCESS_TOKEN` secret is not used by this version.

The dashboard Previews Base binding and the `previews` block in `wrangler.toml` must remain in sync. Do not change the Production namespace ID or Production limit when adjusting Preview settings.

### Deploy
This folder is the Worker project root. It contains `wrangler.toml` and `src/index.js`.

For the production branch, use `npx wrangler deploy`. For a non-production branch Preview, use `npx wrangler preview` (Wrangler 4.135.0 or later). Do not use the production deploy command to test a feature branch.

If the Worker is linked to GitHub through Cloudflare Builds, configure the Preview command as `npx wrangler preview` and keep the Production deploy command as `npx wrangler deploy`.

### Test
Open:

`https://physio-market-radar.abdelhai22.workers.dev/health`

A healthy configuration returns JSON with `ok: true`, `provider: "configured"`, and `rateLimiter: "configured"`. The health endpoint never returns secret values.

Then open PHYSIO MARKET → رادار فرص السوق and press **ابدأ المسح الذكي للسوق**. The Worker URL is built into the site; no local settings, access token, email, or login are required.

## Security and operating limits
- The Tavily key stays in Cloudflare Worker Secrets; no browser-side access token is used.
- The browser stores no Worker URL, access token, or API key.
- The Worker accepts at most eight products per request and processes two Tavily requests concurrently.
- Production applies an approximate Cloudflare rate limit of 10 scan requests per minute per client IP. Preview applies its separate configured limit of 60 requests per minute per client IP.
- This is a public no-login endpoint: origin checks and approximate IP rate limits reduce casual misuse but are not authentication or a strict global quota. Anyone can technically call the public endpoint outside the website; monitor Worker and Tavily usage.
- Do not run repeated full-catalog scans unnecessarily. Monitor Tavily usage and stop when the free monthly credits are exhausted; do not enable pay-as-you-go or a paid plan unless the owners explicitly approve it.
- The Worker is not a price crawler and does not bypass logins, paywalls, anti-bot controls, or site restrictions.
- Open the original source and verify exact model/part number, configuration, currency, tax, shipping, warranty, stock, and quote validity before buying.
- This is an on-demand scan. It does not run in the background or synchronize records across devices.

## Next stage
To produce confirmed current-vs-previous price comparisons and historical alerts, integrate authorized retailer feeds or product-page extraction, save snapshots in a shared database, and add scheduled scans. These features may consume additional provider credits or hosting resources.
