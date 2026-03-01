# ReadSaver – In-House Scraper LinkedIn Post

---

I just finished replacing my extraction dependency with an **in-house article scraper pipeline** in ReadSaver.

The goal was simple: tighter control over reliability, robots.txt compliance, and **cost as usage grows**.

### Why I built this in-house (motivation)

- Vendor extraction APIs are great for speed, but long-term they create cost pressure.
- At low volume, pay-per-request is fine. At higher volume, extraction becomes one of the biggest variable costs.
- Free-tier limits and rate limits also introduce product risk (inconsistent UX under load).
- I wanted predictable unit economics and no hard dependency on one provider.

In short: this was a **cost + control** decision, not just a technical one.

### Requirements I designed for

**Functional requirements**

- User pastes any article URL and gets a usable summary flow.
- End-to-end experience should feel fast enough for interactive use.
- Strict robots.txt compliance (blocked means blocked).
- Works globally, not region-specific.

**Technical requirements**

- Initial scale target: ~500 URLs/day.
- Latency target: user wait time typically under ~1 minute for extraction + summary flow.
- In-house-first extraction with controlled fallbacks (Readability -> Playwright -> optional Jina).
- Async-safe architecture: immediate processing path + queued worker fallback + polling.
- Deduplication/canonicalization to reduce duplicate extraction work and cost.

### What I built

- URL normalization + dedupe by canonical URL
- Strict `robots.txt` gate (fail-closed)
- Extraction fallback chain:
  1. Direct fetch + Mozilla Readability (primary)
  2. Playwright render fallback for JS-heavy pages
  3. Optional Jina fallback for hard edge cases
- Extraction jobs with statuses/steps (`queued`, `running`, `blocked_robots`, `failed`, `succeeded`)
- Worker endpoint + cron processing for queued jobs
- Async client flow with polling fallback

### Tech stack

`Next.js + TypeScript + Prisma + PostgreSQL (Supabase) + OpenAI + Playwright + Readability`

### Why this matters

Before this, extraction was effectively vendor-first.

Now it is:

- **in-house first**
- **policy aware**
- **easier to observe and control**
- **more predictable costs and margins at scale**
- **ready to scale from pet project to production incrementally**

### End-to-end pipeline

`URL -> extraction job -> robots check -> content extraction -> persisted extraction result -> summarization -> chunking -> embeddings -> retrieval`

Biggest lesson: if you care about long-term product quality, extraction cannot be a black box. It is core infrastructure.

If you are building a RAG product and thinking about extraction architecture, happy to share details.

#AI #RAG #LLM #WebScraping #SoftwareArchitecture #BuildingInPublic #NextJS #Prisma #Supabase

---
