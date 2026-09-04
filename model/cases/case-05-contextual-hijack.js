// Case 5 — Contextual hijack
//
// Scenario, directly from ranking.md §12: Obligation A has high importance
// and is the user's primary pursuit, but its condition is not currently
// being approached. Obligation B has lower importance, but current price
// enters its defined FVG. B temporarily becomes the restoration priority —
// without becoming more true, more important, or changing status.

import assert from 'node:assert/strict';
import { createObligation, OBLIGATION_STATUS } from '../../src/model/obligation.js';
import { rankObligations } from '../../src/model/ranking.js';

export default function run() {
  const obligationA = createObligation({
    asset: 'EURUSD',
    condition: 'EURUSD trades below 1.0800 within two weeks of CPI',
    mechanism: 'Dual hawkish divergence',
    timeframe: 'CPI cycle',
    importance: 5,
  });

  const obligationB = createObligation({
    asset: 'US30',
    condition: 'US30 fills the daily FVG at 41,200-41,400',
    mechanism: 'Unmitigated imbalance from the last impulsive leg',
    timeframe: 'this month',
    importance: 2,
  });

  const beforeA = { importance: obligationA.importance, status: obligationA.status };
  const beforeB = { importance: obligationB.importance, status: obligationB.status };

  const { ranked } = rankObligations({
    obligations: [obligationA, obligationB],
    pursuit: { obligationId: obligationA.id, assetId: obligationA.asset },
    // Price has just entered B's FVG — direct confrontation.
    confrontations: [{ obligationId: obligationB.id, strength: 1 }],
  });

  assert.equal(ranked[0].obligationId, obligationB.id, 'B should hold the top restoration slot');
  assert.equal(ranked[0].isHijack, true);

  // Nothing about either Obligation's truth, importance, or status changed.
  assert.equal(obligationA.importance, beforeA.importance);
  assert.equal(obligationA.status, beforeA.status);
  assert.equal(obligationB.importance, beforeB.importance);
  assert.equal(obligationB.status, beforeB.status);
  assert.equal(obligationB.status, OBLIGATION_STATUS.ACTIVE);

  console.log('  Pursuit:', obligationA.asset, '(importance', obligationA.importance + ')');
  console.log('  Direct confrontation on:', obligationB.asset, '(importance', obligationB.importance + ')');
  console.log('  Restoration priority #1:', ranked[0].obligation.asset, '| isHijack:', ranked[0].isHijack);
  console.log('  Neither Obligation\'s importance or status changed as a result.');
}
