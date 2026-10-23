# Quorum specification

## Current scope

Quorum is a browser-based daily knowledge and optimisation puzzle. The first iteration is entirely client-side: no API, database, authentication service, remote analytics or live fact lookup is involved. Cloudflare Workers can serve the static build. Client-side facts and answers are inspectable; results are for local playtesting, not authoritative competition.

## Gameplay

Each puzzle presents twelve countries and six requirements. Players select one to six countries and submit up to three checks. A selection meets a requirement if at least one selected country has a verified true relationship with it. A country can meet several requirements; multiple countries meeting one requirement do not increase coverage.

Selection alone reveals no coverage in the daily fixtures. Cards display a flag and country name, without continent or regional clues. After a check, the requirement list marks covered and missing requirements, with a count and attempt history. Changing cards keeps the previous check’s feedback visible and explicitly labels it as previous feedback. Rechecking an identical combination, regardless of order, is rejected without spending a check.

A complete result ranks ahead of an incomplete result. Complete results rank by fewest countries; incomplete results rank by most requirements covered, then fewest countries. Ties keep the earliest check. A later failed check cannot replace a complete result. Three countries is a Perfect Quorum; four to six is a Complete Quorum. An unchecked selection never counts as a result.

The third check ends play automatically. Players may finish early, including without checking, after confirming that this reveals the answers and ends the run. The result shows the best checked selection, checks used, one optimal solution, the number of optimal combinations, and expandable factual explanations with sources. All candidate relationships can be explored after completion. A spoiler-free text result includes the date, puzzle number, score, coverage progression and game URL. Sharing tries native sharing, then clipboard, then a manually copyable text area.

## Daily schedule and local testing

`src/content/puzzles.json` defines the UTC epoch (22 October 2026) and an ordered collection of authored puzzle definitions. The UTC day offset determines the puzzle number and selects a fixture by cycling through this collection. Everyone using the same content build receives the same fixture on the same UTC date. The current collection has six fixtures with different requirement mixes and repeats every six days; this is a testing schedule, not an unlimited daily puzzle generator. Open tabs switch days at the next 15-second check or visibility change.

On localhost, a testing icon in the header opens a dialog with a date preview, a reset for that day’s run and an event export. The date override uses `?date=YYYY-MM-DD`; it has separate daily progress and is ignored on other hostnames. These controls are not shown on deployed hosts. Refreshing a completed game preserves completion. Dates before the epoch are supported as backwards test fixtures and can have non-positive puzzle numbers.

## Interface

The interface uses a restrained paper, forest-green and sage palette, system sans-serif controls, Georgia display text and native flag emoji. All assets are local; external source links open only when requested. Countries precede requirements in the document. Wide screens place a three-column country grid beside a single list of requirements. Portrait phones place a four-column country grid above six full-width requirement rows, with a fixed bottom bar for selection count, Clear, remaining checks, Finish & reveal and Check selection. Landscape phones place countries beside the requirement list. The header shows the Quorum wordmark with the date and puzzle number beneath it. One instruction asks players to cover all requirements with as few countries as possible. The requirement list has a Requirements heading. Puzzle titles, theme labels, the country section heading, initial helper copy and promotional footer text are omitted; country and requirement regions retain accessible names. Coverage feedback and selection errors appear when relevant. Country tiles and requirement rows grow with the available viewport height, retaining compact sizes on short screens. Compact spacing keeps the playable board within common phone screen proportions, including space lost to browser controls. History, detailed feedback and results can scroll below the board; enlarged text or unusually short windows can also scroll rather than clip content.

Country tiles have touch targets at least 44 pixels high. Selection, coverage and missing states use ticks, numbers, accessible labels, Met/Missing text and colour. Buttons support keyboard input and visible focus; native dialogs handle focus containment and Escape. Reduced-motion preferences disable reveal animations.

The header help button opens How to play, including an interactive two-island example independent of the real puzzle. No onboarding or first-play banner blocks the board.

## Content and enrichment

`src/content/countries.json` is the starter factual catalog: twelve countries, eleven reusable attributes, display metadata, a content version, review date, explicit scope, source registry and a complete country/attribute matrix. Every relationship has `value` (true, false or null), `explanation` and `sourceIds`. Missing or null means unknown; it never means false. Published fixtures require an explicit boolean, non-empty explanation and recognised source reference for every candidate/requirement pair.

Geographical requirements use primary territory (including integral islands), excluding overseas regions and dependencies; France means metropolitan France. Transcontinental countries can cover multiple continents: Egypt covers both Africa and Asia because Sinai is in Asia. Definitions are available during play without revealing individual relationships. Language means national official status; euro means official national currency; Atlantic includes the Gulf of Guinea but excludes the Mediterranean.

To enrich content without changing engine code:

1. Add source records with stable IDs, titles and URLs. Verify facts against the stated definition and record explanations.
2. Add attributes with stable IDs, labels and precise definitions. Add explicit relationships to the countries that will participate in puzzles using them; leave unreviewed values null.
3. Add countries with an ID, name, flag symbol and fact records. Regional `clue` metadata is retained in the catalog but not displayed on tiles. Extra countries need not appear in every puzzle.
4. Add or edit puzzle definitions in `puzzles.json`, referencing country and attribute IDs. Rules configure selection/check limits, intended optimum and clue mode. Hidden and partial modes show only flags and names; full mode additionally lists matching requirements and is intended for explicit clue-based fixtures. The UI and engine consume these definitions rather than country-specific rules.
5. Run `npm run check`. Published starter fixtures must have twelve candidates, six requirements, a three-country optimum and no smaller solution. Each candidate covers at least one requirement. Bump the puzzle version when its rules or candidate/requirement set changes, and the catalog version when facts change. Preserve previously published content versions if historical result interpretation is needed; there is currently no archive UI.

Flags are native emoji rather than separate downloaded files. New themes can supply the same catalog/puzzle shapes, but registering a new theme’s file is a content-loader change in this iteration. The engine already supports abstract-symbol fixtures in tests. `PuzzleGenerator` is a replaceable function interface; its current implementation returns a copy of an authored fixture by seed. It performs no procedural generation or ingestion.

## Rules, validation and architecture

The React/TypeScript interface is built by Vite. `src/game` contains framework-independent types, coverage calculation, ranking, check limits, sharing text and exhaustive validation. `src/content` resolves and validates JSON content. `src/storage` owns browser persistence. Interface components own rendering and input; facts and scoring are not embedded in components.

The validator enumerates every non-empty subset (4,095 for twelve candidates). It finds the true minimum, all optimal combinations, solvability under the configured selection limit, complete solution counts by allowed size, near-optimal complete solutions (one country larger than the minimum), and attribute frequency. It also distinguishes an impossible puzzle from one needing more cards than allowed. Enumeration is capped at twenty candidates. Loading rejects invalid references, duplicate IDs, invalid limits, unknown relationships, absent evidence, unsolvable fixtures and a minimum inconsistent with the declared optimum. Automated content validation runs before a production build; schema/solver tests cannot independently verify factual truth, so human content review remains required.

## Identity, progress and measurement

An anonymous participant has a stable UUID independent of puzzle definitions. Each run has its own UUID, participant ID, UTC date, puzzle ID/version, catalog version, selected IDs, submitted checks and completion flag. Identity, each run and analytics use separate versioned localStorage keys. Saved check coverage is recalculated from country IDs on load rather than trusting saved scores. Invalid stored runs recover to a fresh run; completed valid runs do not restart on refresh. If browser storage is unavailable, play uses memory and displays a persistence warning. New content versions use distinct run keys; earlier saved data is retained.

Local analytics records visit, first selection, first check, each check, finish outcome and share actions, with run/date/puzzle/anonymous identifiers and a returning-player flag. Lifecycle events are deduplicated per run; the most recent 500 events are retained. Local testing can export the JSON for analysis. Nothing is sent to a server, and these local events cannot measure population-wide visitors or retention. Future server persistence and identity linking can reuse these identifiers and domain functions; neither D1 nor authoritative server enforcement is implemented now.

## Build and hosting

`npm run dev` serves local development. `npm run check` validates TypeScript, runs all automated tests and builds the static app into `dist`. `npm run build` checks TypeScript and authored content before building. The lockfile pins installed dependencies. `wrangler.jsonc` configures a static-assets Cloudflare Worker without database bindings or runtime backend code. Deployment scripts use pinned Wrangler tooling. The `quorum` Worker is connected to `paddy-devan/quorum` through Workers Builds, with `npm run check` as the build command, production branch `main`, and preview builds enabled for all other branches without exclusions. Preview URLs are enabled. These branch controls are dashboard settings, not Wrangler configuration.

Cloudflare production/preview hosting does not change the client-only game model. Accounts, social features, server analytics, historical puzzle browsing, procedural generation, content ingestion and competition-grade score enforcement remain outside this iteration.
