import express from 'express';
import * as cheerio from 'cheerio';
import { assertSafeUrl } from '../feedParser.js';

const router = express.Router();

const FETCH_TIMEOUT_MS = 10_000;
const CONTENT_CACHE = new Map(); // url → { html, ts }
const CACHE_TTL_MS  = 10 * 60_000; // 10 minutes

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
};

function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
}

// Strip tags from elements that are navigation/boilerplate.
const JUNK_SELECTORS = [
  'script', 'style', 'noscript', 'iframe', 'svg',
  'nav', 'header', 'footer',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
  '.nav', '.navbar', '.sidebar', '.header', '.footer', '.menu',
  '.ad', '.ads', '.advertisement', '.cookie', '.popup', '.modal',
  '.social', '.share', '.related', '.comments', '#comments',
].join(', ');

// Candidate content selectors, ordered by preference.
const CONTENT_SELECTORS = [
  'article',
  '[role="main"]',
  'main',
  '.post-content', '.entry-content', '.article-content', '.article-body',
  '.content', '#content', '.post', '#main',
];

function extractContent(html, url) {
  const $ = cheerio.load(html);

  // Remove junk
  $(JUNK_SELECTORS).remove();

  // Try candidate selectors
  let $content = null;
  for (const sel of CONTENT_SELECTORS) {
    const $el = $(sel).first();
    if ($el.length && $el.text().trim().length > 200) {
      $content = $el;
      break;
    }
  }

  // Fallback to body
  if (!$content) $content = $('body');

  // Extract title
  const title = $('h1').first().text().trim()
    || $('title').text().trim().replace(/\s*[|\-–—].*$/, '').trim();

  // Extract og:image for hero
  const heroImage = $('meta[property="og:image"]').attr('content')
    || $('meta[name="twitter:image"]').attr('content')
    || null;

  // Extract paragraphs and headings
  const elements = [];
  $content.find('p, h1, h2, h3, h4, blockquote, li, pre, code').each((_, el) => {
    const tag  = el.tagName.toLowerCase();
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!text || text.length < 20) return; // skip noise
    elements.push({ tag, text });
  });

  // Deduplicate consecutive identical lines
  const deduped = elements.filter((el, i) => i === 0 || el.text !== elements[i - 1].text);

  // Resolve relative image src
  const images = [];
  $content.find('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    if (!src) return;
    try {
      const abs = new URL(src, url).href;
      const alt = $(el).attr('alt') || '';
      images.push({ src: abs, alt });
    } catch {}
  });

  return { title, heroImage, elements: deduped, images: images.slice(0, 5) };
}

// GET /api/article-content?url=<encoded-url>
router.get('/', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url is required' });

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Bad protocol');
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try { assertSafeUrl(parsedUrl.href); } catch (e) {
    return res.status(403).json({ error: e.message });
  }

  // Cache hit
  const cached = CONTENT_CACHE.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  try {
    const resp = await fetchWithTimeout(parsedUrl.href, { headers: HEADERS });
    if (!resp.ok) return res.status(502).json({ error: `Upstream ${resp.status}` });

    const contentType = resp.headers.get('content-type') ?? '';
    if (!contentType.includes('html')) {
      return res.status(415).json({ error: 'Not an HTML page' });
    }

    const html = await resp.text();
    const data = extractContent(html, parsedUrl.href);

    CONTENT_CACHE.set(url, { data, ts: Date.now() });
    // Evict old entries if cache grows too large
    if (CONTENT_CACHE.size > 200) {
      const oldest = [...CONTENT_CACHE.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      CONTENT_CACHE.delete(oldest[0]);
    }

    return res.json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
});

export default router;
