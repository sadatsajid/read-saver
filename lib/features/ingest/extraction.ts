import { Readability } from '@mozilla/readability';
import { INGEST_CONFIG } from '@/lib/features/ingest/config';

export interface ExtractedArticle {
  title: string;
  content: string;
  url: string;
  excerpt?: string;
  author?: string;
  siteName?: string;
  method?: 'jina' | 'readability' | 'playwright' | 'unknown';
}

/**
 * Extracts clean article content from a URL
 * Strategy:
 * 1) Direct HTTP + Readability (default path)
 * 2) Optional Playwright render fallback (JS-heavy pages)
 * 3) Optional Jina fallback (vendor fallback; disabled by default)
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

  // 1) In-house primary path: direct fetch + Readability.
  try {
    return await extractWithReadability(url);
  } catch (error) {
    console.log('Readability extraction failed:', error);
  }

  // 2) Optional Playwright fallback for JS-heavy pages.
  if (INGEST_CONFIG.ENABLE_PLAYWRIGHT_FALLBACK) {
    try {
      return await extractWithPlaywright(url);
    } catch (error) {
      console.log('Playwright extraction failed:', error);
    }
  }

  // 3) Optional Jina fallback for hard cases (disabled by default).
  if (INGEST_CONFIG.ENABLE_JINA_FALLBACK) {
    try {
      return await extractWithJina(url);
    } catch (error) {
      console.log('Jina extraction failed:', error);
    }
  }

  throw new Error('Failed to extract article content from URL');
}

/**
 * Extract using Jina Reader API
 * Docs: https://jina.ai/reader
 */
async function extractWithJina(url: string): Promise<ExtractedArticle> {
  const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (process.env.JINA_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`;
  }

  const response = await fetch(jinaUrl, {
    headers,
    signal: AbortSignal.timeout(INGEST_CONFIG.EXTRACTION_TIMEOUT_MS),
  });

  if (!response.ok) {
    // 402 = Payment Required (free tier limit), 429 = Rate Limited
    if (response.status === 402 || response.status === 429) {
      throw new Error(`Jina Reader API limit reached (${response.status}). Falling back to alternative extraction.`);
    }
    throw new Error(`Jina Reader returned ${response.status}`);
  }

  const data = await response.json();

  // Jina returns structured data
  const title = data.data?.title || 'Untitled Article';
  const content = data.data?.content || data.data?.text || '';

  if (!isExtractionContentValid(content)) {
    throw new Error('Content too short');
  }

  return {
    title,
    content: cleanContent(content),
    url,
    excerpt: content.slice(0, 200) + '...',
    author: data.data?.author || undefined,
    siteName: data.data?.siteName || undefined,
    method: 'jina',
  };
}

type PlaywrightChromiumLike = {
  connect?: (wsEndpoint: string) => Promise<{
    newPage: () => Promise<{
      goto: (url: string, options: Record<string, unknown>) => Promise<unknown>;
      waitForTimeout?: (ms: number) => Promise<unknown>;
      content: () => Promise<string>;
      close: () => Promise<void>;
    }>;
    close: () => Promise<void>;
  }>;
  launch?: (options: Record<string, unknown>) => Promise<{
    newPage: () => Promise<{
      goto: (url: string, options: Record<string, unknown>) => Promise<unknown>;
      waitForTimeout?: (ms: number) => Promise<unknown>;
      content: () => Promise<string>;
      close: () => Promise<void>;
    }>;
    close: () => Promise<void>;
  }>;
};

async function loadPlaywrightChromium(): Promise<PlaywrightChromiumLike> {
  try {
    // Avoid static dependency so Playwright stays optional.
    const dynamicImport = new Function(
      'moduleName',
      'return import(moduleName)'
    ) as (moduleName: string) => Promise<{ chromium: PlaywrightChromiumLike }>;

    const playwright = await dynamicImport('playwright');
    if (!playwright?.chromium) {
      throw new Error('Missing chromium export');
    }
    return playwright.chromium;
  } catch {
    throw new Error(
      'Playwright fallback enabled but playwright is not installed/available'
    );
  }
}

async function extractWithPlaywright(url: string): Promise<ExtractedArticle> {
  const chromium = await loadPlaywrightChromium();

  const browser =
    INGEST_CONFIG.PLAYWRIGHT_WS_ENDPOINT && chromium.connect
      ? await chromium.connect(INGEST_CONFIG.PLAYWRIGHT_WS_ENDPOINT)
      : chromium.launch
        ? await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
          })
        : null;

  if (!browser) {
    throw new Error('Unable to initialize Playwright browser');
  }

  try {
    const page = await browser.newPage();
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: INGEST_CONFIG.PLAYWRIGHT_NAVIGATION_TIMEOUT_MS,
      });

      if (page.waitForTimeout) {
        await page.waitForTimeout(INGEST_CONFIG.PLAYWRIGHT_WAIT_AFTER_LOAD_MS);
      }

      const html = await page.content();
      return await extractWithReadabilityFromHtml(url, html, 'playwright');
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

/**
 * Extract using Mozilla Readability
 * Classic fallback that works well for most sites
 */
async function extractWithReadability(
  url: string
): Promise<ExtractedArticle> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': INGEST_CONFIG.EXTRACTION_USER_AGENT,
    },
    signal: AbortSignal.timeout(INGEST_CONFIG.EXTRACTION_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }

  const html = await response.text();
  return extractWithReadabilityFromHtml(url, html, 'readability');
}

async function extractWithReadabilityFromHtml(
  url: string,
  html: string,
  method: 'readability' | 'playwright'
): Promise<ExtractedArticle> {
  const { parseHTML } = await import('linkedom');
  const { document } = parseHTML(html);
  const reader = new Readability(document);
  const article = reader.parse();

  if (!article?.textContent) {
    throw new Error('Failed to parse article content');
  }

  if (!isExtractionContentValid(article.textContent)) {
    throw new Error('Extracted content too short (likely failed)');
  }

  return {
    title: article.title || 'Untitled Article',
    content: cleanContent(article.textContent),
    url,
    excerpt: article.excerpt || article.textContent.slice(0, 200) + '...',
    author: article.byline || undefined,
    siteName: article.siteName || undefined,
    method,
  };
}

function isExtractionContentValid(content: string): boolean {
  return cleanContent(content).length >= INGEST_CONFIG.EXTRACTION_MIN_CONTENT_CHARS;
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
