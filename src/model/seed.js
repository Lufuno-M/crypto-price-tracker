import { createObligation, detectReconciliation, reconcile, ThesisState, ReconciliationType } from "./obligation";

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

let o1 = createObligation({
  asset: "BTC",
  claim: "Breaking above $120k signals continuation, not a local top.",
  condition: "Price closes a daily candle above $120,000",
  mechanism: "Institutional flows have been accelerating for three weeks — this isn't retail-led.",
  createdAt: daysAgo(9),
});
o1 = detectReconciliation(o1, {
  type: ReconciliationType.TRIGGER_FIRED,
  description: "BTC closed at $121,340 on Aug 29 — the stated condition was met.",
  detectedAt: daysAgo(2),
});

let o2 = createObligation({
  asset: "BTC",
  claim: "A break below $95k would mean the institutional thesis is dead, not just paused.",
  condition: "Price closes below $95,000",
  mechanism: "Below that level, the flows I was tracking would have to have reversed, not just slowed.",
  createdAt: daysAgo(24),
});

let o3 = createObligation({
  asset: "ETH",
  claim: "ETH underperforming BTC through this leg confirms rotation is delayed, not cancelled.",
  condition: "ETH/BTC ratio holds its range for another 4 weeks without breaking down",
  mechanism: "Staking yield compression takes time to show up in relative flows.",
  createdAt: daysAgo(40),
});
o3 = detectReconciliation(o3, {
  type: ReconciliationType.EVIDENCE_ARRIVED,
  description: "ETH/BTC broke the lower bound of the range on Aug 24.",
  detectedAt: daysAgo(6),
});
o3 = reconcile(o3, o3.reconciliationOpportunities[0].id, {
  resultingState: ThesisState.INVALIDATED,
  reason: "Range broke down before the 4-week window — the mechanism didn't hold.",
});

let o4 = createObligation({
  asset: "BTC",
  claim: "A calm summer means the next move will be violent, not another grind.",
  condition: "Realized volatility stays compressed through end of September",
  mechanism: "Compression this tight has preceded sharp breaks in three of the last four cycles.",
  createdAt: daysAgo(60),
});

export const seedObligations = [o1, o2, o3, o4];
