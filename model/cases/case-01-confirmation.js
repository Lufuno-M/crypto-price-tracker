// Case 1 — Confirmation
//
// Scenario: an obligation on EURUSD is confronted by a CPI print that
// confirms the original thesis. This demonstrates the full chain:
// Obligation -> Evidence -> explicit confrontation -> Confirmed.

import assert from 'node:assert/strict';
import { createObligation, OBLIGATION_STATUS } from '../../src/model/obligation.js';
import { createEvidenceObservation, linkObservationToObligation } from '../../src/model/evidence.js';
import { resolveObligation } from '../../src/model/resolution.js';

export default function run() {
  const obligation = createObligation({
    asset: 'EURUSD',
    condition: 'EURUSD trades below 1.0800 within two weeks of the September CPI print',
    mechanism: 'Dual hawkish central-bank divergence plus an unmitigated bearish FVG above price',
    timeframe: { label: 'September CPI cycle', expiresAt: '2026-09-25T00:00:00.000Z' },
    importance: 4,
  });
  assert.equal(obligation.status, OBLIGATION_STATUS.ACTIVE);

  const cpiPrint = createEvidenceObservation({
    observedAt: '2026-09-11T12:30:00.000Z',
    type: 'cpi-release',
    description: 'US CPI printed hotter than expected, reinforcing the hawkish divergence',
    source: 'BLS release',
    data: { headline: 3.4, expected: 3.1 },
  });

  const priceClose = createEvidenceObservation({
    observedAt: '2026-09-18T21:00:00.000Z',
    type: 'price-level',
    description: 'EURUSD closed the daily candle at 1.0762, below the defined level',
    source: 'chart-analysis',
    data: { close: 1.0762 },
  });

  // Topic links are informational only — they don't resolve anything.
  linkObservationToObligation(cpiPrint, obligation.id);
  linkObservationToObligation(priceClose, obligation.id);

  const { obligation: resolved, resolution } = resolveObligation(obligation, {
    evidenceObservationIds: [cpiPrint.id, priceClose.id],
    conditionConfronted: true,
    outcome: 'supports',
    resolvedAt: '2026-09-18T21:05:00.000Z',
    note: 'Condition explicitly confronted by the CPI print and the subsequent close below 1.0800',
  });

  assert.equal(resolved.status, OBLIGATION_STATUS.CONFIRMED);
  assert.equal(resolution.status, OBLIGATION_STATUS.CONFIRMED);
  assert.deepEqual(resolution.evidenceObservationIds, [cpiPrint.id, priceClose.id]);

  console.log('  Obligation:', obligation.condition);
  console.log('  Resolution: CONFIRMED via', resolution.evidenceObservationIds.length, 'evidence observations');
  console.log('  Resolved obligation status:', resolved.status);
}
