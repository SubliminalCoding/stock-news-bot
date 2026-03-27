const API_KEY = process.env.ALPHA_VANTAGE_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

async function avFetch(params) {
  const url = new URL(BASE_URL);
  url.searchParams.set('apikey', API_KEY || 'demo');
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, val);
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alpha Vantage: ${res.status} ${res.statusText}`);
  const data = await res.json();

  if (data['Note'] || data['Information']) {
    throw new Error(`Alpha Vantage rate limit: ${data['Note'] || data['Information']}`);
  }

  return data;
}

export async function fetchMarketOverview() {
  const indices = [
    { symbol: 'SPY', name: 'S&P 500' },
    { symbol: 'QQQ', name: 'Nasdaq 100' },
    { symbol: 'DIA', name: 'Dow Jones' },
    { symbol: 'IWM', name: 'Russell 2000' },
    { symbol: 'VIX', name: 'VIX' },
  ];

  const results = [];
  for (const idx of indices) {
    try {
      const data = await avFetch({
        function: 'GLOBAL_QUOTE',
        symbol: idx.symbol,
      });
      const quote = data['Global Quote'];
      if (quote) {
        results.push({
          ticker: idx.symbol,
          name: idx.name,
          current: parseFloat(quote['05. price']),
          change: parseFloat(quote['09. change']),
          changePercent: parseFloat(quote['10. change percent']?.replace('%', '')),
          volume: parseInt(quote['06. volume']),
        });
      }
    } catch (err) {
      console.error(`  Alpha Vantage failed for ${idx.symbol}:`, err.message);
    }
  }

  return results;
}

export async function fetchNewsSentiment(tickers) {
  if (!API_KEY) return [];

  try {
    const data = await avFetch({
      function: 'NEWS_SENTIMENT',
      tickers: tickers.join(','),
      limit: 20,
    });

    if (!data.feed) return [];

    return data.feed.map(item => ({
      source: 'alpha_vantage',
      type: 'sentiment_news',
      ticker: item.ticker_sentiment?.[0]?.ticker || null,
      headline: item.title,
      summary: item.summary,
      url: item.url,
      datetime: new Date(item.time_published?.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')),
      category: item.topics?.[0]?.topic || 'general',
      sourceMedia: item.source,
      sentimentScore: parseFloat(item.overall_sentiment_score),
      sentimentLabel: item.overall_sentiment_label,
    }));
  } catch (err) {
    console.error('  Alpha Vantage news sentiment failed:', err.message);
    return [];
  }
}
