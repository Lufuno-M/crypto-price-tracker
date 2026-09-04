// Runs every case in model/cases/ sequentially and reports pass/fail.
// Usage: npm run cases   (or: node model/cases/run-all.js)

import case01 from './case-01-confirmation.js';
import case02 from './case-02-invalidation.js';
import case03 from './case-03-partial-evidence.js';
import case04 from './case-04-neglected.js';
import case05 from './case-05-contextual-hijack.js';
import case06 from './case-06-new-obligation-does-not-resolve-old.js';
import case07 from './case-07-pursuit-vs-confrontation.js';

const cases = [
  ['Case 1 — Confirmation', case01],
  ['Case 2 — Invalidation', case02],
  ['Case 3 — Partial evidence', case03],
  ['Case 4 — Neglected but unresolved', case04],
  ['Case 5 — Contextual hijack', case05],
  ['Case 6 — New obligation does not resolve old obligation', case06],
  ['Case 7 — Pursuit versus direct confrontation', case07],
];

let failures = 0;

for (const [name, fn] of cases) {
  console.log(`\n${name}`);
  try {
    fn();
    console.log('  \u2713 passed');
  } catch (err) {
    failures += 1;
    console.error('  \u2717 FAILED:', err.message);
  }
}

console.log(`\n${cases.length - failures}/${cases.length} cases passed.`);
if (failures > 0) process.exit(1);
