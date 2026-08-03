/**
 * main.js
 * Fetch + storage + render. Depends on briefing.js (window.Jarvis.*) for
 * all the deterministic logic — this file just moves data into the DOM.
 */

const WATCHLIST = [
  { id: "bitcoin", elId: "bitcoin" },
  { id: "ethereum", elId: "ethereum" },
  { id: "solana", elId: "solana" },
  { id: "ripple", elId: "ripple" }
];

const SNAPSHOT_KEY = "jarvis:lastVisitSnapshot";
const NEWS_FEED = "http://feeds.bbci.co.uk/news/world/rss.xml";

function readSnapshot() {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("Jarvis: couldn't read snapshot", e);
    return null;
  }
}

function writeSnapshot(currentData) {
  const snapshot = {};
  currentData.forEach(coin => {
    snapshot[coin.id] = { price: coin.current_price, timestamp: Date.now() };
  });
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.warn("Jarvis: couldn't write snapshot", e);
  }
}

async function fetchPrices() {
  const ids = WATCHLIST.map(c => c.id).join(",");
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h,7d`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko request failed: ${res.status}`);
  return res.json();
}

async function fetchNews() {
  const feedUrl = encodeURIComponent(NEWS_FEED);
  const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${feedUrl}`);
  if (!res.ok) throw new Error(`News request failed: ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

// ---------- Rendering ----------

function renderHero(btcDelta, briefing) {
  const priceEl = document.querySelector(".hero-price");
  const badgeEl = document.querySelector(".hero-stats .badge");
  const labelEl = document.querySelector(".hero-stats .hero-stat-label");
  const summaryEl = document.querySelector(".hero-summary");
  const metaEl = document.querySelector(".hero-summary-meta");

  if (priceEl) priceEl.textContent = window.Jarvis.formatUsd(btcDelta.price);

  if (labelEl) labelEl.textContent = "BTC / USD";

  if (badgeEl) {
    if (btcDelta.sinceLastVisit.hasPrevious) {
      const pct = btcDelta.sinceLastVisit.changePct;
      const up = pct >= 0;
      badgeEl.className = `badge ${up ? "badge-positive" : "badge-negative"}`;
      badgeEl.textContent = `${up ? "↗" : "↘"} ${window.Jarvis.formatPct(pct)}`;
      const badgeLabel = badgeEl.closest("div").previousElementSibling;
    } else {
      badgeEl.className = "badge badge-neutral";
      badgeEl.textContent = "First visit";
    }
  }
  // Relabel "24H Change" -> "Since Last Visit" — this is the actual
  // differentiator for Jarvis, so the label should say what it means.
  const statBlocks = document.querySelectorAll(".hero-stats > div");
  if (statBlocks[1]) {
    const label = statBlocks[1].querySelector(".hero-stat-label");
    if (label) label.textContent = "Since Last Visit";
  }

  if (summaryEl) summaryEl.textContent = `"${briefing.summary}"`;
  if (metaEl) metaEl.textContent = briefing.meta;
}

function pulseCardMarkup(delta) {
  const hasPrev = delta.sinceLastVisit.hasPrevious;
  const pct = hasPrev ? delta.sinceLastVisit.changePct : delta.change24hPct;
  const up = pct >= 0;
  const label = hasPrev ? "" : " (24h)"; // fall back to 24h label only if no snapshot yet
  return `
    <div class="pulse-card-top">
      <span class="pulse-name">${delta.name}</span>
      <span class="asset-symbol">${delta.symbol.toUpperCase()}</span>
    </div>
    <div class="pulse-price tabular">${window.Jarvis.formatUsd(delta.price)}</div>
    <span class="data-callout ${up ? "up" : "down"}"><span class="arrow">${up ? "↗" : "↘"}</span> ${window.Jarvis.formatPct(pct)}${label}</span>
  `;
}

function renderPulse(deltas) {
  const grid = document.querySelector(".pulse-grid");
  if (!grid) return;
  grid.innerHTML = "";
  deltas.forEach(delta => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = pulseCardMarkup(delta);
    grid.appendChild(card);
  });
}

function renderWatchlist(deltas) {
  const tbody = document.querySelector(".table tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  deltas.forEach(delta => {
    const up24 = (delta.change24hPct ?? 0) >= 0;
    const up7d = (delta.change7dPct ?? 0) >= 0;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div class="asset-cell">
          <span>${delta.name}</span>
          <span class="asset-symbol">${delta.symbol.toUpperCase()}</span>
        </div>
      </td>
      <td class="tabular">${window.Jarvis.formatUsd(delta.price)}</td>
      <td><span class="data-callout ${up24 ? "up" : "down"}">${up24 ? "↗" : "↘"} ${delta.change24hPct != null ? window.Jarvis.formatPct(delta.change24hPct) : "—"}</span></td>
      <td><span class="data-callout ${up7d ? "up" : "down"}">${up7d ? "↗" : "↘"} ${delta.change7dPct != null ? window.Jarvis.formatPct(delta.change7dPct) : "—"}</span></td>
      <td><span class="badge badge-neutral">Not yet scored</span></td>
    `;
    tbody.appendChild(row);
  });
}

function renderNews(items) {
  const list = document.querySelector(".news-list");
  if (!list) return;
  list.innerHTML = "";
  items.slice(0, 6).forEach(item => {
    const date = new Date(item.pubDate);
    const li = document.createElement("li");
    li.className = "news-item";
    li.style.cursor = "pointer";
    li.addEventListener("click", () => window.open(item.link, "_blank", "noopener,noreferrer"));
    li.innerHTML = `
      <div>
        <div class="news-title">${item.title}</div>
        <div class="news-meta">BBC WORLD · ${window.Jarvis.timeSince(date.getTime()).toUpperCase()}</div>
      </div>
      <span class="news-arrow">↗</span>
    `;
    list.appendChild(li);
  });
}

// ---------- Orchestration ----------

async function init() {
  const previousSnapshot = readSnapshot();

  try {
    const prices = await fetchPrices();
    const deltas = window.Jarvis.computeDeltas(prices, previousSnapshot);
    const btcDelta = deltas.find(d => d.id === "bitcoin");
    const briefing = window.Jarvis.buildBriefingText(deltas);

    renderHero(btcDelta, briefing);
    renderPulse(deltas);
    renderWatchlist(deltas);

    // Persist AFTER computing deltas, so this visit becomes the baseline
    // for the *next* one — never overwrite before comparing.
    writeSnapshot(prices);
  } catch (err) {
    console.error("Jarvis: price load failed", err);
    const summaryEl = document.querySelector(".hero-summary");
    if (summaryEl) summaryEl.textContent = "Prices are unavailable right now — CoinGecko may be rate-limited. Try refreshing shortly.";
  }

  try {
    const items = await fetchNews();
    renderNews(items);
  } catch (err) {
    console.error("Jarvis: news load failed", err);
  }
}

document.addEventListener("DOMContentLoaded", init);
