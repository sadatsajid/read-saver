/**
 * Article ingestion configuration constants
 * Centralized configuration for article processing and chunking
 */

export const INGEST_CONFIG = {
  // Content size limits
  MAX_CONTENT_MB: 2, // Maximum article content size in MB (prevents OOM)

  // Chunking parameters
  CHUNK_MAX_CHARS: 1000, // Maximum characters per chunk
  CHUNK_OVERLAP: 200, // Overlap between chunks in characters

  // Batch processing
  BATCH_SIZE: 100, // Number of chunks to process in each batch

  // Extraction behavior
  EXTRACTION_USER_AGENT:
    'ReadSaverBot/1.0 (+https://readsaver.ai; support@readsaver.ai)',
  EXTRACTION_TIMEOUT_MS: 30000,
  EXTRACTION_MIN_CONTENT_CHARS: 300,
  ENABLE_JINA_FALLBACK: process.env.ENABLE_JINA_FALLBACK === 'true',
  ENABLE_PLAYWRIGHT_FALLBACK:
    process.env.ENABLE_PLAYWRIGHT_FALLBACK === 'true',
  PLAYWRIGHT_NAVIGATION_TIMEOUT_MS: 25000,
  PLAYWRIGHT_WAIT_AFTER_LOAD_MS: 1200,
  PLAYWRIGHT_WS_ENDPOINT: process.env.PLAYWRIGHT_WS_ENDPOINT || '',

  // Robots defaults (strict mode)
  ROBOTS_CACHE_TTL_MS: 12 * 60 * 60 * 1000, // 12 hours
  DEFAULT_DOMAIN_MAX_RPS: 1,
  DEFAULT_DOMAIN_MAX_CONCURRENCY: 1,
} as const;
