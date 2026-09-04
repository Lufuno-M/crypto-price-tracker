// Case 7 — Pursuit versus direct confrontation
//
// Scenario: pursuit alone raises restoration priority, but it must yield to
// a stronger direct confrontation elsewhere, and it must fall back once the
// confrontation is no longer present. This demonstrates that pursuit and
// confrontation are separate ranking inputs, not the same thing.

import assert from 'node:assert/strict';
import { createObligation } from '../../src/model/obligation.js';
import { rankObligations } from '../../src/model/ranking.js';

export default function run() {
  const pursued = createObligation({
    asset: 'DXY',
    condition: 'DXY holds above 101.50 through the week',
    mechanism: 'Primary macro pursuit this week',
    timeframe: 'this week',
    importance: 3,
  });

  const bystander = createObligation({
    asset: 'NZDUSD',
    condition: 'NZDUSD sweeps the prior weekly low before reversing',
    mechanism: 'Liquidity engineering ahead of RBNZ',
    timeframe: 'this week',
    importance: 3,
  });

  // Step 1: pursuit with no confrontation anywhere — pursuit alone should win.
  const step1 = rankObligations({
    obligations: [pursued, bystander],
    pursuit: { obligationId: pursued.id },
  });
  assert.equal(step1.ranked[0].obligationId, pursued.id);
  assert.equal(step1.ranked[0].isHijack, false);

  // Step 2: a strong direct confrontation appears on the bystander — it
  // should now outrank the pursued obligation, and be flagged as a hijack.
  const step2 = rankObligations({
    obligations: [pursued, bystander],
    pursuit: { obligationId: pursued.id },
    confrontations: [{ obligationId: bystander.id, strength: 1 }],
  });
  assert.equal(step2.ranked[0].obligationId, bystander.id);
  assert.equal(step2.ranked[0].isHijack, true);

  // Step 3: the confrontation passes without resolution — ranking reverts,
  // and neither obligation's pursuit/importance/status was rewritten by the
  // earlier hijack.
  const step3 = rankObligations({
    obligations: [pursued, bystander],
    pursuit: { obligationId: pursued.id },
  });
  assert.equal(step3.ranked[0].obligationId, pursued.id);
  assert.equal(pursued.importance, 3);
  assert.equal(bystander.importance, 3);

  console.log('  Step 1 (pursuit only):        top =', step1.ranked[0].obligation.asset);
  console.log('  Step 2 (pursuit + confront.): top =', step2.ranked[0].obligation.asset, '| hijack:', step2.ranked[0].isHijack);
  console.log('  Step 3 (confrontation gone):  top =', step3.ranked[0].obligation.asset, '(reverted)');
}
