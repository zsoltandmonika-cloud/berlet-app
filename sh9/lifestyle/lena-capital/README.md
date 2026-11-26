# Léna Capital — paper-only pilot v1

## Status
- Isolated SHO Lifestyle candidate. No live brokerage orders, wallet, subscriptions, or payment API.
- 100,000 HUF virtual opening capital; 90 calendar days from the first successful private run.
- The public HTML page starts blank except for the virtual starting capital. Real market results are never committed to this public repository. Import a private JSON snapshot to view it locally; no automatic sync or remote STOP yet.
- This is a deterministic baseline, not a trained predictive AI model. No LLM calls or paid AI API.
- Crypto Lab stays parked on its separate branch.

## Data and private execution
Use a free Alpaca **Paper Only** account and Basic IEX data credentials (not live account keys). No deposits are needed for the proposed setup. See https://docs.alpaca.markets/us/docs/about-market-data-api and https://docs.alpaca.markets/us/reference/stockbars. Confirm the applicable market data terms; no republication of market data or private snapshots. ECB reference exchange rates: https://www.ecb.europa.eu/stats/euro-exchange-rates/html/index.en.html.

Node.js 20+ is required. Set APCA_API_KEY_ID and APCA_API_SECRET_KEY in a private process environment, never in chat, code, browser, public repository, or workflow logs. Run `node run-private.mjs` from this directory. A private runner must execute once each day before 09:30 New York time; the proposed schedule is 06:15 UTC daily. The file defaults to ~/.lena-capital/state.json and must not be committed or made publicly accessible. Open the dashboard and import that file. The schedule and private authenticated sync are NOT installed by this release candidate.

A successful real data call and private scheduling must be verified before starting the 90-day experiment. The engine skips duplicate dates and pauses rather than creating retrospective trades when a session is missed. Provider outages may require manual investigation; do not reset the ledger to hide a loss.

## Frozen baseline
- US ETF universe SPY, QQQ, IWM; Europe deferred until an appropriately licensed data feed is available. Rank positive 20-session price momentum among instruments above their 50-session moving average. Hold one qualifying ETF with at most 50% of initial available cash at entry; otherwise USD cash. No leverage or shorts. A position can drift beyond 50% as prices change.
- Record a signal before the next session's 09:30 New York open, model a fill at the next observed IEX opening price, and value daily at closing prices. Fractional shares assumed. Fees/slippage proxy: 0.2% plus USD 0.50 per order; FX conversion 0.25% each way. Cash remains USD, exposed to currency movements.
- Compare with a buy-and-hold SPY price-return benchmark using the same starting capital, timing, fee proxy and ECB USD/HUF valuation. Dividends, corporate actions, cash interest, and tax not modelled; an unusual price move or invalid data blocks updates. IEX is not consolidated SIP and these are simulated fills, not attainable-price guarantees.
- 5% peak-to-close drawdown triggers a next-open exit and locks new strategy entries. It is not a guaranteed loss ceiling. At 90 calendar days the strategy and benchmark exit at the next available simulated opening; actual observation days may differ.
- Strategy parameters are frozen for the pilot. A later AI-assisted variant must have a separate ledger and predeclared rules, with no retrospective parameter tuning.

## Verification
Synthetic fixture checks in development passed for initial no-trade state, momentum choice, next-session strategy and benchmark trades, nonnegative cash, missed-session pause and rejecting invalid data. No real credentials or market data were used. Physical S24 Ultra viewport, end-to-end data connectivity and private scheduled run remain unverified. No release to main yet.
