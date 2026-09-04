// Case 3 — Partial evidence
//
// Scenario: price is approaching a defined level but hasn't confronted it
// yet. This is recorded as partial evidence — it can strengthen or weaken
// the obligation contextually, but it must never resolve it.

import assert from 'node:assert/strict';
import { createObligation, OBLIGATION_STATUS } from '../../src/model/obligation.js';
import { createEvidenceObservation } from '../../src/model/evidence.js';
import { recordPartialEvidence, resolveObligation, ResolutionValidationError } from '../../src/model/resolution.js';

export default function run() {
  const obligation = createObligation({
    asset: 'NAS100',
    condition: 'NAS100 fills the daily FVG at 19,400-19,550 before making a new high',
    mechanism: 'Unmitigated imbalance left behind by the last impulsive leg up',
    timeframe: 'next 3 weeks',
    importance: 3,
  });

  const approach = createEvidenceObservation({
    observedAt: '2026-09-04T15:00:00.000Z',
    type: 'price-approach',
    description: 'Price has pulled back to 19,620, approaching but not yet inside the FVG',
    source: 'chart-analysis',
    data: { current: 19620, zoneHigh: 19550 },
  });

  const record = recordPartialEvidence(obligation, {
    evidenceObservationIds: [approach.id],
    note: 'Approaching the zone — not yet a confrontation of the condition',
  });

  assert.equal(record.resolves, false);
  assert.equal(obligation.status, OBLIGATION_STATUS.ACTIVE);

  // Attempting to resolve directly from partial evidence must fail, since
  // conditionConfronted was never explicitly asserted.
  assert.throws(
    () =>
      resolveObligation(obligation, {
        evidenceObservationIds: [approach.id],
        outcome: 'supports',
      }),
    ResolutionValidationError
  );

  console.log('  Obligation:', obligation.condition);
  console.log('  Partial evidence recorded:', record.note);
  console.log('  Obligation status remains:', obligation.status);
}
