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
} as const;

