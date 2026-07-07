/**
 * Daily refresh — fetches fresh articles from HN, Reddit, GitHub Trending, Dev.to.
 * Results are stored in Firestore (or in-memory) and served via /api/daily-picks.
 *
 * Refresh triggers:
 *   - On server start if last refresh was >23h ago
 *   - On GET /api/daily-picks if data is stale
 */

const FETCH_TIMEOUT_MS = 10_000;
const REFRESH_INTERVAL_MS = 23 * 60 * 60 * 1000; // 23 hours

// Category name → reddit subreddits + HN keyword filters
const CATEGORY_MAP = {
  ai:           { subreddits: ['MachineLearning', 'artificial', 'LocalLLaMA', 'singularity'], keywords: ['ai', 'llm', 'gpt', 'openai', 'anthropic', 'claude', 'machine learning', 'neural', 'deep learning'] },
  dev:          { subreddits: ['programming', 'webdev', 'javascript', 'typescript', 'rust', 'golang', 'python'], keywords: ['programming', 'developer', 'software', 'code', 'api', 'framework', 'library', 'open source'] },
  tech:         { subreddits: ['technology', 'Futurology', 'hardware'], keywords: ['technology', 'startup', 'product launch', 'silicon', 'chip', 'hardware'] },
  security:     { subreddits: ['netsec', 'cybersecurity', 'hacking'], keywords: ['security', 'vulnerability', 'breach', 'exploit', 'cve', 'malware', 'ransomware'] },
  business:     { subreddits: ['startups', 'entrepreneur', 'business', 'investing'], keywords: ['startup', 'funding', 'vc', 'acquisition', 'ipo', 'revenue', 'saas'] },
  science:      { subreddits: ['science', 'physics', 'biology', 'chemistry', 'EverythingScience'], keywords: ['research', 'study', 'scientists', 'discovery', 'university', 'paper', 'journal'] },
  space:        { subreddits: ['space', 'SpaceX', 'nasa', 'astrophysics'], keywords: ['nasa', 'spacex', 'rocket', 'launch', 'orbit', 'mars', 'moon', 'satellite'] },
  linux:        { subreddits: ['linux', 'linuxquestions', 'opensource', 'commandline'], keywords: ['linux', 'kernel', 'ubuntu', 'debian', 'fedora', 'open source', 'terminal'] },
  oss:          { subreddits: ['opensource', 'linux', 'selfhosted'], keywords: ['open source', 'github', 'release', 'maintainer', 'foss'] },
  design:       { subreddits: ['design', 'UI_Design', 'userexperience', 'web_design'], keywords: ['design', 'ux', 'ui', 'figma', 'typography', 'accessibility'] },
  gaming:       { subreddits: ['gaming', 'pcgaming', 'gamedev', 'indiegaming'], keywords: ['game', 'gaming', 'steam', 'release', 'indie', 'studio'] },
  mobile:       { subreddits: ['android', 'iphone', 'ios', 'androiddev'], keywords: ['android', 'ios', 'iphone', 'apple', 'google', 'mobile app'] },
  crypto:       { subreddits: ['CryptoCurrency', 'ethereum', 'Bitcoin'], keywords: ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'web3'] },
  health:       { subreddits: ['health', 'medicine', 'nutrition', 'longevity'], keywords: ['health', 'medical', 'clinical trial', 'study', 'treatment', 'drug'] },
  finance:      { subreddits: ['investing', 'personalfinance', 'stocks', 'fintech'], keywords: ['market', 'stock', 'investment', 'fintech', 'banking', 'interest rate'] },
  web:          { subreddits: ['webdev', 'javascript', 'css', 'Frontend', 'reactjs'], keywords: ['web', 'browser', 'javascript', 'css', 'html', 'frontend', 'backend'] },
  productivity: { subreddits: ['productivity', 'getdisciplined', 'nosurf'], keywords: ['productivity', 'workflow', 'focus', 'habits', 'tools', 'automation'] },
};

function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, {
    ...opts,
    signal: controller.signal,
    headers: {
      'User-Agent': 'Pulse-NewsAggregator/1.0 (daily-picks; contact: pulse@example.com)',
      ...(opts.headers ?? {}),
    },
  }).finally(() => clearTimeout(timer));
}

// ── Hacker News ───────────────────────────────────────────────────────────────
async function fetchHN(keywords = []) {
  try {
    const res = await fetchWithTimeout('https://hacker-news.firebaseio.com/v0/topstories.json');
    if (!res.ok) return [];
    const ids = (await res.json()).slice(0, 100);

    const items = await Promise.allSettled(
      ids.slice(0, 60).map((id) =>
        fetchWithTimeout(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
          .then((r) => r.json())
      )
    );

    const lowerKw = keywords.map((k) => k.toLowerCase());
    return items
      .filter((r) => r.status === 'fulfilled' && r.value?.url && r.value?.title)
      .map((r) => r.value)
      .filter((item) => {
        if (lowerKw.length === 0) return true;
        const text = (item.title ?? '').toLowerCase();
        return lowerKw.some((k) => text.includes(k));
      })
      .map((item) => ({
        id: `hn-${item.id}`,
        title: item.title,
        url: item.url,
        source: 'Hacker News',
        sourceUrl: `https://news.ycombinator.com/item?id=${item.id}`,
        score: item.score ?? 0,
        pubDate: item.time ? new Date(item.time * 1000).toISOString() : null,
        tags: ['tech', 'dev'],
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  } catch {
    return [];
  }
}

// ── Reddit ────────────────────────────────────────────────────────────────────
async function fetchReddit(subreddits = []) {
  if (!subreddits.length) return [];
  const results = [];

  for (const sub of subreddits.slice(0, 4)) {
    try {
      const res = await fetchWithTimeout(
        `https://www.reddit.com/r/${sub}/hot.json?limit=10&t=day`,
        { headers: { Accept: 'application/json' } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const posts = data?.data?.children ?? [];
      for (const { data: p } of posts) {
        if (p.is_self && !p.url) continue;
        if (p.stickied || p.over_18) continue;
        const url = p.url?.startsWith('https://www.reddit.com') ? null : p.url;
        results.push({
          id: `reddit-${p.id}`,
          title: p.title,
          url: url ?? `https://www.reddit.com${p.permalink}`,
          source: `r/${sub}`,
          sourceUrl: `https://www.reddit.com/r/${sub}`,
          score: p.score ?? 0,
          pubDate: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : null,
          tags: [sub.toLowerCase()],
        });
      }
    } catch { /* skip failed subreddit */ }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 20);
}

// ── GitHub Trending ───────────────────────────────────────────────────────────
async function fetchGitHubTrending() {
  try {
    // GitHub doesn't have an official trending API; use the unofficial one
    const res = await fetchWithTimeout('https://api.gitterapp.com/repositories?since=daily&spoken_language_code=en');
    if (!res.ok) throw new Error('gitterapp failed');
    const repos = await res.json();
    return (Array.isArray(repos) ? repos : []).slice(0, 15).map((r, i) => ({
      id: `gh-${r.author}-${r.name}`,
      title: `${r.author}/${r.name}${r.description ? ` — ${r.description}` : ''}`,
      url: r.url ?? `https://github.com/${r.author}/${r.name}`,
      source: 'GitHub Trending',
      sourceUrl: 'https://github.com/trending',
      score: r.stars ?? (15 - i),
      pubDate: new Date().toISOString(),
      tags: ['dev', 'oss'],
    }));
  } catch {
    // Fallback: GitHub search API for today's most starred repos
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const res = await fetchWithTimeout(
        `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=15`,
        { headers: { Accept: 'application/vnd.github+json' } }
      );
      if (!res.ok) return [];
      const { items = [] } = await res.json();
      return items.map((r) => ({
        id: `gh-${r.id}`,
        title: `${r.full_name}${r.description ? ` — ${r.description}` : ''}`,
        url: r.html_url,
        source: 'GitHub Trending',
        sourceUrl: 'https://github.com/trending',
        score: r.stargazers_count,
        pubDate: r.created_at,
        tags: ['dev', 'oss'],
      }));
    } catch {
      return [];
    }
  }
}

// ── Dev.to ────────────────────────────────────────────────────────────────────
async function fetchDevTo(tags = []) {
  try {
    const tagParam = tags.length ? `&tag=${encodeURIComponent(tags[0])}` : '';
    const res = await fetchWithTimeout(
      `https://dev.to/api/articles?top=1&per_page=20${tagParam}`
    );
    if (!res.ok) return [];
    const articles = await res.json();
    return (Array.isArray(articles) ? articles : []).map((a) => ({
      id: `devto-${a.id}`,
      title: a.title,
      url: a.url,
      source: 'Dev.to',
      sourceUrl: 'https://dev.to',
      score: (a.positive_reactions_count ?? 0) + (a.comments_count ?? 0) * 2,
      pubDate: a.published_at ?? null,
      tags: (a.tag_list ?? []).slice(0, 3),
    }));
  } catch {
    return [];
  }
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * @param {string[]} categoryNames - user's category names (lowercased)
 * @returns {Promise<object[]>}
 */
export async function fetchDailyPicks(categoryNames = []) {
  // Resolve which subreddits + keywords to use based on user categories
  const lc = categoryNames.map((n) => n.toLowerCase());
  const matchedKeys = Object.keys(CATEGORY_MAP).filter((key) =>
    lc.some((name) => name.includes(key) || key.includes(name))
  );

  // Always include 'dev' and 'tech' as base
  const activeKeys = [...new Set(['dev', 'tech', ...matchedKeys])];

  const subreddits = [...new Set(activeKeys.flatMap((k) => CATEGORY_MAP[k]?.subreddits ?? []))];
  const keywords   = [...new Set(activeKeys.flatMap((k) => CATEGORY_MAP[k]?.keywords ?? []))];
  const devtoTags  = matchedKeys.slice(0, 2);

  const [hnItems, redditItems, ghItems, devtoItems] = await Promise.allSettled([
    fetchHN(keywords),
    fetchReddit(subreddits),
    fetchGitHubTrending(),
    fetchDevTo(devtoTags),
  ]).then((results) => results.map((r) => (r.status === 'fulfilled' ? r.value : [])));

  // Deduplicate by URL domain+path
  const seen = new Set();
  const deduped = [];
  for (const item of [...hnItems, ...redditItems, ...ghItems, ...devtoItems]) {
    try {
      const u = new URL(item.url);
      const key = u.hostname + u.pathname;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    } catch {
      deduped.push(item);
    }
  }

  return deduped;
}

// ── Store interface ───────────────────────────────────────────────────────────

let _memPicks = [];
let _memRefreshedAt = null;

export const picksStore = {
  needsRefresh() {
    if (!_memRefreshedAt) return true;
    return Date.now() - new Date(_memRefreshedAt).getTime() > REFRESH_INTERVAL_MS;
  },

  async get(db, col) {
    if (db) {
      try {
        const doc = await db.collection(col ?? 'dailyPicks').doc('latest').get();
        if (doc.exists) {
          const { picks, refreshedAt } = doc.data();
          _memRefreshedAt = refreshedAt;
          _memPicks = picks ?? [];
          return { picks: _memPicks, refreshedAt };
        }
      } catch { /* fall through to in-memory */ }
    }
    return { picks: _memPicks, refreshedAt: _memRefreshedAt };
  },

  async save(db, col, picks) {
    const refreshedAt = new Date().toISOString();
    _memPicks = picks;
    _memRefreshedAt = refreshedAt;
    if (db) {
      try {
        await db.collection(col ?? 'dailyPicks').doc('latest').set({ picks, refreshedAt });
      } catch (e) {
        console.error('Failed to save daily picks to Firestore:', e.message);
      }
    }
    return refreshedAt;
  },
};
