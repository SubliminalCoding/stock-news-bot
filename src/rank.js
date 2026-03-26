import { isWatchlistMatch } from './filter.js';

const CATEGORY_MAP = {
  'earnings': ['earnings', 'revenue', 'eps', 'quarterly results', 'guidance'],
  'fed_rates': ['fed', 'fomc', 'interest rate', 'federal reserve', 'monetary policy'],
  'economic_data': ['cpi', 'inflation', 'jobs', 'unemployment', 'gdp', 'pmi', 'retail sales'],
  'analyst_ratings': ['upgrade', 'downgrade', 'price target', 'analyst', 'rating'],
  'mergers_deals': ['merger', 'acquisition', 'ipo', 'spac', 'deal', 'buyout', 'takeover'],
  'insider_trading': ['insider', 'form 4', 'insider buying', 'insider selling'],
  'political_regulatory': ['regulation', 'sec', 'congress', 'legislation', 'antitrust', 'tariff'],
  'social_retail': ['reddit', 'wallstreetbets', 'meme', 'retail trader', 'short squeeze'],
};

export function rankNews(articles, config) {
  const scored = articles.map(article => ({
    ...article,
    score: calculateScore(article, config),
  }));

  // Sort by score descending, then by recency
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.datetime - a.datetime;
  });

  // Trim to max items with diversity cap per ticker
  const maxItems = config.display?.max_items || 15;
  const maxPerTicker = Math.max(3, Math.ceil(maxItems * 0.4));
  return diversityTrim(scored, maxItems, maxPerTicker);
}

function calculateScore(article, config) {
  let score = 0;
  const text = `${article.headline} ${article.summary}`.toLowerCase();

  // Watchlist match is highest priority
  if (isWatchlistMatch(article, config)) {
    score += 10;
  }

  // News category priority (user's top 3)
  const priorities = config.news_priorities || [];
  for (let i = 0; i < priorities.length; i++) {
    const keywords = CATEGORY_MAP[priorities[i]] || [];
    if (keywords.some(kw => text.includes(kw))) {
      score += 5 - i; // first priority +5, second +4, third +3
      break;
    }
  }

  // Recency bonus
  const ageHours = (Date.now() - article.datetime) / (1000 * 60 * 60);
  if (ageHours < 4) score += 3;
  else if (ageHours < 12) score += 1;

  // Must-include override
  if (config.must_include?.length) {
    for (const rule of config.must_include) {
      if (text.includes(rule.toLowerCase().replace(/_/g, ' '))) {
        score = 999;
        break;
      }
    }
  }

  return score;
}

function diversityTrim(scored, maxItems, maxPerTicker) {
  const result = [];
  const tickerCounts = {};

  for (const article of scored) {
    if (result.length >= maxItems) break;

    const ticker = article.ticker?.toUpperCase() || '__general__';

    // Must-include overrides skip the cap
    if (article.score >= 999) {
      result.push(article);
      tickerCounts[ticker] = (tickerCounts[ticker] || 0) + 1;
      continue;
    }

    if ((tickerCounts[ticker] || 0) >= maxPerTicker) continue;

    result.push(article);
    tickerCounts[ticker] = (tickerCounts[ticker] || 0) + 1;
  }

  return result;
}
