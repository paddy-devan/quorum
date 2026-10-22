# Quorum

Quorum is a daily country puzzle: choose the smallest group of countries that together meets nine requirements. This first iteration runs entirely in the browser, with three authored test puzzles, editable country facts, local progress and local analytics.

## Run locally

Install Node.js 22.12 or later, then run `npm ci` and `npm run dev`. Open the printed address (normally http://127.0.0.1:5173). Use **Local testing** below the game to preview another day, reset that day’s progress or export local events. Run `npm run check` for TypeScript validation, all tests and a production build. `npm run preview` serves the built app locally.

## Deployment

The static build is configured for Cloudflare Workers in `wrangler.jsonc`; no server or database is required. After Cloudflare login, `npm run deploy` publishes production and `npm run preview:deploy` publishes an isolated branch preview. The Cloudflare `quorum` Worker is connected to `paddy-devan/quorum`: Workers Builds runs `npm run check`, `main` deploys with `npx wrangler deploy`, and every other branch builds a preview with `npx wrangler preview`. Preview branch builds and Preview URLs are enabled, with no branch exclusions. These branch controls live in the Cloudflare dashboard, not the Wrangler file. The Cloudflare GitHub app must retain access to Quorum under its selected repositories so that pushes trigger builds; public read access alone does not enable webhooks.
