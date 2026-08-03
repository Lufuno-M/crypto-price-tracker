/**
 * briefing.js
 * Pure functions only — no DOM, no fetch, no storage side-effects.
 * This is the "editorial" boundary: numbers in, facts + interpretable
 * summary out. Keeping this pure means the AI layer can eventually
 * replace buildBriefingText() without touching computeDeltas/rankMovers.
 */

/**
 * Compare current prices against the last stored snapshot.
 * @param {Object[]} currentData - array of {id, name, symbol, current_price}
 * @param {Object|null} previousSnapshot - { [id]: { price, timestamp } } or null on first visit
 * @returns {Object[]} deltas - one entry per coin with since-last-visit change
 */
function computeDeltas(currentData, previousSnapshot) {
  return currentData.map(coin => {
    const prev = previousSnapshot ? previousSnapshot[coin.id] : null;
    const hasPrevious = !!prev && typeof prev.price === "number";
    const changeAbs = hasPrevious ? coin.current_price - prev.price : null;
    const changePct = hasPrevious && prev.price !== 0
      ? (changeAbs / prev.price) * 100
      : null;

    return {
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      price: coin.current_price,
      change24hPct: coin.price_change_percentage_24h_in_currency ?? null,
      change7dPct: coin.price_change_percentage_7d_in_currency ?? null,
      sinceLastVisit: {
        hasPrevious,
        previousPrice: hasPrevious ? prev.price : null,
        previousTimestamp: hasPrevious ? prev.timestamp : null,
        changeAbs,
        changePct
      }
    };
  });
}

/**
 * Rank non-Bitcoin coins by the magnitude of their since-last-visit move.
 * @param {Object[]} deltas - output of computeDeltas
 * @param {number} limit - max movers to return (default 2)
 * @returns {Object[]} movers with a valid previous snapshot, largest |change| first
 */
function rankMovers(deltas, limit = 2) {
  return deltas
    .filter(d => d.id !== "bitcoin" && d.sinceLastVisit.hasPrevious && d.sinceLastVisit.changePct !== null)
    .sort((a, b) => Math.abs(b.sinceLastVisit.changePct) - Math.abs(a.sinceLastVisit.changePct))
    .slice(0, limit);
}

/** Human-readable "X ago" for a timestamp. */
function timeSince(timestampMs) {
  const diffMs = Date.now() - timestampMs;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "moments ago";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatPct(pct) {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function formatUsd(value) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: value < 10 ? 4 : 2 })}`;
}

/**
 * Build the deterministic, template-based briefing text.
 * No invented commentary — every clause traces back to a real number.
 * @param {Object[]} deltas - output of computeDeltas
 * @param {Object[]} movers - output of rankMovers
 * @returns {{headline: string, summary: string, meta: string, isFirstVisit: boolean}}
 */
function buildBriefingText(deltas) {
  const btc = deltas.find(d => d.id === "bitcoin");
  const movers = rankMovers(deltas);
  const isFirstVisit = !btc || !btc.sinceLastVisit.hasPrevious;

  if (isFirstVisit) {
    return {
      headline: "Welcome. This is your first snapshot.",
      summary: "I don't have a prior visit to compare against yet — come back and I'll tell you what changed while you were away.",
      meta: "BRIEFING · FIRST VISIT · DETERMINISTIC",
      isFirstVisit: true
    };
  }

  const btcPct = btc.sinceLastVisit.changePct;
  const btcDir = btcPct >= 0 ? "up" : "down";
  const since = timeSince(btc.sinceLastVisit.previousTimestamp);

  let summary = `Since your last visit ${since}, Bitcoin is ${btcDir} ${formatPct(Math.abs(btcPct)).replace("+", "")} to ${formatUsd(btc.price)}.`;

  if (movers.length > 0) {
    const clauses = movers.map(m => {
      const dir = m.sinceLastVisit.changePct >= 0 ? "up" : "down";
      return `${m.name} is ${dir} ${formatPct(Math.abs(m.sinceLastVisit.changePct)).replace("+", "")}`;
    });
    summary += ` Among the rest of your watchlist, ${clauses.join(", and ")}.`;
  }

  return {
    headline: "Here's what deserves your attention today.",
    summary,
    meta: `BRIEFING · SINCE ${since.toUpperCase()} · DETERMINISTIC`,
    isFirstVisit: false
  };
}

// Exposed for use by main.js (plain script include, no bundler yet)
window.Jarvis = window.Jarvis || {};
Object.assign(window.Jarvis, {
  computeDeltas,
  rankMovers,
  buildBriefingText,
  timeSince,
  formatPct,
  formatUsd
});
