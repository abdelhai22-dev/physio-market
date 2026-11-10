# PHYSIO MARKET — Live Market Radar setup

## What this adds
- The browser UI sends product identities to a private Worker endpoint.
- The Worker searches Brave Search for each product in Egypt (Arabic) and China/global supplier results (English).
- Search results are returned inside the radar with source URL, search observation time, market, and the original query.
- A price string is shown only when a currency-labelled amount appears in the search result snippet. It is explicitly marked **unverified** until the source is opened.
- Previous/current price, discount percentage, stock, and offer expiry are never invented. They remain unknown unless the provider returns explicit evidence in a future verified extraction phase.

## Deploy the search service
1. Create a Cloudflare account and install Wrangler: `npm install -g wrangler`.
2. From this directory, run `wrangler login`.
3. Enter `workers/market-radar` and run `wrangler secret put BRAVE_API_KEY`; paste the API key from the Brave Search API dashboard.
4. Run `wrangler secret put RADAR_ACCESS_TOKEN`; choose a long random private token. Do not commit either value to GitHub.
5. Run `wrangler deploy`. Copy the resulting `https://...workers.dev` URL.
6. Open PHYSIO MARKET → رادار فرص السوق → ابدأ المسح الذكي للسوق. Paste the Worker URL and the RADAR_ACCESS_TOKEN, then save settings and start the scan.

Brave Search API currently lists prepaid Web Search pricing at $5 per 1,000 requests and advertises $5 monthly credits; verify the current plan in the provider dashboard before running large scans. Each batch currently makes up to two search requests per product (Egypt + China). The UI batches eight products at a time.

## Security and operating limits
- The Brave API key stays in Worker secrets, never in browser JavaScript or this repository.
- The browser stores only the Worker URL and the Worker access token in localStorage on that device.
- The Worker caps each request at eight products and processes search requests in small concurrent groups.
- The Worker is not a price crawler and does not bypass logins, paywalls, anti-bot controls, or site restrictions.
- Search snippets are discovery leads, not verified supplier quotations. Open the original source and verify exact model/part number, configuration, currency, tax, shipping, warranty, stock, and quote validity before buying.
- Expiry is shown as "not announced" unless the search snippet explicitly contains an expiry phrase. The initial release does not claim a discount or calculate savings from a single result.
- This is an on-demand scan. It does not run in the background or synchronize records across devices.

## Next stage
To produce confirmed current-vs-previous price comparisons and historical alerts, integrate product-page structured data or authorized retailer feeds, save snapshots in a shared database, and add scheduled scans. Those features require a persistent backend/database and may incur provider or hosting costs.
