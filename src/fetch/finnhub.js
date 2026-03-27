const API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

async function finnhubFetch(endpoint, params = {}, retries = 1) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('token', API_KEY);
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, val);
  }

  const res = await fetch(url);
  if (!res.ok) {
    if (retries > 0 && (res.status === 429 || res.status >= 500)) {
      console.log(`  Finnhub ${endpoint} returned ${res.status}, retrying in 1s...`);
      await new Promise(r => setTimeout(r, 1000));
      return finnhubFetch(endpoint, params, retries - 1);
    }
    throw new Error(`Finnhub ${endpoint}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchCompanyNews(ticker, daysBack = 1) {
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - daysBack * 86400000).toISOString().split('T')[0];

  const articles = await finnhubFetch('/company-news', {
    symbol: ticker,
    from,
    to,
  });

  return articles.map(a => ({
    source: 'finnhub',
    type: 'company_news',
    ticker,
    headline: a.headline,
    summary: a.summary,
    url: a.url,
    datetime: new Date(a.datetime * 1000),
    category: a.category,
    sourceMedia: a.source,
    image: a.image,
  }));
}

export async function fetchMarketNews(category = 'general') {
  const articles = await finnhubFetch('/news', { category });

  return articles.map(a => ({
    source: 'finnhub',
    type: 'market_news',
    ticker: null,
    headline: a.headline,
    summary: a.summary,
    url: a.url,
    datetime: new Date(a.datetime * 1000),
    category: a.category,
    sourceMedia: a.source,
    image: a.image,
  }));
}

export async function fetchQuote(ticker) {
  const q = await finnhubFetch('/quote', { symbol: ticker });
  return {
    ticker,
    current: q.c,
    change: q.d,
    changePercent: q.dp,
    high: q.h,
    low: q.l,
    open: q.o,
    previousClose: q.pc,
  };
}

export async function fetchAllNews(watchlist, daysBack = 1) {
  const results = [];

  // Fetch company news for each watchlist ticker
  const companyPromises = watchlist.map(ticker =>
    fetchCompanyNews(ticker, daysBack).catch(err => {
      console.error(`Failed to fetch news for ${ticker}:`, err.message);
      return [];
    })
  );

  const companyResults = await Promise.all(companyPromises);
  for (const articles of companyResults) {
    results.push(...articles);
  }

  // Fetch general market news
  try {
    const marketNews = await fetchMarketNews('general');
    results.push(...marketNews.slice(0, 20)); // cap general news
  } catch (err) {
    console.error('Failed to fetch market news:', err.message);
  }

  return results;
}

// Allow running standalone for testing
if (process.argv[1] && process.argv[1].includes('finnhub')) {
  if (!API_KEY) {
    console.error('Set FINNHUB_API_KEY env var');
    process.exit(1);
  }
  const ticker = process.argv[2] || 'AAPL';
  console.log(`Fetching news for ${ticker}...`);
  const news = await fetchCompanyNews(ticker);
  console.log(`Got ${news.length} articles`);
  news.slice(0, 3).forEach(a => console.log(`  - ${a.headline}`));
}
