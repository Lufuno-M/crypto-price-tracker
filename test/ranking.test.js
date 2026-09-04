import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createObligation, markNeglected, OBLIGATION_STATUS } from '../src/model/obligation.js';
import { resolveObligation } from '../src/model/resolution.js';
import { createEvidenceObservation } from '../src/model/evidence.js';
import { rankObligations } from '../src/model/ranking.js';

function makeObligation(overrides = {}) {
  return createObligation({
    asset: 'EURUSD',
    condition: 'Price closes below 1.0800 on the daily timeframe',
    mechanism: 'Unmitigated bearish FVG plus dual hawkish CB divergence',
    timeframe: 'next FOMC cycle',
    importance: 3,
    ...overrides,
  });
}

// 16. Relevant evidence can affect restoration ranking.
test('relevant evidence increases restoration score', () => {
  const a = makeObligation({ asset: 'EURUSD' });
  const b = makeObligation({ asset: 'GBPUSD' });

  const { ranked: withoutEvidence } = rankObligations({ obligations: [a, b] });
  const scoreBefore = withoutEvidence.find((r) => r.obligationId === a.id).score;

  const { ranked: withEvidence } = rankObligations({
    obligations: [a, b],
    evidenceLinks: [{ obligationId: a.id, relevance: 0.9 }],
  });
  const scoreAfter = withEvidence.find((r) => r.obligationId === a.id).score;

  assert.ok(scoreAfter > scoreBefore);
});

// 17. Pursuit can affect restoration ranking without changing truth.
test('pursuit raises ranking score without altering importance, status, or history', () => {
  const a = makeObligation({ asset: 'EURUSD', importance: 3 });
  const before = { ...a };

  const { ranked } = rankObligations({
    obligations: [a],
    pursuit: { assetId: 'EURUSD' },
  });

  assert.ok(ranked[0].breakdown.pursuit > 0);
  // Nothing about the Obligation itself changed.
  assert.equal(a.importance, before.importance);
  assert.equal(a.status, before.status);
  assert.deepEqual(a.statusHistory, before.statusHistory);
});

// 18. Direct confrontation can hijack restoration priority.
// 19. A hijack does not change Obligation status.
test('a lower-importance, non-pursued obligation can hijack the top slot under direct confrontation', () => {
  const primary = makeObligation({ asset: 'EURUSD', importance: 5 }); // high importance, declared pursuit
  const other = makeObligation({ asset: 'BTCUSD', importance: 2 }); // low importance, not pursued

  const { ranked } = rankObligations({
    obligations: [primary, other],
    pursuit: { assetId: 'EURUSD', obligationId: primary.id },
    confrontations: [{ obligationId: other.id, strength: 1 }],
  });

  assert.equal(ranked[0].obligationId, other.id);
  assert.equal(ranked[0].isHijack, true);
  // The hijacked obligation's own state is untouched.
  assert.equal(other.status, OBLIGATION_STATUS.ACTIVE);
  assert.equal(other.importance, 2);
});

test('without a declared pursuit elsewhere, high confrontation is not flagged as a hijack', () => {
  const only = makeObligation({ importance: 2 });
  const { ranked } = rankObligations({
    obligations: [only],
    confrontations: [{ obligationId: only.id, strength: 1 }],
  });
  assert.equal(ranked[0].isHijack, false);
});

test('when confrontation passes, ranking reverts to ordinary priority (hijack is not sticky)', () => {
  const primary = makeObligation({ asset: 'EURUSD', importance: 5 });
  const other = makeObligation({ asset: 'BTCUSD', importance: 2 });

  const hijacked = rankObligations({
    obligations: [primary, other],
    pursuit: { obligationId: primary.id },
    confrontations: [{ obligationId: other.id, strength: 1 }],
  });
  assert.equal(hijacked.ranked[0].obligationId, other.id);

  // No confrontation this time round.
  const normal = rankObligations({
    obligations: [primary, other],
    pursuit: { obligationId: primary.id },
  });
  assert.equal(normal.ranked[0].obligationId, primary.id);
  assert.equal(normal.ranked[0].isHijack, false);
});

// 20. Ranking cannot itself resolve an Obligation.
test('ranking never changes any obligation status, even for confronted or neglected obligations', () => {
  let neglected = makeObligation({ importance: 1 });
  neglected = markNeglected(neglected);
  const confronted = makeObligation({ importance: 5 });

  const before = [neglected.status, confronted.status];

  rankObligations({
    obligations: [neglected, confronted],
    confrontations: [{ obligationId: confronted.id, strength: 1 }],
  });

  assert.equal(neglected.status, before[0]);
  assert.equal(confronted.status, before[1]);
});

test('confirmed and invalidated obligations are excluded from the ranked candidate list', () => {
  const obligation = makeObligation();
  const evidence = createEvidenceObservation({
    observedAt: '2026-09-03T12:30:00.000Z',
    type: 'price-level',
    description: 'Closed below the level',
    source: 'chart-analysis',
  });
  const { obligation: resolved } = resolveObligation(obligation, {
    evidenceObservationIds: [evidence.id],
    conditionConfronted: true,
    outcome: 'supports',
  });

  const active = makeObligation({ asset: 'GBPUSD' });
  const { ranked, history } = rankObligations({ obligations: [resolved, active] });

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].obligationId, active.id);
  assert.equal(history.length, 1);
  assert.equal(history[0].id, resolved.id);
});

test('meaningful neglect increases score; fresh neglect barely does', () => {
  const now = new Date('2026-09-04T00:00:00.000Z');
  let staleNeglect = makeObligation({ createdAt: '2026-08-01T00:00:00.000Z' });
  staleNeglect = markNeglected(staleNeglect, { at: '2026-08-10T00:00:00.000Z' });

  let freshNeglect = makeObligation({ createdAt: '2026-09-03T00:00:00.000Z' });
  freshNeglect = markNeglected(freshNeglect, { at: '2026-09-03T23:00:00.000Z' });

  const { ranked } = rankObligations({ obligations: [staleNeglect, freshNeglect], now });
  const staleEntry = ranked.find((r) => r.obligationId === staleNeglect.id);
  const freshEntry = ranked.find((r) => r.obligationId === freshNeglect.id);

  assert.ok(staleEntry.breakdown.neglect > freshEntry.breakdown.neglect);
});

test('importance alone still orders candidates with no other signals', () => {
  const high = makeObligation({ asset: 'EURUSD', importance: 5 });
  const low = makeObligation({ asset: 'GBPUSD', importance: 1 });
  const { ranked } = rankObligations({ obligations: [high, low] });
  assert.equal(ranked[0].obligationId, high.id);
});
