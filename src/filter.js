export function filterNews(articles, config) {
  const maxAgeHours = 20;
  const cutoff = Date.now() - (maxAgeHours * 60 * 60 * 1000);

  return articles.filter(article => {
    // Drop stale articles (>20h old)
    if (article.datetime && article.datetime < cutoff) return false;
    // Hard exclusion: blacklisted tickers
    if (config.exclusions?.tickers?.length) {
      const excludedTickers = config.exclusions.tickers.map(t => t.toUpperCase());
      if (article.ticker && excludedTickers.includes(article.ticker.toUpperCase())) {
        return false;
      }
    }

    // Hard exclusion: blacklisted topics
    if (config.exclusions?.topics?.length) {
      const text = `${article.headline} ${article.summary}`.toLowerCase();
      for (const topic of config.exclusions.topics) {
        if (text.includes(topic.toLowerCase())) return false;
      }
    }

    // Sector filter for non-watchlist stories
    if (!isWatchlistMatch(article, config)) {
      if (config.sectors?.length && article.type === 'company_news') {
        // Non-watchlist company news must match a sector or have high relevance
        // We'll be generous here since sector tagging from Finnhub is limited
      }
    }

    return true;
  });
}

export function isWatchlistMatch(article, config) {
  if (!article.ticker) return false;
  return config.watchlist.some(t =>
    t.toUpperCase() === article.ticker.toUpperCase()
  );
}

export function deduplicateNews(articles) {
  const kept = [];

  for (const article of articles) {
    const isDupe = kept.some(existing => isSameStory(article, existing));
    if (!isDupe) {
      kept.push(article);
    }
  }

  return kept;
}

function isSameStory(a, b) {
  // Same ticker + high keyword overlap = same story
  if (a.ticker && b.ticker && a.ticker === b.ticker) {
    const overlapScore = keywordOverlap(a.headline, b.headline);
    if (overlapScore >= 0.4) return true;
  }

  // Even across tickers, very high overlap means same story
  const overlapScore = keywordOverlap(a.headline, b.headline);
  if (overlapScore >= 0.6) return true;

  return false;
}

function keywordOverlap(headlineA, headlineB) {
  const wordsA = extractKeywords(headlineA);
  const wordsB = extractKeywords(headlineB);
  if (!wordsA.size || !wordsB.size) return 0;

  let matches = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) matches++;
  }

  // Jaccard-ish: matches over smaller set size
  const smaller = Math.min(wordsA.size, wordsB.size);
  return matches / smaller;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
  'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'this', 'that',
  'it', 'its', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'into', 'and', 'or', 'but', 'not', 'no',
  'up', 'out', 'if', 'about', 'than', 'just', 'over', 'after',
  'why', 'how', 'what', 'when', 'where', 'which', 'who',
]);

function extractKeywords(headline) {
  const words = headline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  return new Set(words);
}
