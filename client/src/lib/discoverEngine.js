const TAG_RULES = [
  [['android', 'mobile', 'ios', 'apple', 'mac'], 'mobile'],
  [['python', 'js', 'javascript', 'typescript', 'react', 'vue', 'node', 'rust', 'go', 'swift', 'kotlin', 'web', 'css', 'html', 'frontend', 'backend'], 'dev'],
  [['ai', 'ml', 'machine', 'learning', 'llm', 'gpt', 'openai', 'anthropic', 'deep'], 'ai'],
  [['design', 'ux', 'ui', 'figma', 'css'], 'design'],
  [['security', 'hack', 'cyber', 'vuln', 'breach'], 'security'],
  [['linux', 'ubuntu', 'debian', 'fedora', 'gnome', 'kde', 'oss', 'open source', 'github'], 'oss'],
  [['game', 'gaming', 'kotaku', 'steam'], 'gaming'],
  [['space', 'nasa', 'esa', 'rocket', 'planet'], 'space'],
  [['science', 'nature', 'quanta', 'physics', 'biology', 'chemistry'], 'science'],
  [['business', 'startup', 'venture', 'vc', 'finance', 'money', 'stock'], 'business'],
  [['news', 'politics', 'world'], 'news'],
  [['health', 'medical', 'medicine', 'fitness'], 'health'],
  [['crypto', 'bitcoin', 'ethereum', 'blockchain', 'web3'], 'crypto'],
  [['youtube', 'video', 'channel'], 'youtube'],
];

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function tagsForText(text) {
  const lower = (text ?? '').toLowerCase();
  const matched = [];
  for (const [keywords, tag] of TAG_RULES) {
    if (keywords.some((k) => lower.includes(k))) matched.push(tag);
  }
  return matched;
}

export function scoreSuggestions(suggestions, existingFeeds) {
  const followedDomains = new Set(
    existingFeeds.map((f) => extractDomain(f.url)).filter(Boolean)
  );

  const tagFrequency = {};
  for (const feed of existingFeeds) {
    const text = (feed.url ?? '') + ' ' + (feed.label ?? '');
    for (const tag of tagsForText(text)) {
      tagFrequency[tag] = (tagFrequency[tag] ?? 0) + 1;
    }
  }

  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const scored = [];
  for (const s of suggestions) {
    const domain = extractDomain(s.feedUrl ?? s.url ?? '');
    if (domain && followedDomains.has(domain)) continue;

    let score = 0;
    for (const tag of s.tags ?? []) {
      score += tagFrequency[tag] ?? 0;
    }
    if (s.quality === 3) score += 3;
    else if (s.quality === 2) score += 1;

    const isNew = s.addedAt
      ? now - new Date(s.addedAt).getTime() <= sevenDays
      : false;

    scored.push({ ...s, score, isNew });
  }

  return scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.quality ?? 0) - (a.quality ?? 0);
  });
}
