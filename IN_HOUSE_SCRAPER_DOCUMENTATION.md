# ReadSaver In-House Scraper Platform Documentation

## 1) Scope

This document covers the current in-house URL extraction platform used by ReadSaver to:

- accept an article URL
- extract clean article text with strict robots.txt compliance
- persist extraction results/jobs
- feed ingestion (summarization + chunking + embeddings)

This is an extraction system for user-submitted URLs, not a broad web crawler.

## 2) Product Constraints (Current)

- Traffic target: ~500 URLs/day
- Global users
- Strict robots.txt policy (fail closed)
- UX target: user should wait at most ~1 minute
- Initial access model: public
- Architecture mode: synchronous fast path with async queue fallback

## 3) High-Level Architecture

### Components

- API layer
  - `POST /api/extract` enqueue extraction, optional immediate processing
  - `GET /api/extract/:jobId` poll job state/result
  - `GET|POST /api/extract/worker` process queued jobs (cron/worker trigger)
  - `POST /api/ingest` summarize + vectorize + store article

- Extraction orchestration
  - URL normalization and dedupe by canonical URL
  - robots.txt permission gate
  - extraction method fallback chain
  - extraction result persistence

- Persistence
  - `extraction_jobs`
  - `extraction_results`
  - `domain_policies`
  - `robots_cache`

- Ingestion
  - summary generation
  - chunking + embedding + vector store persistence

### Runtime Modes

- Fast path: `processNow=true` in `/api/extract` tries to process within request lifecycle
- Async fallback: if immediate processing is unavailable/slow, client polls `GET /api/extract/:jobId`
- Background worker: `/api/extract/worker` processes queued jobs (e.g., Vercel cron)

## 4) End-to-End Flow

### User-visible flow

1. User pastes URL and clicks Analyze.
2. Frontend enqueues extraction with `processNow=true`.
3. If extraction completes immediately, frontend proceeds.
4. If not, frontend polls job status until terminal state.
5. On success, frontend calls `/api/ingest`.
6. Ingestion returns article summary payload for UI.

### Backend flow

1. Normalize URL.
2. Reuse latest `queued|running|succeeded` job for same canonical URL if present.
3. Create job if no reusable one exists.
4. Run robots.txt check.
5. If blocked or robots fetch fails in strict mode, mark `blocked_robots`.
6. Extract content using fallback chain.
7. Persist extraction result and quality score.
8. Mark job `succeeded` or `failed`.

## 5) Extraction Strategy (Current)

Implemented in `lib/features/ingest/extraction.ts`.

Order:

1. `readability` (direct fetch + Mozilla Readability via `linkedom`)
2. `playwright` fallback (optional, JS-heavy pages)
3. `jina` fallback (optional vendor fallback)

### Notes

- Jina is not the primary extractor now.
- Playwright is optional and loaded dynamically.
- Extraction enforces minimum content length threshold.
- All paths use timeout and configured User-Agent.

## 6) Robots.txt Policy (Strict Mode)

Implemented in `lib/features/extraction/services/robots-service.ts`.

Behavior:

- Domain-level override via `domain_policies` can block immediately.
- Uses `robots_cache` with TTL to avoid repeated fetches.
- If robots.txt fetch fails, request is denied (strict fail-closed).
- Evaluates `Allow` and `Disallow` with longest-match behavior.
- Returns optional `crawl-delay` info.

## 7) API Contracts

### `POST /api/extract`

Request:

```json
{
  "url": "https://example.com/article",
  "processNow": true
}
```

Typical responses:

- `200` immediate success with `{ status: "succeeded", result: ... }`
- `202` queued/running with `{ status: "queued", jobId: ... }`
- `422` terminal error (`blocked_robots` or `failed`)
- `400` invalid request
- `500` enqueue/system error

### `GET /api/extract/:jobId`

Returns job metadata, current status/step, and extraction result when available.

### `GET|POST /api/extract/worker`

- Protected by `EXTRACTION_WORKER_SECRET` or `CRON_SECRET` when configured
- Processes queued jobs with configurable `limit` (1..20)

### `POST /api/ingest`

Runs ingestion pipeline:

- extraction orchestration (reuses existing extraction flow)
- summarization
- article persistence
- vectorization (chunk + embed + save chunks)

## 8) Database Model Summary

### `extraction_jobs`

- job identity and lifecycle
- `status`: `queued | running | succeeded | failed | blocked_robots`
- `step`: `normalize | robots | extract | persist | complete`
- retry metadata (`attemptCount`, error fields)

### `extraction_results`

- extracted content metadata
- method used: `jina | readability | playwright | unknown`
- quality score

### `domain_policies`

- per-domain allow/block and crawl constraints

### `robots_cache`

- cached robots body + expiry

## 9) Environment Variables

Required for core pipeline:

- `DATABASE_URL`
- `OPENAI_API_KEY`

Extraction controls:

- `ENABLE_PLAYWRIGHT_FALLBACK` (`true|false`)
- `ENABLE_JINA_FALLBACK` (`true|false`)
- `PLAYWRIGHT_WS_ENDPOINT` (empty for local launch)
- `JINA_API_KEY` (only needed when Jina fallback enabled)

Worker security:

- `EXTRACTION_WORKER_SECRET`
- `CRON_SECRET`

## 10) Scheduling / Worker Trigger

Current Vercel cron:

- every 2 minutes
- calls `/api/extract/worker?limit=5`

Important:

- Cron is for backlog drainage and resilience, not necessarily fastest UX.
- Fast UX is driven by `processNow=true` + polling fallback.

## 11) UX Progress Model

Status/step messages map to:

- queued, running, succeeded, blocked_robots, failed
- normalize, robots, extract, persist, complete

Client polls every 2 seconds up to 90 attempts.

## 12) Performance and Scale Notes

At ~500/day, current architecture is practical. Main scaling pressure points:

- robots fetch latency/failures
- JS-heavy extraction cost (Playwright)
- summarization + embedding latency/cost

Recommended next scaling steps:

1. Move extraction worker to dedicated queue system for stronger concurrency control.
2. Add domain-level rate limiting and concurrency throttling enforcement in worker loop.
3. Add idempotency keys and duplicate suppression across ingest requests.
4. Add richer metrics and traces for P50/P95 per pipeline stage.

## 13) Observability (Current vs Needed)

Current:

- console logging only
- no dedicated metrics/tracing stack yet

Recommended near-term:

1. Structured logs with request/job IDs and method tags.
2. Metrics for queue depth, success/failure rate, robots block rate, extraction method distribution, and stage latencies.
3. Alerts on failure rate spikes and worker inactivity.

## 14) Known Gaps

- No production-grade distributed queue yet.
- Retry/backoff policy is minimal.
- No advanced anti-bot handling beyond fallback extraction methods.
- Some error handling remains generic in API layer.

## 15) Smoke Test Checklist

1. Normal article URL should complete and ingest.
2. robots-disallowed URL should return `blocked_robots`.
3. JS-heavy URL should pass via `playwright` when enabled.
4. Same URL re-submission should reuse existing job/cached article path.
5. Worker endpoint with invalid secret should return `401`.
6. Worker endpoint with valid secret should process queued jobs.

## 16) Current File Map (Core)

- Extraction API: `app/api/extract/route.ts`
- Job status API: `app/api/extract/[jobId]/route.ts`
- Worker API: `app/api/extract/worker/route.ts`
- Orchestrator: `lib/features/extraction/services/extraction-orchestrator-service.ts`
- Robots service: `lib/features/extraction/services/robots-service.ts`
- Extraction fallback chain: `lib/features/ingest/extraction.ts`
- Ingestion service: `lib/features/ingest/services/article-ingestion-service.ts`
- Vectorization service: `lib/features/vectorization/services/vectorization-service.ts`

