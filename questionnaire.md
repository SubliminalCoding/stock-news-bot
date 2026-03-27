# Stock News Bot: Setup Questions

Quick setup for your personalized daily stock market briefing. Should take about 5 minutes.

---

## 1. What do you follow?

**1.1 What are your tickers?**
List the stocks, ETFs, or other symbols you want to track (up to 30).
> Example: AAPL, NVDA, TSLA, SPY, QQQ, AMZN

**1.2 Any sectors you want broader coverage on?**
Pick any that apply: Technology, Semiconductors, Financials, Energy, Healthcare/Biotech, Consumer, Industrials, Real Estate, Defense, EV/Clean Energy, Other: ________

**1.3 Do you follow anything besides US stocks?**
- [ ] US stocks is all I need
- [ ] Crypto
- [ ] International markets
- [ ] Commodities (gold, oil, etc.)

---

## 2. How do you trade?

**2.1 What best describes your style?**
- [ ] Day trading (in and out same day)
- [ ] Swing trading (hold a few days to a couple weeks)
- [ ] Longer-term investing (weeks to months or more)
- [ ] Mix of the above

**2.2 Do you pay attention to big market events (earnings, Fed meetings, etc.)?**
- [ ] Yes, very closely
- [ ] Somewhat
- [ ] Not really

---

## 3. What news matters most?

**3.1 Pick your top 3 most important news types:**
- [ ] Earnings reports
- [ ] Economic data (jobs, inflation, GDP)
- [ ] Fed and interest rate news
- [ ] Analyst upgrades/downgrades
- [ ] Mergers, IPOs, and deals
- [ ] Insider buying/selling
- [ ] Political/regulatory news
- [ ] Social media buzz and retail trader activity

**3.2 Anything you definitely don't want to see?**
> Example: penny stocks, crypto spam, meme stock hype

---

## 4. How detailed should it be?

**4.1 How much detail per story?**
- [ ] Just the headlines
- [ ] One-line summary for each
- [ ] A short paragraph with context (recommended)

**4.2 How many items in a typical daily email?**
- [ ] 5-10 (just the highlights)
- [ ] 10-20 (good balance)
- [ ] 20+ (give me everything)

**4.3 Include a "market mood" summary (Fear & Greed, VIX, overall sentiment)?**
- [ ] Yes
- [ ] No

---

## 5. When and how?

**5.1 When do you want your briefing? (pick all that apply)**
- [ ] Early morning before market opens (6:00 AM ET)
- [ ] Market open (9:30 AM ET)
- [ ] After market close (4:00 PM ET)
- [ ] Evening recap (6:00 PM ET)
- [ ] Other: ________

**5.2 What's your timezone?**
> Example: Eastern, Central, Pacific

**5.3 Anything on weekends?**
- [ ] No, weekdays only
- [ ] Send a weekly recap on Sunday

**5.4 Want alerts for major breaking news outside your regular briefing?**
- [ ] Yes, for big stuff (market halts, emergency Fed moves, etc.)
- [ ] No, just the scheduled emails

---

## 6. Anything else?

**6.1 Any tickers or topics to always exclude?**
> Example: DWAC, penny stocks under $1

**6.2 Anything that should always be included no matter what?**
> Example: any Fed announcement, any stock halt

**6.3 Any other preferences or special requests?**
> Write anything here

---

## How Your Answers Map to the System

Your responses configure the bot automatically:

| Your Answer | What It Controls |
|---|---|
| Tickers (1.1) | Priority watchlist — any mention gets surfaced |
| Sectors (1.2) | Filters non-watchlist stories by sector |
| Asset types (1.3) | Reserved for future multi-asset support (US stocks only for now) |
| Trading style (2.1) | How far ahead the system looks for catalysts |
| Events (2.2) | Boosts ranking of earnings, FOMC, and event-related articles |
| Top 3 news types (3.1) | Priority weighting — top picks get more space |
| Exclusions (3.2) | Hard filter, dropped before ranking |
| Detail level (4.1) | Controls summary length per item |
| Item count (4.2) | Max items per email |
| Delivery times (5.1-5.4) | Email schedule and alert triggers |
| Blacklist/must-include (6.1-6.2) | Override rules applied after all scoring |

**Sensible defaults applied automatically:**
- All watchlist ticker events are included regardless of magnitude
- Duplicate stories are merged into one item
- Sources weighted toward SEC filings, Bloomberg/Reuters, WSJ, company press releases
