import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createObligation, OBLIGATION_STATUS, markNeglected } from '../src/model/obligation.js';
import { createEvidenceObservation } from '../src/model/evidence.js';
import { resolveObligation, recordPartialEvidence, ResolutionValidationError } from '../src/model/resolution.js';

function freshObligation(overrides = {}) {
  return createObligation({
    asset: 'EURUSD',
    condition: 'Price closes below 1.0800 on the daily timeframe',
    mechanism: 'Unmitigated bearish FVG plus dual hawkish CB divergence',
    timeframe: 'next FOMC cycle',
    importance: 4,
    ...overrides,
  });
}

function freshEvidence(overrides = {}) {
  return createEvidenceObservation({
    observedAt: '2026-09-03T12:30:00.000Z',
    type: 'price-level',
    description: 'Daily candle closed at 1.0795',
    source: 'chart-analysis',
    ...overrides,
  });
}

// 4. Activity cannot resolve an Obligation.
test('activity alone (no evidence, no confrontation) cannot resolve an Obligation', () => {
  const obligation = freshObligation();
  assert.throws(() => resolveObligation(obligation, {}), ResolutionValidationError);
});

// 5. Evidence without confrontation cannot resolve an Obligation.
test('evidence references without an explicit confrontation assertion cannot resolve', () => {
  const obligation = freshObligation();
  const evidence = freshEvidence();
  assert.throws(
    () =>
      resolveObligation(obligation, {
        evidenceObservationIds: [evidence.id],
        outcome: 'supports',
        // conditionConfronted intentionally omitted
      }),
    ResolutionValidationError
  );
});

// 6. Confrontation without evidence cannot resolve an Obligation.
test('confrontation without any evidence references cannot resolve', () => {
  const obligation = freshObligation();
  assert.throws(
    () =>
      resolveObligation(obligation, {
        evidenceObservationIds: [],
        conditionConfronted: true,
        outcome: 'supports',
      }),
    ResolutionValidationError
  );
});

// 7. Confirmation requires supporting evidence.
test('confirmation requires confrontation + supporting evidence + explicit ids', () => {
  const obligation = freshObligation();
  const evidence = freshEvidence();
  const { obligation: resolved, resolution } = resolveObligation(obligation, {
    evidenceObservationIds: [evidence.id],
    conditionConfronted: true,
    outcome: 'supports',
  });
  assert.equal(resolved.status, OBLIGATION_STATUS.CONFIRMED);
  assert.equal(resolution.status, OBLIGATION_STATUS.CONFIRMED);
  assert.deepEqual(resolution.evidenceObservationIds, [evidence.id]);
});

// 8. Invalidation requires contradicting evidence.
test('invalidation requires confrontation + contradicting evidence + explicit ids', () => {
  const obligation = freshObligation();
  const evidence = freshEvidence({ description: 'Daily candle closed at 1.0850, well above the level' });
  const { obligation: resolved, resolution } = resolveObligation(obligation, {
    evidenceObservationIds: [evidence.id],
    conditionConfronted: true,
    outcome: 'contradicts',
  });
  assert.equal(resolved.status, OBLIGATION_STATUS.INVALIDATED);
  assert.equal(resolution.status, OBLIGATION_STATUS.INVALIDATED);
});

// 9. Resolution requires explicit evidenceObservationIds.
test('resolution without evidenceObservationIds at all is rejected', () => {
  const obligation = freshObligation();
  assert.throws(
    () => resolveObligation(obligation, { conditionConfronted: true, outcome: 'supports' }),
    ResolutionValidationError
  );
});

// 10. An empty evidenceObservationIds array is rejected.
test('an empty evidenceObservationIds array is rejected', () => {
  const obligation = freshObligation();
  assert.throws(
    () =>
      resolveObligation(obligation, {
        evidenceObservationIds: [],
        conditionConfronted: true,
        outcome: 'supports',
      }),
    ResolutionValidationError
  );
});

// 11. Partial evidence leaves the Obligation unresolved.
test('partial evidence is recorded but never changes obligation status', () => {
  const obligation = freshObligation();
  const evidence = freshEvidence();
  const record = recordPartialEvidence(obligation, {
    evidenceObservationIds: [evidence.id],
    note: 'Price approaching the level but has not closed yet',
  });
  assert.equal(record.resolves, false);
  assert.equal(obligation.status, OBLIGATION_STATUS.ACTIVE); // unchanged, obligation is immutable anyway
});

test('a neglected obligation can still be resolved by confrontation', () => {
  let obligation = freshObligation();
  obligation = markNeglected(obligation);
  const evidence = freshEvidence();
  const { obligation: resolved } = resolveObligation(obligation, {
    evidenceObservationIds: [evidence.id],
    conditionConfronted: true,
    outcome: 'supports',
  });
  assert.equal(resolved.status, OBLIGATION_STATUS.CONFIRMED);
});

test('an already-resolved obligation cannot be resolved a second time', () => {
  const obligation = freshObligation();
  const evidence = freshEvidence();
  const { obligation: resolved } = resolveObligation(obligation, {
    evidenceObservationIds: [evidence.id],
    conditionConfronted: true,
    outcome: 'supports',
  });
  assert.throws(
    () =>
      resolveObligation(resolved, {
        evidenceObservationIds: [evidence.id],
        conditionConfronted: true,
        outcome: 'contradicts',
      }),
    ResolutionValidationError
  );
});

test('outcome must be supports or contradicts, not an arbitrary string', () => {
  const obligation = freshObligation();
  const evidence = freshEvidence();
  assert.throws(
    () =>
      resolveObligation(obligation, {
        evidenceObservationIds: [evidence.id],
        conditionConfronted: true,
        outcome: 'maybe',
      }),
    ResolutionValidationError
  );
});
