import { Readability } from '@mozilla/readability';
import { logger } from '@/lib/shared/logger/logger';

export interface ExtractedArticle {
  title: string;
  content: string;
  url: string;
  excerpt?: string;
  author?: string;
  siteName?: string;
}

/**
 * Extracts clean article content from a URL
 * Tries Jina Reader API first, falls back to Mozilla Readability
 */
export async function extractArticle(url: string): Promise<ExtractedArticle> {
  // Validate URL
  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith('http')) {
      throw new Error('Only HTTP(S) URLs are supported');
    }
  } catch {
    throw new Error('Invalid URL format');
  }

  // Try Jina Reader first (better at handling paywalls and modern sites)
  try {
    return await extractWithJina(url);
  } catch (error) {
    logger.warn(
      { err: error, url },
      'Jina extraction failed, trying Readability'
    );
  }

  // Fallback to Readability
  try {
    return await extractWithReadability(url);
  } catch (error) {
    logger.error({ err: error, url }, 'Readability extraction failed');
    throw new Error('Failed to extract article content from URL');
  }
}

/**
 * Extract using Jina Reader API
 * Docs: https://jina.ai/reader
 */
async function extractWithJina(url: string): Promise<ExtractedArticle> {
  const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (process.env.JINA_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`;
  }

  const response = await fetch(jinaUrl, {
    headers,
    signal: AbortSignal.timeout(30000), // 30s timeout
  });

  if (!response.ok) {
    // 402 = Payment Required (free tier limit), 429 = Rate Limited
    if (response.status === 402 || response.status === 429) {
      throw new Error(
        `Jina Reader API limit reached (${response.status}). Falling back to alternative extraction.`
      );
    }
    throw new Error(`Jina Reader returned ${response.status}`);
  }

  const data = await response.json();

  // Jina returns structured data
  const title = data.data?.title || 'Untitled Article';
  const content = data.data?.content || data.data?.text || '';

  if (content.length < 100) {
    throw new Error('Content too short');
  }

  return {
    title,
    content: cleanContent(content),
    url,
    excerpt: content.slice(0, 200) + '...',
    author: data.data?.author || undefined,
    siteName: data.data?.siteName || undefined,
  };
}

/**
 * Extract using Mozilla Readability
 * Classic fallback that works well for most sites
 */
async function extractWithReadability(url: string): Promise<ExtractedArticle> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; ReadSaver/1.0; +https://readsaver.ai)',
    },
    signal: AbortSignal.timeout(30000), // 30s timeout
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }

  const html = await response.text();

  // Use linkedom instead of jsdom - lighter and works better with Next.js
  const { parseHTML } = await import('linkedom');
  const { document } = parseHTML(html);
  const reader = new Readability(document);
  const article = reader.parse();

  if (!article || !article.textContent) {
    throw new Error('Failed to parse article content');
  }

  if (article.textContent.length < 100) {
    throw new Error('Extracted content too short (likely failed)');
  }

  return {
    title: article.title || 'Untitled Article',
    content: cleanContent(article.textContent),
    url,
    excerpt: article.excerpt || article.textContent.slice(0, 200) + '...',
    author: article.byline || undefined,
    siteName: article.siteName || undefined,
  };
}

/**
 * Clean and normalize article content
 */
function cleanContent(content: string): string {
  return (
    content
      // Normalize whitespace
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/ +/g, ' ')
      // Remove excessive newlines
      .replace(/\n{4,}/g, '\n\n\n')
      // Trim
      .trim()
  );
}

/**
 * Validate if URL is likely an article
 * (Basic heuristic - can be improved)
 */
export function isLikelyArticleUrl(url: string): boolean {
  try {
    new URL(url);

    // Exclude common non-article patterns
    const excludePatterns = [
      /\.(pdf|jpg|png|gif|mp4|zip)$/i,
      /^(mailto|tel):/,
      /(login|signup|register|checkout)/i,
    ];

    return !excludePatterns.some((pattern) => pattern.test(url));
  } catch {
    return false;
  }
}
