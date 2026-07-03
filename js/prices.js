/* ==========================================================================
   PRICES
   Live price fetching, carried over from the original single-file build.
   Not invoked in Sprint 1 (placeholder data is used in the markup instead)
   — this will be wired into .pulse-grid / .watchlist-wrap in Sprint 2.
   ========================================================================== */

const COINS = ["bitcoin", "ethereum", "solana", "binancecoin", "ripple", "cardano"];
const CURRENCY_SYMBOLS = { usd: "$", zar: "R" };

async function fetchCoinPrices(currency = "usd") {
  const ids = COINS.join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${currency}&ids=${ids}`
  );
  if (!res.ok) throw new Error("CoinGecko request failed");
  return res.json();
}

// Sprint 2 will call fetchCoinPrices() and render results into
// .pulse-grid (Market Pulse) and .watchlist-wrap tbody (Watchlist).
