// Case 6 — New obligation does not resolve old obligation
//
// Scenario: the user opens a new, unrelated (and even a related-but-not-
// confronting) obligation on the same asset. Neither creation resolves the
// prior obligation. Only an explicit resolution referencing evidence that
// actually confronts the old obligation's condition can do that.

import assert from 'node:assert/strict';
import { createObligation, OBLIGATION_STATUS } from '../../src/model/obligation.js';
import { createEvidenceObservation } from '../../src/model/evidence.js';
import { resolveObligation } from '../../src/model/resolution.js';

export default function run() {
  const oldObligation = createObligation({
    asset: 'GBPUSD',
    condition: 'GBPUSD breaks and closes below 1.2600',
    mechanism: 'Bearish continuation from the weekly order block',
    timeframe: 'this month',
    importance: 3,
  });

  // The user opens a brand-new obligation on the same asset — a fresh trade
  // idea, not a statement about the old one.
  const newObligation = createObligation({
    asset: 'GBPUSD',
    condition: 'GBPUSD reclaims 1.2750 intraday after the London open',
    mechanism: 'Short-term liquidity reclaim, unrelated to the monthly bearish thesis',
    timeframe: 'today',
    importance: 2,
  });

  assert.notEqual(oldObligation.id, newObligation.id);
  assert.equal(oldObligation.status, OBLIGATION_STATUS.ACTIVE, 'creating a new obligation must not touch the old one');

  // Even evidence that happens to relate to GBPUSD does not resolve the old
  // obligation unless it is explicitly cited as confronting IT, by id.
  const unrelatedEvent = createEvidenceObservation({
    observedAt: '2026-09-04T09:00:00.000Z',
    type: 'price-level',
    description: 'GBPUSD reclaimed 1.2750 intraday, confirming the NEW obligation',
    source: 'chart-analysis',
  });

  const { obligation: resolvedNew } = resolveObligation(newObligation, {
    evidenceObservationIds: [unrelatedEvent.id],
    conditionConfronted: true,
    outcome: 'supports',
  });

  assert.equal(resolvedNew.status, OBLIGATION_STATUS.CONFIRMED);
  // The old obligation is completely unaffected by resolving the new one.
  assert.equal(oldObligation.status, OBLIGATION_STATUS.ACTIVE);

  console.log('  Old obligation:', oldObligation.condition, '| status:', oldObligation.status);
  console.log('  New obligation:', newObligation.condition, '| status after resolution:', resolvedNew.status);
  console.log('  Resolving the new obligation left the old obligation status unchanged.');
}
