import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rankNews, diversityTrim } from './rank.js';

function makeArticle(overrides = {}) {
  return {
    ticker: 'AAPL',
    headline: 'Apple reports strong quarterly earnings',
    summary: 'Revenue beat expectations across all segments.',
    datetime: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    type: 'company_news',
    sourceMedia: 'Unknown Blog',
    ...overrides,
  };
}

function baseConfig(overrides = {}) {
  return {
    watchlist: ['AAPL', 'MSFT'],
    exclusions: { tickers: [], topics: [] },
    sectors: [],
    news_priorities: [],
    display: { max_items: 15 },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Scoring components
// ---------------------------------------------------------------------------
describe('rankNews scoring', () => {
  it('watchlist match adds 10 points', () => {
    const onWatchlist = makeArticle({ ticker: 'AAPL', sourceMedia: null, datetime: Date.now() - 13 * 60 * 60 * 1000 });
    const offWatchlist = makeArticle({ ticker: 'COIN', sourceMedia: null, datetime: Date.now() - 13 * 60 * 60 * 1000 });
    const config = baseConfig();
    const result = rankNews([offWatchlist, onWatchlist], config);
    // AAPL should rank first due to +10 watchlist bonus
    assert.equal(result[0].ticker, 'AAPL');
    assert.equal(result[0].score - result[1].score, 10);
  });

  it('news category priority adds correct points (5, 4, 3)', () => {
    const config = baseConfig({
      watchlist: [],
      news_priorities: ['earnings', 'fed_rates', 'mergers_deals'],
      events_attention: 'low', // disable events boost to isolate category scoring
    });
    // Each article matches a different priority; set old datetime + unknown source to isolate category score
    const old = Date.now() - 13 * 60 * 60 * 1000;
    const earningsArticle = makeArticle({ ticker: 'X1', headline: 'Company posts earnings beat', summary: '', datetime: old, sourceMedia: null });
    const fedArticle = makeArticle({ ticker: 'X2', headline: 'Fed raises interest rate', summary: '', datetime: old, sourceMedia: null });
    const mergerArticle = makeArticle({ ticker: 'X3', headline: 'Major acquisition announced', summary: '', datetime: old, sourceMedia: null });

    const result = rankNews([mergerArticle, fedArticle, earningsArticle], config);
    // Earnings = +5, Fed = +4, Mergers = +3
    assert.equal(result[0].score, 5);
    assert.equal(result[1].score, 4);
    assert.equal(result[2].score, 3);
  });

  it('recency bonus: <4h = +3, <12h = +1, >=12h = +0', () => {
    const config = baseConfig({ watchlist: [], events_attention: 'low' });
    const headline = 'Company shares climb on strong demand';
    const fresh = makeArticle({ ticker: 'A', headline, summary: '', datetime: Date.now() - 1 * 60 * 60 * 1000, sourceMedia: null }); // 1h
    const medium = makeArticle({ ticker: 'B', headline, summary: '', datetime: Date.now() - 8 * 60 * 60 * 1000, sourceMedia: null }); // 8h
    const stale = makeArticle({ ticker: 'C', headline, summary: '', datetime: Date.now() - 15 * 60 * 60 * 1000, sourceMedia: null }); // 15h

    const result = rankNews([stale, medium, fresh], config);
    assert.equal(result[0].ticker, 'A'); // +3
    assert.equal(result[1].ticker, 'B'); // +1
    assert.equal(result[2].ticker, 'C'); // +0
    assert.equal(result[0].score, 3);
    assert.equal(result[1].score, 1);
    assert.equal(result[2].score, 0);
  });

  it('must-include override sets score to 999', () => {
    const config = baseConfig({
      watchlist: [],
      must_include: ['short_squeeze'],
    });
    const old = Date.now() - 15 * 60 * 60 * 1000;
    const article = makeArticle({ ticker: 'GME', headline: 'GME short squeeze intensifies', summary: '', datetime: old, sourceMedia: null });
    const result = rankNews([article], config);
    assert.equal(result[0].score, 999);
  });

  it('source quality: Reuters = +3, CNBC = +1, unknown = 0', () => {
    const config = baseConfig({ watchlist: [], events_attention: 'low' });
    const old = Date.now() - 15 * 60 * 60 * 1000;
    const headline = 'Company shares climb on strong demand';
    const reuters = makeArticle({ ticker: 'A', headline, summary: '', sourceMedia: 'Reuters', datetime: old });
    const cnbc = makeArticle({ ticker: 'B', headline, summary: '', sourceMedia: 'CNBC', datetime: old });
    const unknown = makeArticle({ ticker: 'C', headline, summary: '', sourceMedia: 'Random Blog', datetime: old });

    const result = rankNews([unknown, cnbc, reuters], config);
    assert.equal(result[0].ticker, 'A'); // Reuters +3
    assert.equal(result[0].score, 3);
    assert.equal(result[1].ticker, 'B'); // CNBC +1
    assert.equal(result[1].score, 1);
    assert.equal(result[2].ticker, 'C'); // unknown +0
    assert.equal(result[2].score, 0);
  });
});

// ---------------------------------------------------------------------------
// diversityTrim
// ---------------------------------------------------------------------------
describe('diversityTrim', () => {
  it('caps articles per single ticker', () => {
    // 6 articles all same ticker, maxPerTicker = 2, maxItems = 10
    const articles = Array.from({ length: 6 }, (_, i) => ({
      ticker: 'AAPL',
      score: 10 - i,
    }));
    const result = diversityTrim(articles, 10, 2);
    assert.equal(result.length, 2);
  });

  it('allows must-include (score >= 999) to bypass per-ticker cap', () => {
    const articles = [
      { ticker: 'AAPL', score: 999 },
      { ticker: 'AAPL', score: 999 },
      { ticker: 'AAPL', score: 999 },
      { ticker: 'AAPL', score: 5 },
    ];
    // maxPerTicker = 2, but score >= 999 bypasses
    const result = diversityTrim(articles, 10, 2);
    // 3 must-includes + 0 normal (cap already at 3 from must-includes, but normal sees count 3 >= 2)
    assert.equal(result.length, 3);
  });
});

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------
describe('rankNews sorting', () => {
  it('results are sorted by score descending', () => {
    const config = baseConfig({ watchlist: [] });
    const old = Date.now() - 15 * 60 * 60 * 1000;
    const articles = [
      makeArticle({ ticker: 'LOW', headline: 'Nothing special', summary: '', datetime: old, sourceMedia: null }),
      makeArticle({ ticker: 'HIGH', headline: 'Nothing special', summary: '', datetime: old, sourceMedia: 'Reuters' }),
    ];
    const result = rankNews(articles, config);
    for (let i = 1; i < result.length; i++) {
      assert.ok(result[i - 1].score >= result[i].score,
        `score at index ${i - 1} (${result[i - 1].score}) should be >= score at index ${i} (${result[i].score})`);
    }
  });
});
