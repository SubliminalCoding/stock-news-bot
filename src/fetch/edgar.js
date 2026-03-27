const BASE_URL = 'https://efts.sec.gov/LATEST/search-index';
const FILINGS_URL = 'https://www.sec.gov/cgi-bin/browse-edgar';

const HEADERS = {
  'User-Agent': 'DadStocks Bot matt@redwooddigitalfrederick.com',
  'Accept': 'application/json',
};

export async function fetchRecentFilings(ticker) {
  try {
    const url = new URL('https://efts.sec.gov/LATEST/search-index');
    url.searchParams.set('q', `"${ticker}"`);
    url.searchParams.set('dateRange', 'custom');

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    url.searchParams.set('startdt', yesterday);
    url.searchParams.set('enddt', today);

    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.hits?.hits) return [];

    return data.hits.hits.slice(0, 5).map(hit => {
      const src = hit._source || {};
      return {
        source: 'edgar',
        type: 'sec_filing',
        ticker: ticker,
        headline: `SEC Filing: ${src.form_type || 'Unknown'} - ${src.entity_name || ticker}`,
        summary: src.file_description || `${src.form_type} filing for ${src.entity_name || ticker}`,
        url: `https://www.sec.gov/Archives/edgar/data/${src.entity_id}/${src.file_num}`,
        datetime: new Date(src.file_date || Date.now()),
        category: 'sec_filing',
        sourceMedia: 'SEC EDGAR',
        formType: src.form_type,
      };
    });
  } catch (err) {
    console.error(`  EDGAR failed for ${ticker}:`, err.message);
    return [];
  }
}

export async function fetchFilingsForWatchlist(watchlist) {
  const results = [];

  // SEC has rate limits, fetch sequentially with small delay
  for (const ticker of watchlist) {
    const filings = await fetchRecentFilings(ticker);
    results.push(...filings);
    if (watchlist.indexOf(ticker) < watchlist.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
}
