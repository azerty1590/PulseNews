import Parser from 'rss-parser';
import * as cheerio from 'cheerio';

const parser = new Parser({
  customFields: {
    item: [['media:thumbnail', 'thumbnail'], ['media:content', 'mediaContent']],
  },
});

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml,application/rss+xml,application/atom+xml,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
};

const FETCH_TIMEOUT_MS = 10_000;

function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// ---------------------------------------------------------------------------
// URL normalisation
// ---------------------------------------------------------------------------
export function normalizeUrl(raw) {
  const url = raw.trim();
  const lower = url.toLowerCase();

  const redditMatch = url.match(/(?:reddit\.com\/)?r\/([A-Za-z0-9_]+)/i);
  if (redditMatch) return `https://www.reddit.com/r/${redditMatch[1]}/.rss`;

  // u/username Reddit user feed
  const redditUser = url.match(/(?:reddit\.com\/)?u\/([A-Za-z0-9_-]+)/i);
  if (redditUser) return `https://www.reddit.com/u/${redditUser[1]}/.rss`;

  const ytChannel = url.match(/youtube\.com\/channel\/([A-Za-z0-9_-]+)/i);
  if (ytChannel) return `https://www.youtube.com/feeds/videos.xml?channel_id=${ytChannel[1]}`;

  // @handle form
  const ytHandle = url.match(/youtube\.com\/@([A-Za-z0-9_.-]+)/i);
  if (ytHandle) return `https://www.youtube.com/feeds/videos.xml?user=${ytHandle[1]}`;

  const ytUser = url.match(/youtube\.com\/(?:user|c)\/([A-Za-z0-9_-]+)/i);
  if (ytUser) return `https://www.youtube.com/feeds/videos.xml?user=${ytUser[1]}`;

  // bare youtube.com/@handle without path prefix
  const ytBare = lower === 'youtube' || lower.startsWith('youtube.com/@');
  if (!ytBare && !lower.startsWith('http')) return `https://${url}`;
  if (!lower.startsWith('http')) return `https://${url}`;
  return url;
}

// ---------------------------------------------------------------------------
// SSRF guard — block private/loopback targets
// ---------------------------------------------------------------------------
const PRIVATE_RANGES = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::1$/,
  /^fc00:/i,
  /^0\.0\.0\.0$/,
];

export function assertSafeUrl(url) {
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error(`Invalid URL: ${url}`); }
  const host = parsed.hostname.toLowerCase();
  for (const re of PRIVATE_RANGES) {
    if (re.test(host)) throw new Error(`Blocked: private/local address "${host}"`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isXml(contentType = '', text = '') {
  if (
    contentType.includes('xml') ||
    contentType.includes('rss') ||
    contentType.includes('atom')
  ) return true;
  const start = text.trimStart().slice(0, 200).toLowerCase();
  return start.startsWith('<?xml') || start.includes('<rss') || start.includes('<feed');
}

function resolveUrl(href, base) {
  try { return new URL(href, base).href; } catch { return null; }
}

// ---------------------------------------------------------------------------
// RSS/Atom parse
// ---------------------------------------------------------------------------
function mapRssFeed(feed, url) {
  return {
    title: feed.title ?? url,
    description: feed.description ?? '',
    link: feed.link ?? url,
    feedUrl: url,
    type: 'rss',
    items: (feed.items ?? []).slice(0, 50).map((item) => ({
      id: item.guid ?? item.link ?? item.title,
      title: item.title ?? '(no title)',
      link: item.link ?? '',
      pubDate: item.pubDate ?? item.isoDate ?? null,
      summary: item.contentSnippet ?? item.summary ?? '',
      thumbnail:
        item.thumbnail?.$.url ??
        item.mediaContent?.$.url ??
        null,
    })),
  };
}

// ---------------------------------------------------------------------------
// HTML scraping
// ---------------------------------------------------------------------------
function scrapeHtml(html, pageUrl) {
  const $ = cheerio.load(html);

  // Site metadata
  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').first().text() ||
    pageUrl;

  const description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    '';

  const siteName =
    $('meta[property="og:site_name"]').attr('content') || title;

  // Collect candidate article links
  const seen = new Set();
  const items = [];

  function addItem(link, titleText, pubDate, summary, thumbnail) {
    if (!link || seen.has(link)) return;
    // Skip non-article pages (tag pages, category pages, homepage, anchors)
    try {
      const u = new URL(link);
      if (u.pathname === '/' || u.pathname === '') return;
      if (/\/(tag|tags|category|categories|author|page|feed)\/?(\?|$)/i.test(u.pathname)) return;
    } catch { return; }

    seen.add(link);
    items.push({
      id: link,
      title: titleText?.trim() || link,
      link,
      pubDate: pubDate || null,
      summary: summary?.trim() || '',
      thumbnail: thumbnail || null,
    });
  }

  // Strategy 1: <article> elements
  $('article').each((_, el) => {
    const a = $(el).find('a[href]').first();
    const href = resolveUrl(a.attr('href'), pageUrl);
    const heading = $(el).find('h1,h2,h3').first().text();
    const time = $(el).find('time').attr('datetime') || $(el).find('time').text();
    const img = $(el).find('img[src]').first().attr('src');
    const thumb = img ? resolveUrl(img, pageUrl) : null;
    const snippet = $(el).find('p').first().text();
    addItem(href, heading || a.text(), time, snippet, thumb);
  });

  // Strategy 2: common news/blog list patterns
  const listSelectors = [
    '.post', '.entry', '.item', '.card',
    '[class*="article"]', '[class*="post-item"]', '[class*="blog-item"]',
    '[class*="news-item"]', '[class*="story"]',
  ];
  for (const sel of listSelectors) {
    $(sel).each((_, el) => {
      const a = $(el).find('a[href]').first();
      const href = resolveUrl(a.attr('href'), pageUrl);
      const heading = $(el).find('h1,h2,h3,h4').first().text() || a.text();
      const time = $(el).find('time').attr('datetime') || null;
      const img = $(el).find('img[src]').first().attr('src');
      const thumb = img ? resolveUrl(img, pageUrl) : null;
      addItem(href, heading, time, '', thumb);
    });
    if (items.length >= 10) break;
  }

  // Strategy 3: any heading with an anchor child, same domain
  if (items.length < 5) {
    $('h2 a[href], h3 a[href]').each((_, el) => {
      const href = resolveUrl($(el).attr('href'), pageUrl);
      addItem(href, $(el).text(), null, '', null);
    });
  }

  // Strategy 4: broad anchor sweep — links with meaningful text, same origin
  if (items.length < 5) {
    const origin = new URL(pageUrl).origin;
    $('a[href]').each((_, el) => {
      const href = resolveUrl($(el).attr('href'), pageUrl);
      if (!href || !href.startsWith(origin)) return;
      const text = $(el).text().trim();
      if (text.length < 15 || text.length > 200) return;
      addItem(href, text, null, '', null);
    });
  }

  return {
    title: siteName,
    description,
    link: pageUrl,
    feedUrl: pageUrl,
    type: 'scraped',
    items: items.slice(0, 50),
  };
}

// ---------------------------------------------------------------------------
// RSS autodiscovery inside an HTML page
// ---------------------------------------------------------------------------
async function discoverAndFetchRss(html, pageUrl) {
  const $ = cheerio.load(html);
  const candidates = [];

  $('link[rel~="alternate"]').each((_, el) => {
    const type = $(el).attr('type') ?? '';
    const href = $(el).attr('href');
    if ((type.includes('rss') || type.includes('atom') || type.includes('xml')) && href) {
      candidates.push(resolveUrl(href, pageUrl));
    }
  });

  // Some sites put feed links in <a> tags too
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (/\/(feed|rss|atom)(\/|\.xml)?(\?|$)/i.test(href)) {
      const full = resolveUrl(href, pageUrl);
      if (full && !candidates.includes(full)) candidates.push(full);
    }
  });

  for (const feedUrl of candidates.slice(0, 3)) {
    try {
      const res = await fetchWithTimeout(feedUrl, { headers: HEADERS });
      if (!res.ok) continue;
      const text = await res.text();
      if (!isXml(res.headers.get('content-type') ?? '', text)) continue;
      const feed = await parser.parseString(text);
      return mapRssFeed(feed, feedUrl);
    } catch { /* try next candidate */ }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public: fetchFeed — handles RSS URLs and plain web pages
// ---------------------------------------------------------------------------
export async function fetchFeed(url) {
  assertSafeUrl(url);
  const res = await fetchWithTimeout(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);

  const contentType = res.headers.get('content-type') ?? '';
  const text = await res.text();

  // Direct RSS/Atom feed
  if (isXml(contentType, text)) {
    const feed = await parser.parseString(text);
    return mapRssFeed(feed, url);
  }

  // HTML page — try RSS autodiscovery first, then scrape
  if (contentType.includes('text/html') || text.trimStart().startsWith('<')) {
    const rss = await discoverAndFetchRss(text, url);
    if (rss) return rss;
    return scrapeHtml(text, url);
  }

  throw new Error(`Unsupported content type "${contentType}" for ${url}`);
}

// ---------------------------------------------------------------------------
// Public: discoverFeedUrls — returns all RSS/Atom candidates found on a page.
// Returns an array of { url, title } objects (title from feed <title> if fetchable).
// ---------------------------------------------------------------------------
export async function discoverFeedUrls(pageUrl) {
  assertSafeUrl(pageUrl);
  const res = await fetchWithTimeout(pageUrl, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const contentType = res.headers.get('content-type') ?? '';
  const text = await res.text();

  // If it's already a direct feed, return it
  if (isXml(contentType, text)) {
    try {
      const feed = await parser.parseString(text);
      return [{ url: pageUrl, title: feed.title ?? pageUrl }];
    } catch {
      return [{ url: pageUrl, title: pageUrl }];
    }
  }

  const $ = cheerio.load(text);
  const seen = new Set();
  const candidates = [];

  $('link[rel~="alternate"]').each((_, el) => {
    const type = $(el).attr('type') ?? '';
    const href = $(el).attr('href');
    const title = $(el).attr('title') ?? '';
    if ((type.includes('rss') || type.includes('atom') || type.includes('xml')) && href) {
      const full = resolveUrl(href, pageUrl);
      if (full && !seen.has(full)) { seen.add(full); candidates.push({ url: full, title }); }
    }
  });

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (/\/(feed|rss|atom)(\/|\.xml)?(\?|$)/i.test(href)) {
      const full = resolveUrl(href, pageUrl);
      const title = $(el).text().trim() || href;
      if (full && !seen.has(full)) { seen.add(full); candidates.push({ url: full, title }); }
    }
  });

  if (candidates.length === 0) return [];

  // Probe each candidate to get actual feed title
  const probed = await Promise.allSettled(
    candidates.slice(0, 8).map(async (c) => {
      try {
        const r = await fetchWithTimeout(c.url, { headers: HEADERS });
        if (!r.ok) return c;
        const t = await r.text();
        const feed = await parser.parseString(t);
        return { url: c.url, title: feed.title || c.title || c.url };
      } catch {
        return c;
      }
    })
  );

  return probed
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);
}
