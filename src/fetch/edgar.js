const SEARCH_URL = 'https://efts.sec.gov/LATEST/search-index';

const HEADERS = {
  'User-Agent': 'DadStocks Bot matt@redwooddigitalfrederick.com',
  'Accept': 'application/json',
};

export async function fetchRecentFilings(ticker) {
  try {
    const url = new URL(SEARCH_URL);
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
      // Build a proper EDGAR filing URL from accession number
      const accession = src.accession_no?.replace(/-/g, '') || '';
      const cik = src.entity_id || '';
      const filingUrl = accession && cik
        ? `https://www.sec.gov/Archives/edgar/data/${cik}/${accession}`
        : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=${ticker}&type=&dateb=&owner=include&count=10&search_text=&action=getcompany`;

      return {
        source: 'edgar',
        type: 'sec_filing',
        ticker: ticker,
        headline: `SEC Filing: ${src.form_type || 'Unknown'} - ${src.entity_name || ticker}`,
        summary: src.file_description || `${src.form_type} filing for ${src.entity_name || ticker}`,
        url: filingUrl,
        datetime: src.file_date ? new Date(src.file_date) : null,
        category: 'sec_filing',
        sourceMedia: 'SEC EDGAR',
        formType: src.form_type,
      };
    }).filter(f => f.datetime); // Drop filings with no date to avoid false recency
  } catch (err) {
    console.error(`  EDGAR failed for ${ticker}:`, err.message);
    return [];
  }
}

export async function fetchFilingsForWatchlist(watchlist) {
  const results = [];

  for (const ticker of watchlist) {
    const filings = await fetchRecentFilings(ticker);
    results.push(...filings);
    if (watchlist.indexOf(ticker) < watchlist.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
}
