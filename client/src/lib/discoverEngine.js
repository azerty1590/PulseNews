const TAG_RULES = [
  [['android', 'mobile', 'ios', 'apple', 'mac', 'iphone', 'ipad'], 'mobile'],
  [['python', 'javascript', 'typescript', 'react', 'vue', 'angular', 'svelte', 'node', 'rust', 'golang', 'go', 'swift', 'kotlin', 'java', 'c++', 'cpp', 'ruby', 'php', 'web', 'css', 'html', 'frontend', 'backend', 'fullstack', 'devops', 'docker', 'kubernetes', 'api', 'database', 'sql', 'programming', 'software', 'engineering', 'developer', 'code', 'coding'], 'dev'],
  [['ai', 'ml', 'machine learning', 'llm', 'gpt', 'openai', 'anthropic', 'deep learning', 'neural', 'huggingface', 'mistral', 'gemini', 'claude', 'chatgpt', 'artificial intelligence'], 'ai'],
  [['design', 'ux', 'ui', 'figma', 'typography', 'branding', 'product design', 'interface', 'accessibility', 'dribbble', 'behance'], 'design'],
  [['security', 'hack', 'cyber', 'vuln', 'breach', 'exploit', 'malware', 'infosec', 'ctf', 'privacy', 'encryption'], 'security'],
  [['linux', 'ubuntu', 'debian', 'fedora', 'gnome', 'kde', 'open source', 'opensource', 'github', 'gitlab', 'foss', 'oss', 'terminal', 'bash', 'shell', 'vim', 'emacs'], 'oss'],
  [['game', 'gaming', 'steam', 'playstation', 'xbox', 'nintendo', 'esport', 'indie game', 'videogame'], 'gaming'],
  [['space', 'nasa', 'esa', 'rocket', 'planet', 'astronomy', 'spacex', 'orbit', 'mars', 'moon', 'telescope', 'cosmos'], 'space'],
  [['science', 'nature', 'quanta', 'physics', 'biology', 'chemistry', 'research', 'study', 'journal', 'peer review'], 'science'],
  [['business', 'startup', 'venture', 'vc', 'finance', 'money', 'stock', 'market', 'economy', 'entrepreneur', 'saas', 'product'], 'business'],
  [['health', 'medical', 'medicine', 'fitness', 'nutrition', 'mental health', 'wellness', 'diet', 'exercise'], 'health'],
  [['crypto', 'bitcoin', 'ethereum', 'blockchain', 'web3', 'defi', 'nft', 'solana'], 'crypto'],
  [['youtube', 'video', 'channel', 'podcast', 'streaming'], 'youtube'],
  [['writing', 'essay', 'blog', 'newsletter', 'substack', 'medium', 'productivity', 'notetaking', 'obsidian'], 'writing'],
];

// Well-known domains mapped to tags — fills the gap when URL/label keywords miss
const DOMAIN_TAG_MAP = {
  'github.com': ['dev', 'oss'],
  'stackoverflow.com': ['dev'],
  'reddit.com': ['dev'],
  'hackernews.com': ['dev'],
  'news.ycombinator.com': ['dev', 'business'],
  'lobste.rs': ['dev', 'oss'],
  'medium.com': ['dev'],
  'dev.to': ['dev'],
  'css-tricks.com': ['dev', 'design'],
  'smashingmagazine.com': ['dev', 'design'],
  'a11yproject.com': ['design'],
  'uxdesign.cc': ['design'],
  'thenewstack.io': ['dev', 'devops'],
  'infoq.com': ['dev'],
  'dzone.com': ['dev'],
  'martinfowler.com': ['dev'],
  'overreacted.io': ['dev'],
  'kentcdodds.com': ['dev'],
  'paulgraham.com': ['business', 'dev'],
  'stratechery.com': ['business', 'dev'],
  'theverge.com': ['dev', 'mobile'],
  'techcrunch.com': ['dev', 'business'],
  'wired.com': ['dev', 'science'],
  'arstechnica.com': ['dev', 'science', 'oss'],
  '9to5mac.com': ['mobile'],
  'macrumors.com': ['mobile'],
  'androidpolice.com': ['mobile'],
  'androidauthority.com': ['mobile'],
  'krebs.security': ['security'],
  'krebsonsecurity.com': ['security'],
  'schneier.com': ['security'],
  'darkreading.com': ['security'],
  'securityweek.com': ['security'],
  'linuxtoday.com': ['oss', 'linux'],
  'omgubuntu.co.uk': ['oss'],
  'phoronix.com': ['oss', 'linux'],
  'nasa.gov': ['space'],
  'spacenews.com': ['space'],
  'spacex.com': ['space'],
  'quantamagazine.org': ['science'],
  'nature.com': ['science'],
  'newscientist.com': ['science'],
  'kotaku.com': ['gaming'],
  'ign.com': ['gaming'],
  'rockpapershotgun.com': ['gaming'],
  'eurogamer.net': ['gaming'],
  'coindesk.com': ['crypto'],
  'cointelegraph.com': ['crypto'],
  'decrypt.co': ['crypto'],
  'defiant.com': ['health'],
  'examined.com': ['health'],
  'substack.com': ['writing'],
};

export function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function tagsForText(text) {
  const lower = (text ?? '').toLowerCase();
  const matched = new Set();
  for (const [keywords, tag] of TAG_RULES) {
    if (keywords.some((k) => lower.includes(k))) matched.add(tag);
  }
  return [...matched];
}

function tagsForDomain(domain) {
  if (!domain) return [];
  // exact match first, then TLD-stripped partial match
  if (DOMAIN_TAG_MAP[domain]) return DOMAIN_TAG_MAP[domain];
  for (const [key, tags] of Object.entries(DOMAIN_TAG_MAP)) {
    if (domain.endsWith(key) || key.endsWith(domain)) return tags;
  }
  return [];
}

// Derive the tag-set that best describes a category, from its name plus the
// domains/labels of the feeds already inside it. Used to scope Discover by the
// selected category (best-effort matching).
export function tagsForCategory(category, feedsInCategory = []) {
  const tags = new Set();
  for (const t of tagsForText(category?.name ?? '')) tags.add(t);
  for (const f of feedsInCategory) {
    const domain = extractDomain(f.url ?? f.feedUrl ?? '');
    for (const t of tagsForDomain(domain)) tags.add(t);
    const text = [f.url, f.label, f.description].filter(Boolean).join(' ');
    for (const t of tagsForText(text)) tags.add(t);
  }
  return [...tags];
}

// Does a suggestion/pick match a category's tag-set? Falls back to a loose
// name/keyword match so custom category names still filter something.
export function matchesCategory(item, categoryTags, categoryName = '') {
  const itemTags = item?.tags ?? [];
  if (categoryTags.length && itemTags.some((t) => categoryTags.includes(t))) return true;
  // Best-effort: category name appears in the item's title/label/tags.
  const name = categoryName.trim().toLowerCase();
  if (name.length >= 3) {
    const hay = [item?.title, item?.label, item?.source, item?.description, ...(itemTags)]
      .filter(Boolean).join(' ').toLowerCase();
    if (hay.includes(name)) return true;
  }
  return false;
}

export function scoreSuggestions(suggestions, existingFeeds, categories = []) {
  const followedDomains = new Set(
    existingFeeds.map((f) => extractDomain(f.url)).filter(Boolean)
  );

  // Build tag frequency from multiple signals per feed
  const tagFrequency = {};
  function bump(tag, weight = 1) {
    tagFrequency[tag] = (tagFrequency[tag] ?? 0) + weight;
  }

  for (const feed of existingFeeds) {
    const domain = extractDomain(feed.url ?? '');
    const text = [feed.url, feed.label, feed.description].filter(Boolean).join(' ');

    // Signal 1: keyword match in URL + label
    for (const tag of tagsForText(text)) bump(tag, 2);

    // Signal 2: known domain → tags (strongest signal)
    for (const tag of tagsForDomain(domain)) bump(tag, 3);
  }

  // Signal 3: category names (explicit user intent — highest weight)
  for (const cat of categories) {
    for (const tag of tagsForText(cat.name ?? '')) bump(tag, 5);
  }

  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const scored = [];
  for (const s of suggestions) {
    const domain = extractDomain(s.feedUrl ?? s.url ?? '');
    if (domain && followedDomains.has(domain)) continue;

    // Score = sum of tagFrequency for each tag this suggestion has
    let score = 0;
    for (const tag of s.tags ?? []) {
      score += tagFrequency[tag] ?? 0;
    }

    // Quality bonus (secondary tiebreaker)
    if (s.quality === 3) score += 2;
    else if (s.quality === 2) score += 0.5;

    const isNew = s.addedAt
      ? now - new Date(s.addedAt).getTime() <= sevenDays
      : false;

    scored.push({ ...s, score, isNew });
  }

  // Sort by score desc, then quality desc
  return scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.quality ?? 0) - (a.quality ?? 0);
  });
}
