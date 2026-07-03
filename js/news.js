/* ==========================================================================
   NEWS
   Live news fetching, carried over from the original single-file build.
   Not invoked in Sprint 1 (placeholder items are used in the markup
   instead) — this will be wired into .news-list in Sprint 2.
   ========================================================================== */

async function fetchWorldNews() {
  const feedUrl = encodeURIComponent("http://feeds.bbci.co.uk/news/world/rss.xml");
  const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${feedUrl}`);
  if (!res.ok) throw new Error("News request failed");
  const data = await res.json();
  return data.items.slice(0, 10);
}

// Sprint 2 will call fetchWorldNews() and render results into .news-list,
// replacing the placeholder <li> items in index.html.
