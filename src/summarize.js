export async function summarizeArticles(articles, config) {
  const detailLevel = config.display?.detail_level || 'paragraph';

  if (detailLevel === 'headlines') {
    return articles.map(a => ({ ...a, displayText: null }));
  }

  if (detailLevel === 'one-line') {
    return articles.map(a => ({
      ...a,
      displayText: a.summary?.split('.')[0] || null,
    }));
  }

  // Paragraph level: try Claude Haiku if available, otherwise use raw summary
  if (process.env.ANTHROPIC_API_KEY) {
    return summarizeWithClaude(articles, config);
  }

  // Fallback: use first 2 sentences of the existing summary
  return articles.map(a => ({
    ...a,
    displayText: truncateToSentences(a.summary, 2),
  }));
}

async function summarizeWithClaude(articles, config) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic();

  const results = [];

  // Batch articles into a single prompt to save API calls
  const batch = articles.map((a, i) =>
    `[${i + 1}] ${a.headline}\n${a.summary || '(no summary available)'}`
  ).join('\n\n');

  const tradingStyle = config.trading_style || 'general';
  const watchlist = config.watchlist?.join(', ') || '';
  const priorities = config.news_priorities?.join(', ') || '';

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are a stock market news summarizer. The reader is a ${tradingStyle} trader who holds: ${watchlist}. Their top priorities are: ${priorities}.

Summarize each article below in 2-3 sentences. Focus on what matters to a trader: price impact, catalysts, and what to watch next. When an article relates to one of the reader's holdings, note the connection. Be concise and direct. No fluff.

Return ONLY your summaries, one per line, prefixed with the article number and a pipe character. Example format:
1| Summary of first article here.
2| Summary of second article here.

${batch}`
    }],
  });

  const summaryText = response.content[0].text;
  const summaries = parseSummaries(summaryText, articles.length);

  return articles.map((a, i) => ({
    ...a,
    displayText: summaries[i] || truncateToSentences(a.summary, 2),
  }));
}

function parseSummaries(text, count) {
  const summaries = new Array(count).fill(null);
  const lines = text.split('\n').filter(l => l.trim());

  for (const line of lines) {
    const match = line.match(/^(\d+)\s*\|\s*(.+)/);
    if (match) {
      const idx = parseInt(match[1], 10) - 1;
      if (idx >= 0 && idx < count) {
        summaries[idx] = match[2].trim();
      }
    }
  }

  return summaries;
}

function truncateToSentences(text, count) {
  if (!text) return null;
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  return sentences.slice(0, count).join(' ').trim();
}
