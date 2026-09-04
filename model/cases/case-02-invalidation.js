// Case 2 — Invalidation
//
// Scenario: a BTC obligation is confronted by a liquidity sweep that
// contradicts the original thesis. Demonstrates invalidation and the
// permanence of that state afterward.

import assert from 'node:assert/strict';
import { createObligation, OBLIGATION_STATUS, markActive } from '../../src/model/obligation.js';
import { createEvidenceObservation } from '../../src/model/evidence.js';
import { resolveObligation, ResolutionValidationError } from '../../src/model/resolution.js';

export default function run() {
  const obligation = createObligation({
    asset: 'BTCUSD',
    condition: 'BTCUSD holds above 58,000 as demand-side support through end of month',
    mechanism: 'Reclaimed daily order block with prior liquidity sweep beneath it',
    timeframe: { label: 'end of month', expiresAt: '2026-09-30T00:00:00.000Z' },
    importance: 3,
  });

  const sweep = createEvidenceObservation({
    observedAt: '2026-09-10T04:00:00.000Z',
    type: 'liquidity-sweep',
    description: 'Price swept below 58,000 and continued lower without reclaiming the level',
    source: 'chart-analysis',
    data: { low: 55800 },
  });

  const { obligation: resolved, resolution } = resolveObligation(obligation, {
    evidenceObservationIds: [sweep.id],
    conditionConfronted: true,
    outcome: 'contradicts',
    resolvedAt: '2026-09-10T04:05:00.000Z',
    note: 'The 58,000 level was swept and not reclaimed — the original condition is no longer viable',
  });

  assert.equal(resolved.status, OBLIGATION_STATUS.INVALIDATED);
  assert.equal(resolution.status, OBLIGATION_STATUS.INVALIDATED);

  // Invalidated is permanent — even an explicit reactivation attempt fails.
  assert.throws(() => markActive(resolved), (err) => err.name === 'ObligationValidationError');

  // And it cannot be resolved a second time, even with contradicting evidence again.
  assert.throws(
    () =>
      resolveObligation(resolved, {
        evidenceObservationIds: [sweep.id],
        conditionConfronted: true,
        outcome: 'supports',
      }),
    ResolutionValidationError
  );

  console.log('  Obligation:', obligation.condition);
  console.log('  Resolution: INVALIDATED via', resolution.evidenceObservationIds.length, 'evidence observation(s)');
  console.log('  Permanence confirmed: reactivation and re-resolution both rejected');
}
