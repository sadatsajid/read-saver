/**
 * RAG (Retrieval-Augmented Generation) configuration constants
 * Centralized configuration for vector search and context retrieval
 */

export const RAG_CONFIG = {
  // Vector search parameters
  TOP_K: 5, // Number of chunks to retrieve
  MIN_SIMILARITY: 0.6, // Minimum cosine similarity threshold
  ANSWERABLE_THRESHOLD: 0.7, // Similarity threshold for determining if question is answerable
  
  // Chunk filtering
  MIN_CHUNK_LENGTH: 50, // Minimum character length for meaningful chunks
  
  // LLM parameters
  MAX_COMPLETION_TOKENS: 4000, // Maximum tokens for LLM response
  TEMPERATURE: 1, // Temperature for GPT-5 (only supports 1)
  
  // Input validation
  MAX_QUESTION_LENGTH: 1000, // Maximum question length in characters
  MIN_QUESTION_LENGTH: 3, // Minimum question length
} as const;

