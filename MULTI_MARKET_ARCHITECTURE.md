# A&S MARKET INTELLIGENCE — Multi-market foundation

## Objective
One portal with three isolated market workspaces: PHYSIO MARKET, VAPE MARKET, and TOOLS MARKET.

## Preservation
- Existing PHYSIO app is preserved byte-for-byte as `physio.html`.
- Root `index.html` becomes the market selector.
- No PHYSIO JavaScript, CSS, data, Worker endpoint, Tavily configuration, or secrets are changed.
- VAPE and TOOLS pages are foundation shells only, not live databases or functioning price engines.
- No prices, suppliers, stock claims, discounts, or market statistics are fabricated.
- VAPE workflows require a prior check of applicable age and Egyptian regulatory requirements.

## Shared architecture
Each market owns its taxonomy, product identifiers, brands, suppliers, source records, price observations, quotations, and history. Shared services may provide discovery, evidence grading, normalization, price snapshots, supplier profiles, reports, audit, and backup. Every record must be market-scoped; records must never be mixed across sectors.

## Data quality
- A public listing price is not a confirmed supplier quotation.
- Search snippets are discovery leads, not evidence of stock, price validity, or authorization.
- Never infer missing prices, specifications, model compatibility, supplier relationships, or discount expiry.
- Preserve source URL, observation time, currency, price type, product/model identity, and verification status.
- Compare only equivalent variants and configurations.
- Historical snapshots are append-only; corrections must remain auditable.

## Release gates
Before merging to main: verify preserved PHYSIO, implement and test VAPE/TOOLS schemas and workflows, design shared persistence/authentication/backup, test Worker routing/CORS/market isolation/rate limits, and confirm no API secrets are exposed. GitHub Pages is static; current PHYSIO Local Storage is browser/device-local, not shared persistence.

## Current status
Foundation only: selector portal, preserved PHYSIO entry point, and VAPE/TOOLS landing shells. No production data or integrations have been added.
