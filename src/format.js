export function formatBriefing(articles, config, quotes = []) {
  const name = config.name || 'there';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: config.schedule.timezone,
  });

  const timeStr = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: config.schedule.timezone,
  });

  const hour = parseInt(new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone: config.schedule.timezone,
  }).format(now));
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Group articles (case-insensitive watchlist matching)
  const watchlistUpper = config.watchlist.map(t => t.toUpperCase());
  const watchlistItems = articles.filter(a => a.ticker && watchlistUpper.includes(a.ticker.toUpperCase()));
  const otherItems = articles.filter(a => !a.ticker || !watchlistUpper.includes(a.ticker.toUpperCase()));

  let html = emailWrapper(`
    ${headerSection(name, dateStr, timeStr, greeting)}
    ${config.display?.market_mood ? marketMoodSection(quotes) : ''}
    ${watchlistItems.length ? newsSection('Your Watchlist', watchlistItems, config) : ''}
    ${otherItems.length ? newsSection('Market News', otherItems, config) : ''}
    ${footerSection()}
  `);

  // Also generate plain text version
  const text = formatPlainText(articles, config, dateStr, quotes);

  return { html, text };
}

function emailWrapper(body) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    ${body}
  </div>
</body>
</html>`;
}

function headerSection(name, dateStr, timeStr, greeting = 'Good morning') {
  return `
    <div style="text-align:center;padding:24px 0 20px;">
      <div style="font-size:28px;margin-bottom:8px;">&#9889;</div>
      <h1 style="color:#f1f5f9;font-size:20px;margin:0 0 4px;">${greeting}, ${name}</h1>
      <p style="color:#94a3b8;font-size:13px;margin:0;">${dateStr} at ${timeStr}</p>
    </div>
    <div style="height:1px;background:#1e293b;margin:0 0 24px;"></div>`;
}

function marketMoodSection(quotes) {
  if (!quotes.length) return '';

  const spyQuote = quotes.find(q => q.ticker === 'SPY');
  const mood = spyQuote
    ? (spyQuote.changePercent > 0 ? '&#9650; Markets Up' : '&#9660; Markets Down')
    : 'Market Mood';

  const quotesHtml = quotes
    .slice(0, 5)
    .map(q => {
      const color = q.changePercent >= 0 ? '#4ade80' : '#f87171';
      const arrow = q.changePercent >= 0 ? '&#9650;' : '&#9660;';
      return `<span style="display:inline-block;margin:0 12px 8px 0;color:${color};font-size:13px;">
        <strong>${q.ticker}</strong> $${q.current?.toFixed(2)} ${arrow} ${Math.abs(q.changePercent)?.toFixed(1)}%
      </span>`;
    })
    .join('');

  return `
    <div style="background:#111827;border:1px solid #1e293b;border-radius:12px;padding:16px;margin-bottom:16px;">
      <h2 style="color:#38bdf8;font-size:14px;margin:0 0 10px;">${mood}</h2>
      <div>${quotesHtml}</div>
    </div>`;
}

function newsSection(title, articles, config) {
  const detailLevel = config.display?.detail_level || 'paragraph';

  const itemsHtml = articles.map(article => {
    const tickerBadge = article.ticker
      ? `<span style="background:#1e3a5f;color:#38bdf8;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;margin-right:8px;">${article.ticker}</span>`
      : '';

    const timeAgo = getTimeAgo(article.datetime);

    let bodyHtml = '';
    if (detailLevel !== 'headlines' && article.displayText) {
      bodyHtml = `<p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:8px 0 0;">${article.displayText}</p>`;
    }

    return `
      <div style="padding:14px 0;border-bottom:1px solid #1e293b;">
        <div>
          ${tickerBadge}
          <span style="color:#64748b;font-size:11px;">${timeAgo} &middot; ${escapeHtml(article.sourceMedia) || 'News'}</span>
        </div>
        <a href="${escapeHtml(article.url)}" style="color:#f1f5f9;font-size:14px;font-weight:500;text-decoration:none;line-height:1.4;display:block;margin-top:6px;">
          ${escapeHtml(article.headline)}
        </a>
        ${bodyHtml}
      </div>`;
  }).join('');

  return `
    <div style="margin-bottom:20px;">
      <h2 style="color:#38bdf8;font-size:15px;margin:0 0 4px;">${title}</h2>
      ${itemsHtml}
    </div>`;
}

function footerSection() {
  return `
    <div style="text-align:center;padding:24px 0;color:#64748b;font-size:11px;">
      <p>Update your preferences at <a href="https://dadstocks.netlify.app" style="color:#38bdf8;">dadstocks.netlify.app</a></p>
    </div>`;
}

function getTimeAgo(date) {
  if (!date) return 'Recent';
  const hours = Math.floor((Date.now() - date) / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours === 1) return '1h ago';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatPlainText(articles, config, dateStr, quotes) {
  let text = `Stock Briefing for ${config.name} - ${dateStr}\n\n`;

  if (quotes.length) {
    text += quotes.slice(0, 5).map(q =>
      `${q.ticker}: $${q.current?.toFixed(2)} (${q.changePercent >= 0 ? '+' : ''}${q.changePercent?.toFixed(1)}%)`
    ).join(' | ') + '\n\n';
  }

  articles.forEach((a, i) => {
    text += `${i + 1}. ${a.ticker ? `[${a.ticker}] ` : ''}${a.headline}\n`;
    if (a.displayText) text += `   ${a.displayText}\n`;
    text += `   ${a.url}\n\n`;
  });

  return text;
}
