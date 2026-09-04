// Case 4 — Neglected but unresolved
//
// Scenario: an obligation sits unattended for a period of time and is
// marked neglected. Neglect is reversible and never implies resolution,
// truth, or increased importance on its own.

import assert from 'node:assert/strict';
import { createObligation, markNeglected, markActive, OBLIGATION_STATUS } from '../../src/model/obligation.js';
import { rankObligations } from '../../src/model/ranking.js';

export default function run() {
  let obligation = createObligation({
    asset: 'AUDUSD',
    condition: 'AUDUSD reclaims 0.6600 as support after the RBA decision',
    mechanism: 'Post-decision liquidity grab followed by reclaim of the prior range low',
    timeframe: 'this quarter',
    importance: 2,
    createdAt: '2026-08-01T00:00:00.000Z',
  });
  const originalImportance = obligation.importance;

  obligation = markNeglected(obligation, { at: '2026-08-15T00:00:00.000Z', reason: 'no reconciliation opportunity engaged' });
  assert.equal(obligation.status, OBLIGATION_STATUS.NEGLECTED);
  assert.equal(obligation.importance, originalImportance); // neglect does not inflate importance

  const { ranked } = rankObligations({ obligations: [obligation], now: new Date('2026-09-04T00:00:00.000Z') });
  assert.ok(ranked[0].breakdown.neglect > 0, 'meaningful neglect should contribute to restoration score');

  // Neglect is reversible.
  obligation = markActive(obligation, { at: '2026-09-04T00:00:00.000Z', reason: 're-engaged by the user' });
  assert.equal(obligation.status, OBLIGATION_STATUS.ACTIVE);

  console.log('  Obligation:', obligation.condition);
  console.log('  Went active -> neglected -> active. Importance unchanged at', obligation.importance);
  console.log('  Status history length:', obligation.statusHistory.length);
}
