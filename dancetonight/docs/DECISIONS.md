# Engineering decisions

Numbered, dated, with the alternative rejected and why. Add an entry whenever a choice would surprise a future reader or is expensive to reverse. Superseded entries stay, marked as such.

Status legend: **decided** (in force), **provisional** (decided, but the owner may overturn at the next checkpoint), **open** (needs the owner).

---

## D-001 Project lives in `dancetonight/` inside the FoodScanner repo (provisional)

**Date** 2026-09-20. **Status** provisional.

The session was started from `bkbolnick/FoodScanner`, whose root is a live single-file product served by GitHub Pages. Putting a Next.js app at the root would mix two products and break the Pages deployment assumptions. So DanceTonight is a self-contained project root at `dancetonight/`; Vercel supports this through the project's "Root Directory" setting.

**Recommended follow-up:** move to its own repository (`bkbolnick/dancetonight`) before Phase 1 code lands, so CI, Vercel, Dependabot and issue tracking stay separate. Nothing in this project references the parent repo, so the move is a `git subtree split` or a copy. Waiting on the owner (see PLAN.md open questions).

Rejected: repo root (mixes products); a git submodule (friction for one person).

## D-002 Toolchain: pnpm, Node LTS, Next.js App Router, TypeScript strict, Tailwind, Drizzle with SQL migrations (decided)

**Date** 2026-09-20.

Follows SPEC section 7. Specifics: pnpm (fast, strict node_modules, workspace-ready if we ever split packages); the current Node LTS at Phase 1 start (pinned in `.nvmrc` and `package.json#engines`); `drizzle-kit generate` produces SQL migration files that are committed and reviewed, `drizzle-kit migrate` applies them. Raw SQL is used for PostGIS and trigram indexes that Drizzle cannot express, kept in the same migration files.

Rejected: Prisma (weaker PostGIS story, migration engine adds a binary); Supabase's dashboard migrations (not reviewable in git).

## D-003 Time handling: UTC instants plus IANA zone; date-fns v4 with `@date-fns/tz`; `geo-tz` for coordinates to zone (decided)

**Date** 2026-09-20.

Every timestamp is stored as `timestamptz` (UTC) alongside the IANA zone it was expressed in (`tz` column) so wall-clock rendering and recurrence math are exact across DST. Zone lookup from coordinates uses `geo-tz` on the server (accurate polygon data; too large for the client, which never needs it: the API returns the zone). Date math uses date-fns v4 with `@date-fns/tz` (`TZDate`), which is tree-shakeable and works in both server and client bundles.

Rejected: Luxon (fine, but heavier in the client bundle and a second date idiom next to the Intl formatting we already need); `tz-lookup` (tiny but coarse near zone borders, which is exactly where venues in border cities sit); the Temporal polyfill (large; wait for native Temporal).

## D-004 "Tonight" is defined by a night date, not a calendar date (decided)

**Date** 2026-09-20.

Definition, all in the location's local zone:

- `night_date(t) = local_date(t − 6 hours)`. A 1:00am set on Saturday belongs to Friday night. A 6:00am start belongs to that day.
- `current_night_date(now) = night_date(now)`. Before 6am this is yesterday's date, so "tonight" is the night that is ending.
- A listing is "tonight" when `night_date(starts_at) == current_night_date(now)` and it has not ended, or it is in progress: `starts_at < now < effective_end`.
- `effective_end = ends_at`, or when `ends_at` is null a default by listing type (class 90 min, social 4 h, club night 6 h, venue open night: closing time from hours), flagged "End not listed".
- Day picker for a future day D shows listings with `night_date(starts_at) == D`, which spans D 06:00 to D+1 05:59 local, so afternoon classes and 2am after-hours both land on the right day.
- `starts_at = coalesce(dancing_at, lesson_at, doors_at)`; a listing with only doors known is shown from doors.

This rule is a single pure function in `src/domain/tonight.ts` with unit tests for: 5:59 vs 6:00, a 1am start before and after 6am, the New York DST transitions of 2026-03-08 and 2026-11-01, a southern-hemisphere zone (Australia/Sydney), a half-hour zone (Asia/Kolkata), and a zone without DST.

Rejected: calendar-date windows (a 12:30am milonga would show under the wrong day); a rolling "next 12 hours" (unpredictable for a day picker).

## D-005 Recurrence: RRULE strings in wall-clock local time, `rrule` library, occurrences materialized 14 days ahead, exceptions in their own table (decided)

**Date** 2026-09-20.

`series.rrule` holds an RFC 5545 RRULE with `DTSTART` in the venue's zone (`TZID`), so "every Thursday at 8pm" stays 8pm across DST. Materialization runs nightly per metro and writes `events` rows with `confirmation = recurring_unconfirmed` for occurrences that exist only because of the rule. When a harvest finds a dated first-party occurrence that matches the series on the same night date, the row is upgraded to `confirmed_today` and linked. `series_exceptions` holds cancellations and overrides (moved time or venue) keyed by night date, each with provenance. `EXDATE`/`RDATE` from feeds are imported into that table rather than kept in the string, so the admin UI can show and edit them.

Rejected: materializing only on read (recurrence math on every list query is slow and hard to cache); storing occurrences without a series (loses "Every Thursday" text and the confirmed/unconfirmed distinction).

## D-006 Dedupe: SQL candidate generation, deterministic score, LLM only for the borderline band (decided)

**Date** 2026-09-20.

Candidates (per metro, per night date): pairs where `|starts_at difference| ≤ 90 min` and (`ST_DWithin(venue geo, 150 m)` or normalized venue name trigram similarity ≥ 0.8). Score in `[0, 1]`:

```
0.50 × trigram(title_normalized)
0.20 × same organizer (id match or normalized-name similarity ≥ 0.9)
0.20 × URL match (same registrable domain and path family, or the same ticket URL)
0.10 × same venue entity
```

`≥ 0.80` auto-merge; `0.50–0.79` LLM adjudication (small model, structured output, both listings' facts only, no page text); `< 0.50` distinct. Every decision is written to `merge_decisions`; borderline LLM decisions with low confidence go to the moderation queue. Merged listings keep every source; field precedence is first-party, then ticketing API, then SERP aggregate, then directory; a disagreement on time, venue or price sets `conflicting` and both values are shown. Thresholds are constants in `config/dedupe.ts` and the scoring function is pure and unit-tested against a fixture set of known duplicates and near-misses.

Rejected: embeddings (adds pgvector and cost for little gain when titles, times and places already discriminate); LLM on every pair (expensive, non-deterministic).

## D-007 Model roles for the AI pipeline (provisional; IDs and tool versions re-checked at Phase 3 build time)

**Date** 2026-09-20. **Status** provisional, pending the pricing verification in SOURCES.md.

| Job | Model | Why |
|---|---|---|
| HTML to listing extraction (daily, high volume) | `claude-haiku-4-5` | cheapest current model; structured outputs; the page text is short after cleaning |
| Extraction escalation (low confidence, schema failure, non-Latin scripts) | `claude-sonnet-5` | stronger reading at 2× Haiku's price, still far below Opus |
| Discovery agent (weekly per metro per style family, web search and fetch tools) | `claude-opus-5` | coverage is the product; discovery quality compounds; volume is small and bounded |
| Dedupe adjudication, venue classification, style mapping fallbacks | `claude-haiku-4-5` | classification on structured facts |
| Summaries (2 to 3 sentences from structured facts) | `claude-haiku-4-5` via the Batch API | latency irrelevant; 50% discount |
| Submission extraction (URL, text, flyer image) | `claude-sonnet-5` | user is waiting; images need the stronger reader |

All calls use structured outputs (`output_config.format` with a zod-derived JSON schema) and are validated again with zod on our side. Static system prompts carry `cache_control` breakpoints. Discovery uses the current web search and web fetch server tools with `max_uses` caps; extraction calls carry no tools. The exact model IDs, server tool type strings and prices are read from the live docs when Phase 3 starts and recorded in SOURCES.md; this table records the role split, not the strings.

Rejected: Opus for extraction (10× the cost on the highest-volume path); a non-Anthropic model mix (one SDK, one billing surface, prompt caching across the pipeline).

## D-008 One adapter interface with three optional roles; flags, limits and health are uniform (decided)

**Date** 2026-09-20.

Every source implements `SourceAdapter` (sketched in PLAN.md section 7). Roles are optional methods: `seedVenues` (Places, OSM), `discoverSources` (SERP, ticketing APIs, directories, the AI discovery agent), `harvest` (feeds, JSON-LD, platform JSON, HTML extraction, ticketing APIs) and `fastPath` (the cold-start subset). The pipeline never calls an adapter directly: a runner wraps every call with the feature flag check, the blocklist check, the robots.txt check, the per-domain limiter, conditional-GET headers, timing and error metrics, and cost logging. Adapters therefore contain only source-specific parsing.

Rejected: separate interfaces per tier (the runner would need four code paths for the same cross-cutting rules).

## D-009 Raw page text is retained briefly, evidence snippets are short, nothing verbatim is displayed (decided)

**Date** 2026-09-20.

`raw_documents` stores the cleaned text of a fetched page for 14 days (content hash and ETag are kept indefinitely) so that re-extraction after a prompt change, the extraction eval, and admin debugging work without re-fetching. `field_provenance.evidence` is capped at 300 characters and is shown only in admin. Public pages show our own summary, structured facts and links to the source. This satisfies SPEC section 8 (store facts and our own summaries) while keeping the pipeline reproducible.

Rejected: no retention (every prompt change would re-crawl every source, which is the opposite of good citizenship); indefinite retention (unnecessary copy of third-party text).

## D-010 Privacy defaults (decided)

**Date** 2026-09-20.

The list API accepts precise coordinates only in memory for the query; logs, analytics events and error reports receive coordinates rounded to two decimals (about 1 km). The browser geolocation prompt fires only from the "Use my exact location" button. The last location is remembered in `localStorage`, never server-side. Analytics run cookieless. No accounts in v1; preferences live in `localStorage`; all list state lives in URL params so views are shareable.

## D-011 Mock mode is a first-class runtime mode, not a test fixture (decided)

**Date** 2026-09-20.

With no API keys present, `pnpm dev` runs against a local seed of realistic NYC listings whose dates are expressed relative to "now" (offsets, not fixed dates), the map uses a keyless tile layer, geocoding resolves from a small built-in gazetteer, and AI calls return canned structured results. The mode is selected by one `MOCK_MODE` derivation in `src/config/env.ts` and every external client has a mock implementation behind the same interface. The seed doubles as the Phase 1 UI dataset and the Playwright fixture.

## D-012 Job runner: to be decided from live pricing and limits (open)

**Date** 2026-09-20. **Status** open until the source research completes (Inngest vs Trigger.dev). Requirements: cron, fan-out, retries, per-key concurrency of 1 with a 5-second spacing per domain, steps that run for minutes, a Vercel-friendly deployment, and a free tier that covers development.

## D-013 Map stack: to be decided from Google Maps Platform terms (open)

**Date** 2026-09-20. **Status** open until the research on Places display terms completes. If Places content may only be shown together with a Google map, the map layer is Maps JavaScript API; otherwise MapLibre with an open tile provider is cheaper and lighter.
