const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'gclid',
  'fbclid',
  'mc_cid',
  'mc_eid',
  'ref',
  'ref_src',
]);

export function normalizeArticleUrl(input: string): string {
  const url = new URL(input);

  if (!url.protocol.startsWith('http')) {
    throw new Error('Only HTTP(S) URLs are supported');
  }

  url.hash = '';
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();

  if (url.hostname.startsWith('www.')) {
    url.hostname = url.hostname.slice(4);
  }

  const keptParams: Array<[string, string]> = [];
  for (const [key, value] of url.searchParams.entries()) {
    if (!TRACKING_PARAMS.has(key.toLowerCase())) {
      keptParams.push([key, value]);
    }
  }

  keptParams.sort(([a], [b]) => a.localeCompare(b));
  url.search = '';
  for (const [key, value] of keptParams) {
    url.searchParams.append(key, value);
  }

  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}
