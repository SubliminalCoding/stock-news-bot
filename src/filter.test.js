import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { filterNews, isWatchlistMatch, deduplicateNews } from './filter.js';

// Helper: create an article with sensible defaults
function makeArticle(overrides = {}) {
  return {
    ticker: 'AAPL',
    headline: 'Apple reports strong quarterly earnings',
    summary: 'Revenue beat expectations across all segments.',
    datetime: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    type: 'company_news',
    sourceMedia: 'Reuters',
    ...overrides,
  };
}

function baseConfig(overrides = {}) {
  return {
    watchlist: ['AAPL', 'MSFT'],
    exclusions: { tickers: [], topics: [] },
    sectors: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// filterNews
// ---------------------------------------------------------------------------
describe('filterNews', () => {
  it('drops blacklisted tickers', () => {
    const articles = [makeArticle({ ticker: 'COIN' })];
    const config = baseConfig({ exclusions: { tickers: ['COIN'], topics: [] } });
    const result = filterNews(articles, config);
    assert.equal(result.length, 0);
  });

  it('drops blacklisted topics', () => {
    const articles = [makeArticle({ headline: 'Crypto market surges', summary: 'Bitcoin hits new high.' })];
    const config = baseConfig({ exclusions: { tickers: [], topics: ['crypto'] } });
    const result = filterNews(articles, config);
    assert.equal(result.length, 0);
  });

  it('drops stale articles (>20h)', () => {
    const staleDate = Date.now() - 21 * 60 * 60 * 1000; // 21 hours ago
    const articles = [makeArticle({ datetime: staleDate })];
    const config = baseConfig();
    const result = filterNews(articles, config);
    assert.equal(result.length, 0);
  });

  it('passes watchlist articles through even without sector match', () => {
    const articles = [makeArticle({ ticker: 'AAPL', type: 'company_news' })];
    // Require Energy sector -- AAPL headline won't match, but watchlist overrides
    const config = baseConfig({ sectors: ['Energy'] });
    const result = filterNews(articles, config);
    assert.equal(result.length, 1);
    assert.equal(result[0].ticker, 'AAPL');
  });
});

// ---------------------------------------------------------------------------
// isWatchlistMatch
// ---------------------------------------------------------------------------
describe('isWatchlistMatch', () => {
  it('works case-insensitively', () => {
    const config = baseConfig({ watchlist: ['aapl'] });
    assert.equal(isWatchlistMatch({ ticker: 'AAPL' }, config), true);
    assert.equal(isWatchlistMatch({ ticker: 'aapl' }, config), true);
    assert.equal(isWatchlistMatch({ ticker: 'Aapl' }, config), true);
  });

  it('returns false when ticker is missing', () => {
    const config = baseConfig();
    assert.equal(isWatchlistMatch({}, config), false);
  });
});

// ---------------------------------------------------------------------------
// deduplicateNews
// ---------------------------------------------------------------------------
describe('deduplicateNews', () => {
  it('collapses articles with high keyword overlap on same ticker', () => {
    const articles = [
      makeArticle({ ticker: 'TSLA', headline: 'Tesla reports record quarterly earnings' }),
      makeArticle({ ticker: 'TSLA', headline: 'Tesla reports strong quarterly earnings results' }),
    ];
    const result = deduplicateNews(articles);
    assert.equal(result.length, 1);
  });

  it('keeps articles with different topics on same ticker', () => {
    const articles = [
      makeArticle({ ticker: 'TSLA', headline: 'Tesla reports record quarterly earnings beat' }),
      makeArticle({ ticker: 'TSLA', headline: 'Tesla recalls 500000 vehicles over safety defect' }),
    ];
    const result = deduplicateNews(articles);
    assert.equal(result.length, 2);
  });

  it('collapses cross-ticker articles with very high overlap', () => {
    const articles = [
      makeArticle({ ticker: 'AAPL', headline: 'Federal Reserve raises interest rates by quarter point again' }),
      makeArticle({ ticker: 'MSFT', headline: 'Federal Reserve raises interest rates by quarter point again' }),
    ];
    const result = deduplicateNews(articles);
    assert.equal(result.length, 1);
  });
});
