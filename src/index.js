import { loadConfig, loadAllConfigs, shouldRunNow } from './utils/config.js';
import { fetchAllNews, fetchQuote } from './fetch/finnhub.js';
import { filterNews, deduplicateNews } from './filter.js';
import { rankNews } from './rank.js';
import { summarizeArticles } from './summarize.js';
import { formatBriefing } from './format.js';
import { sendBriefing } from './send.js';

async function runForUser(config) {
  console.log(`\nRunning briefing for ${config.name}...`);

  // 1. Fetch news
  console.log(`  Fetching news for ${config.watchlist.length} tickers...`);
  const articles = await fetchAllNews(config.watchlist);
  console.log(`  Got ${articles.length} raw articles`);

  // 2. Filter
  const filtered = filterNews(articles, config);
  console.log(`  ${filtered.length} articles after filtering`);

  // 3. Rank and trim
  const ranked = rankNews(filtered, config);
  console.log(`  Top ${ranked.length} articles after ranking`);

  // 4. Deduplicate
  const deduped = deduplicateNews(ranked);
  console.log(`  ${deduped.length} articles after dedup`);

  // 5. Summarize
  const summarized = await summarizeArticles(deduped, config);

  // 6. Fetch quotes for watchlist (for market mood section)
  const quotes = [];
  if (config.display?.market_mood) {
    for (const ticker of config.watchlist.slice(0, 5)) {
      try {
        quotes.push(await fetchQuote(ticker));
      } catch (err) {
        console.error(`  Failed to fetch quote for ${ticker}:`, err.message);
      }
    }
  }

  // 7. Format
  const briefing = formatBriefing(summarized, config, quotes);

  // 8. Send
  if (process.env.DRY_RUN === 'true') {
    console.log('\n  [DRY RUN] Would send email to:', config.email);
    console.log('  Subject: Your Market Briefing');
    console.log('  Plain text preview:\n');
    console.log(briefing.text);
    return;
  }

  await sendBriefing(config, briefing);
  console.log(`  Done! Briefing sent to ${config.email}`);
}

async function main() {
  const args = process.argv.slice(2);

  // --user <name>: run for a specific user
  const userIdx = args.indexOf('--user');
  if (userIdx !== -1 && args[userIdx + 1]) {
    const username = args[userIdx + 1];
    const config = await loadConfig(username);
    await runForUser(config);
    return;
  }

  // --schedule-match: run for all users whose schedule matches now
  if (args.includes('--schedule-match')) {
    const configs = await loadAllConfigs();
    const matches = configs.filter(c => shouldRunNow(c));
    console.log(`Schedule match: ${matches.length} of ${configs.length} users due now`);

    for (const config of matches) {
      try {
        await runForUser(config);
      } catch (err) {
        console.error(`Failed for ${config.name}:`, err);
      }
    }
    return;
  }

  // --all: run for everyone regardless of schedule
  if (args.includes('--all')) {
    const configs = await loadAllConfigs();
    for (const config of configs) {
      try {
        await runForUser(config);
      } catch (err) {
        console.error(`Failed for ${config.name}:`, err);
      }
    }
    return;
  }

  // Default: show usage
  console.log(`Stock News Bot

Usage:
  node src/index.js --user <name>       Run for a specific user
  node src/index.js --all               Run for all users
  node src/index.js --schedule-match    Run for users due now (cron mode)

Environment variables:
  FINNHUB_API_KEY      Required - Finnhub API key
  RESEND_API_KEY       Required - Resend API key
  ANTHROPIC_API_KEY    Optional - Claude API key for summaries
  DRY_RUN=true         Optional - Preview without sending

Configs: configs/<username>.json
Example: configs/example.json`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
