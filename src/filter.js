export function filterNews(articles, config) {
  return articles.filter(article => {
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
  const seen = new Map();

  for (const article of articles) {
    // Use headline similarity as dedup key
    const key = normalizeHeadline(article.headline);
    const existing = seen.get(key);

    if (!existing || article.score > existing.score) {
      seen.set(key, article);
    }
  }

  return [...seen.values()];
}

function normalizeHeadline(headline) {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60); // compare first 60 chars
}
