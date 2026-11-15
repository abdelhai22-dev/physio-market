# A&S MARKET INTELLIGENCE — Multi-market foundation

## Objective
One portal with three isolated market workspaces: PHYSIO MARKET, VAPE MARKET, and TOOLS MARKET.

## Preservation
- The existing PHYSIO app is preserved at `physio.html`; its original entry file was copied byte-for-byte before the portal was introduced.
- The PHYSIO app's JavaScript, data, Cloudflare Worker, Tavily configuration, and secrets are not modified by these sector modules.
- TOOLS has a browser-local working module for products, suppliers, sources, price observations, append-only historical observations, CSV export, and discovery scans through the existing Worker.
- VAPE is limited to public information classification and regulatory/source monitoring. No nicotine-product sourcing, supplier discovery, price comparison, quotations, or purchase workflows are implemented.
- Both new modules currently persist in browser Local Storage; they are not shared across devices or users.

## Data quality
A public listing price is not a confirmed supplier quotation. Search snippets are discovery leads, not evidence of stock, price validity, or authorization. Preserve source URL, observation time, currency, price type, product/model identity, and verification status. Compare only equivalent variants. Historical observations are append-only.

## Security and deployment
GitHub Pages is static; Local Storage is browser/device-local. Do not put API keys, credentials, private supplier quotes, or sensitive customer data in client files. The existing Worker uses Tavily server-side; TOOLS calls its existing endpoint without exposing the secret. Multi-user production requires a backend/API, authentication, market-scoped persistence, audit log, backups, CORS and rate-limit tests.

## Release gates
Review and test PHYSIO, TOOLS CRUD, CSV export, Worker scan, and mobile layouts. VAPE remains non-commercial and source/regulatory focused. Merge only after these checks.
