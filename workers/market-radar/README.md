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

### Required secret and rate limit
In Cloudflare Dashboard → Workers & Pages → `physio-market-radar` → Settings → Variables and Secrets:

1. Add a **Secret** named `TAVILY_API_KEY` and paste the Tavily Development key as its value.
2. Keep the environment as **Production** (this is the Cloudflare deployment environment, not Tavily's paid Production key type).
3. Keep `ALLOWED_ORIGIN` set to `https://abdelhai22-dev.github.io` as a regular variable.
4. `RADAR_RATE_LIMITER` is declared in `wrangler.toml`: 10 scan requests per 60 seconds per client IP, enforced by Cloudflare's approximate regional rate-limiting API.

Do not add secrets as plain Variables. Never commit the Tavily key to GitHub, paste it into chat, or put it in browser JavaScript. The old `RADAR_ACCESS_TOKEN` secret is no longer used by this version and may be removed from Cloudflare after the new deployment is verified.

### Deploy
This folder is the Worker project root. It contains `wrangler.toml` and `src/index.js`.

If the Worker is linked to GitHub through Cloudflare Builds, set the root directory to `workers/market-radar` and use `npx wrangler deploy` as the deploy command. Otherwise, open the Worker in Cloudflare and deploy the contents of `src/index.js` using Edit code after setting the two secrets.

## Test
Open:

`https://physio-market-radar.abdelhai22.workers.dev/health`

A healthy configuration returns JSON with `ok: true`, `provider: "configured"`, and `accessToken: "configured"`. The health endpoint never returns secret values.

Then open PHYSIO MARKET → رادار فرص السوق and press **ابدأ المسح الذكي للسوق**. The Worker URL is built into the site; no local settings, access token, email, or login are required.

## Security and operating limits
- The Tavily key and radar token stay in Cloudflare Worker Secrets.
- The browser stores no Worker URL, access token, or API key.
- The Worker accepts at most eight products per request and processes two Tavily requests concurrently.
- The Worker checks the configured allowed origin and applies an approximate Cloudflare rate limit of 10 scan requests per minute per client IP. A complete 45-product scan uses six sequential requests.
- This is a public no-login endpoint: origin checks and approximate IP rate limits reduce casual misuse but are not authentication or a strict global quota. Anyone can technically call the public endpoint outside the website; monitor Worker and Tavily usage.
- Do not run repeated full-catalog scans unnecessarily. Monitor Tavily usage and stop when the free monthly credits are exhausted; do not enable pay-as-you-go or a paid plan unless the owners explicitly approve it.
- The Worker is not a price crawler and does not bypass logins, paywalls, anti-bot controls, or site restrictions.
- Open the original source and verify exact model/part number, configuration, currency, tax, shipping, warranty, stock, and quote validity before buying.
- This is an on-demand scan. It does not run in the background or synchronize records across devices.

## Next stage
To produce confirmed current-vs-previous price comparisons and historical alerts, integrate authorized retailer feeds or product-page extraction, save snapshots in a shared database, and add scheduled scans. These features may consume additional provider credits or hosting resources.
