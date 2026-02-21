export interface ChunkOptions {
  maxChars?: number;
  overlap?: number;
  separators?: string[];
}

export interface TextChunk {
  content: string;
  index: number;
  startChar: number;
  endChar: number;
}

/**
 * Splits text into overlapping chunks for embedding
 * Uses natural breakpoints (paragraphs, sentences) when possible
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): TextChunk[] {
  const {
    maxChars = 1000,
    overlap = 200,
    separators = ['\n\n\n', '\n\n', '\n', '. ', ' '],
  } = options;

  // Clean and normalize text
  const cleanedText = text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\t/g, ' ') // Convert tabs to spaces
    .replace(/ +/g, ' ') // Collapse multiple spaces
    .trim();

  if (cleanedText.length === 0) {
    return [];
  }

  // Diagnostic logging
  const textLength = cleanedText.length;
  const expectedChunks = Math.ceil(textLength / (maxChars - overlap));
  console.log(`[Chunking] Starting: textLength=${textLength}, maxChars=${maxChars}, overlap=${overlap}, expectedChunks≈${expectedChunks}`);

  // Safety: Calculate maximum reasonable iterations (2x expected + buffer)
  const MAX_ITERATIONS = Math.max(expectedChunks * 3, 10000);
  let iterations = 0;

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;
  let lastStart = -1;

  while (start < cleanedText.length) {
    iterations++;

    // Safety check: Prevent infinite loops
    if (iterations > MAX_ITERATIONS) {
      console.error(
        `[Chunking] SAFETY BREAK: Exceeded ${MAX_ITERATIONS} iterations!`,
        {
          start,
          textLength,
          chunksCreated: chunks.length,
          lastStart,
        }
      );
      throw new Error(
        `Chunking failed: Exceeded maximum iterations (${MAX_ITERATIONS}). Possible infinite loop. Text length: ${textLength}, Chunks created: ${chunks.length}`
      );
    }

    // Check if start is advancing
    if (start <= lastStart && start > 0) {
      console.error(
        `[Chunking] WARNING: Start position not advancing!`,
        {
          lastStart,
          start,
          end: Math.min(start + maxChars, cleanedText.length),
          chunksCreated: chunks.length,
        }
      );
      // Force advancement to prevent infinite loop
      start = lastStart + Math.max(1, maxChars - overlap);
      if (start >= cleanedText.length) break;
    }

    lastStart = start;
    let end = Math.min(start + maxChars, cleanedText.length);

    // Find natural break point if we're not at the end
    if (end < cleanedText.length) {
      let bestBreak = end;

      for (const sep of separators) {
        const lastSep = cleanedText.lastIndexOf(sep, end);
        // Only use this separator if it's not too early (at least 50% of maxChars)
        if (lastSep > start + maxChars * 0.5) {
          bestBreak = lastSep + sep.length;
          break;
        }
      }

      end = bestBreak;
    }

    const content = cleanedText.slice(start, end).trim();

    if (content.length > 0) {
      chunks.push({
        content,
        index,
        startChar: start,
        endChar: end,
      });
      index++;
    }

    // Move start position with overlap - FIXED LOGIC
    const newStart = end - overlap;
    
    // Ensure we always advance forward
    if (newStart <= start) {
      // If overlap would cause us to go backwards or stay same, force minimum advancement
      start = start + Math.max(1, maxChars - overlap);
      console.warn(
        `[Chunking] Forced advancement: oldStart=${lastStart}, newStart=${start}, end=${end}`
      );
    } else {
      start = newStart;
    }

    // Prevent infinite loop if we're stuck at start=0
    if (start === 0 && chunks.length > 0) {
      console.warn('[Chunking] Breaking: stuck at start=0 with chunks already created');
      break;
    }

    // Log progress every 100 chunks
    if (chunks.length % 100 === 0 && chunks.length > 0) {
      console.log(
        `[Chunking] Progress: ${chunks.length} chunks, start=${start}/${textLength} (${((start / textLength) * 100).toFixed(1)}%)`
      );
    }
  }

  console.log(
    `[Chunking] Complete: ${chunks.length} chunks created in ${iterations} iterations (expected ~${expectedChunks})`
  );

  return chunks;
}

/**
 * Estimates the number of tokens in text (rough approximation)
 * GPT models: ~1 token ≈ 4 characters for English text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Splits text to fit within a token budget
 */
export function chunkByTokens(
  text: string,
  maxTokens: number = 500,
  overlap: number = 50
): TextChunk[] {
  const maxChars = maxTokens * 4; // Rough conversion
  const overlapChars = overlap * 4;

  return chunkText(text, {
    maxChars,
    overlap: overlapChars,
  });
}

