# Monthly cost model per active metro

Phase 0 estimate, 2026-09-20. Prices come from the live pricing pages read during the Phase 0 research (URLs in `SOURCES.md`); if a price is marked *unverified* there, it is marked here too. This is a model, not a bill: the `cost_log` table replaces it with measured spend from Phase 3 on, and the admin cost explorer shows both side by side.

## 1. Activity model for one active metro

"Active" means a metro with traffic in the last 14 days, refreshed daily. A large metro (NYC) sits at the top of these ranges; a mid-size city at the bottom. The model uses the mid values; `COSTS.md` section 4 shows NYC-scale and small-city variants.

| Quantity | Symbol | Small | Mid | NYC-scale | Basis |
|---|---|---|---|---|---|
| Venues seeded (Places + OSM), once, refreshed monthly | V | 150 | 400 | 1,500 | night clubs, dance halls, studios, dance bars |
| Venues with hours fetched (opening-hours SKU) | V_h | 120 | 300 | 1,000 | only venues classified as likely dance venues |
| First-party sources harvested daily | S | 60 | 150 | 500 | organizer sites, studio schedules, venue calendars, feeds |
| Share of sources that change on a given day | c | 0.3 | 0.3 | 0.3 | conditional GETs and hashes skip the rest |
| Sources needing LLM extraction (no feed or JSON-LD) | s_llm | 0.55 | 0.55 | 0.55 | of the sources that changed |
| Sources needing a rendering service (client-side JS) | s_js | 0.15 | 0.15 | 0.15 | of the LLM-extracted sources |
| Cleaned page text per extraction (input tokens) | T_in | 6,000 | 6,000 | 6,000 | capped at ~12k; list pages are the long ones |
| Extraction output tokens | T_out | 900 | 900 | 900 | structured JSON with evidence snippets |
| Extraction escalation rate to the stronger model | e | 0.12 | 0.12 | 0.12 | low confidence, schema failure, non-Latin scripts |
| SERP queries per day (style × phrasing × language) | Q | 20 | 40 | 60 | Google Events, `date:today` and `date:tomorrow` |
| Ticketmaster calls per day | TM | 20 | 40 | 80 | radius search paged, tonight and next 6 days |
| Meetup / Eventbrite calls per day | ME | 30 | 80 | 200 | per known group or organizer |
| New tonight listings per day | L | 20 | 60 | 200 | after dedupe |
| Listings verified day-of | L_v | 12 | 35 | 120 | rule-inferred, stale or conflicting |
| Summaries generated per day | L_s | 20 | 60 | 200 | one per new listing, Batch API |
| Dedupe pairs sent to LLM per day | D | 5 | 15 | 60 | borderline band only |
| Style families for discovery | F | 13 | 13 | 13 | `config/styles.ts` |
| Languages per metro | Lang | 1 | 1.3 | 2 | discovery runs per family per language |
| Discovery runs per month | F × Lang × 4.3 | 56 | 73 | 112 | weekly per family per language |
| Web searches per discovery run | | 12 | 12 | 12 | `max_uses` 15 |
| Web fetches per discovery run | | 15 | 15 | 15 | `max_uses` 20 |
| Discovery tokens per run (input / output) | | 60k / 4k | 60k / 4k | 60k / 4k | fetched pages dominate input |
| Geocoding calls per month (new addresses only, cached) | G | 100 | 300 | 1,000 | |
| Submissions per month | Sub | 5 | 20 | 80 | URL, text or flyer |
| Cold starts per month (new or dormant metros, global) | | | | | modelled separately in section 5 |

Derived per month (30 days), mid column:

- Pages fetched for harvest: S × 30 = 4,500 fetches; changed: 1,350; LLM extractions: 1,350 × 0.55 ≈ 740; rendered: 740 × 0.15 ≈ 110.
- Extraction tokens: 740 × (6,000 in + 900 out) ≈ 4.4M in, 0.67M out; of which 12% escalated.
- Verification re-fetches: 35 × 30 = 1,050; about half unchanged; ≈ 500 extractions more.
- Summaries: 60 × 30 = 1,800 short calls (≈ 700 in, 120 out tokens each) via Batch.
- Dedupe adjudications: 15 × 30 = 450 short calls (≈ 1,200 in, 150 out).
- SERP: 40 × 30 = 1,200 searches. Ticketmaster: 1,200 calls. Meetup/Eventbrite: 2,400 calls.
- Places: seeding 400 venues costs a burst of Nearby/Text Search calls (≈ 60 searches returning 20 each) plus 300 Place Details with opening hours, then monthly refresh of hours only.

## 2. Unit prices used

<!-- research: filled from SOURCES.md after the Phase 0 research -->

## 3. Cost per metro per month by source (mid metro)

<!-- research -->

## 4. Small and NYC-scale variants

<!-- research -->

## 5. Cold start cost and global fixed costs

<!-- research -->

## 6. Budgets proposed

<!-- research -->
