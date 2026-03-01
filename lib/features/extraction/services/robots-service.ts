import type { PrismaClient } from '@prisma/client';
import { INGEST_CONFIG } from '@/lib/features/ingest/config';
import type { RobotsDecision } from '@/lib/features/extraction/types';

interface ParsedRobots {
  disallow: string[];
  allow: string[];
  crawlDelaySeconds?: number;
}

function parseRobotsTxt(content: string): ParsedRobots {
  const lines = content.split('\n').map((line) => line.trim());

  let inGlobalAgentBlock = false;
  const allow: string[] = [];
  const disallow: string[] = [];
  let crawlDelaySeconds: number | undefined;

  for (const line of lines) {
    if (!line || line.startsWith('#')) {
      continue;
    }

    const [rawKey, ...rawValueParts] = line.split(':');
    if (!rawKey || rawValueParts.length === 0) {
      continue;
    }

    const key = rawKey.trim().toLowerCase();
    const value = rawValueParts.join(':').trim();

    if (key === 'user-agent') {
      inGlobalAgentBlock = value === '*' || value.toLowerCase() === 'readsaverbot';
      continue;
    }

    if (!inGlobalAgentBlock) {
      continue;
    }

    if (key === 'allow' && value) {
      allow.push(value);
    } else if (key === 'disallow' && value) {
      disallow.push(value);
    } else if (key === 'crawl-delay' && value) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed >= 0) {
        crawlDelaySeconds = parsed;
      }
    }
  }

  return {
    allow,
    disallow,
    crawlDelaySeconds,
  };
}

function matchesRule(path: string, rule: string): boolean {
  if (!rule || rule === '/') {
    return true;
  }
  return path.startsWith(rule);
}

function isPathAllowed(path: string, rules: ParsedRobots): boolean {
  const matchedAllow = rules.allow
    .filter((rule) => matchesRule(path, rule))
    .sort((a, b) => b.length - a.length)[0];

  const matchedDisallow = rules.disallow
    .filter((rule) => matchesRule(path, rule))
    .sort((a, b) => b.length - a.length)[0];

  if (!matchedDisallow) {
    return true;
  }

  if (!matchedAllow) {
    return false;
  }

  return matchedAllow.length >= matchedDisallow.length;
}

export async function checkRobotsPermission(
  prisma: PrismaClient,
  url: string
): Promise<RobotsDecision> {
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname.toLowerCase();
  const path = parsedUrl.pathname || '/';

  const domainPolicy = await prisma.domainPolicy.findUnique({
    where: { domain },
  });

  if (domainPolicy && !domainPolicy.robotsAllowed) {
    return {
      allowed: false,
      reason: domainPolicy.blockReason ?? 'Domain blocked by policy',
    };
  }

  const cached = await prisma.robotsCache.findUnique({
    where: { domain },
  });

  let robotsBody = cached?.robotsBody ?? null;
  const now = new Date();

  if (!robotsBody || !cached || cached.expiresAt <= now) {
    try {
      const robotsUrl = `${parsedUrl.protocol}//${domain}/robots.txt`;
      const response = await fetch(robotsUrl, {
        headers: {
          'User-Agent': INGEST_CONFIG.EXTRACTION_USER_AGENT,
        },
        signal: AbortSignal.timeout(INGEST_CONFIG.EXTRACTION_TIMEOUT_MS),
      });

      if (response.ok) {
        robotsBody = await response.text();
      } else {
        robotsBody = '';
      }
    } catch {
      return {
        allowed: false,
        reason: 'Failed to fetch robots.txt in strict mode',
      };
    }

    const expiresAt = new Date(
      Date.now() + INGEST_CONFIG.ROBOTS_CACHE_TTL_MS
    );

    await prisma.robotsCache.upsert({
      where: { domain },
      update: {
        robotsBody,
        fetchedAt: now,
        expiresAt,
      },
      create: {
        domain,
        robotsBody,
        fetchedAt: now,
        expiresAt,
      },
    });
  }

  const parsedRobots = parseRobotsTxt(robotsBody ?? '');
  const allowed = isPathAllowed(path, parsedRobots);

  return {
    allowed,
    reason: allowed ? undefined : `Disallowed by robots.txt for path ${path}`,
    crawlDelaySeconds: parsedRobots.crawlDelaySeconds,
  };
}
