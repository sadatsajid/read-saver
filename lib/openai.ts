import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Server-side only (not NEXT_PUBLIC_)
});

// Model configurations
// Embedding model - can override with OPENAI_EMBEDDING_MODEL env var
// Common options: text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002
export const EMBEDDING_MODEL: string =
  process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

// Chat model - can override with OPENAI_CHAT_MODEL env var
export const CHAT_MODEL: string = process.env.OPENAI_CHAT_MODEL || 'gpt-5-mini';

// Embedding dimensions depend on the model
// text-embedding-ada-002: 1536
// text-embedding-3-small: 1536 (default) or configurable
// text-embedding-3-large: 3072 (default) or configurable
export const EMBEDDING_DIMENSIONS =
  EMBEDDING_MODEL === 'text-embedding-3-small' ? 1536 : 1536;

// Cost tracking (per 1M tokens)
export const COSTS = {
  'text-embedding-ada-002': 0.10, // $0.10 per 1M tokens
  'text-embedding-3-small': 0.02, // $0.02 per 1M tokens
  'text-embedding-3-large': 0.13, // $0.13 per 1M tokens
  [CHAT_MODEL]: {
    input: 0.15, // $0.15 per 1M input tokens
    output: 0.60, // $0.60 per 1M output tokens
  },
} as const;

