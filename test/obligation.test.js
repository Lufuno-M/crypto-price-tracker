import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createObligation,
  markNeglected,
  markActive,
  applyResolutionInternal,
  ObligationValidationError,
  OBLIGATION_STATUS,
} from '../src/model/obligation.js';

const validInput = {
  asset: 'EURUSD',
  condition: 'Price closes below 1.0800 on the daily timeframe',
  mechanism: 'Unmitigated bearish FVG above current price plus dual hawkish CB divergence',
  timeframe: { label: 'next FOMC cycle', expiresAt: '2026-10-01T00:00:00.000Z' },
  importance: 4,
};

// 1. An Obligation can be created.
test('an Obligation can be created with valid fields', () => {
  const obligation = createObligation(validInput);
  assert.equal(obligation.asset, 'EURUSD');
  assert.equal(obligation.status, OBLIGATION_STATUS.ACTIVE);
  assert.equal(obligation.resolution, null);
  assert.ok(obligation.id);
  assert.ok(obligation.createdAt);
  assert.equal(obligation.statusHistory.length, 1);
});

// 2. Invalid/missing required Obligation data is rejected.
test('missing required fields are rejected', () => {
  for (const field of ['asset', 'condition', 'mechanism', 'timeframe', 'importance']) {
    const bad = { ...validInput, [field]: undefined };
    assert.throws(() => createObligation(bad), ObligationValidationError, `missing ${field} should throw`);
  }
});

test('importance must be an explicit number in range, never inferred', () => {
  assert.throws(() => createObligation({ ...validInput, importance: 'high' }), ObligationValidationError);
  assert.throws(() => createObligation({ ...validInput, importance: 0 }), ObligationValidationError);
  assert.throws(() => createObligation({ ...validInput, importance: 6 }), ObligationValidationError);
});

test('condition must be a substantive falsifiable statement', () => {
  assert.throws(() => createObligation({ ...validInput, condition: 'x' }), ObligationValidationError);
  assert.throws(() => createObligation({ ...validInput, condition: '' }), ObligationValidationError);
});

test('timeframe accepts a plain string label', () => {
  const obligation = createObligation({ ...validInput, timeframe: 'this week' });
  assert.equal(obligation.timeframe.label, 'this week');
  assert.equal(obligation.timeframe.expiresAt, null);
});

// 12. Neglected can return to active.
test('neglected is reversible: active -> neglected -> active', () => {
  let obligation = createObligation(validInput);
  obligation = markNeglected(obligation);
  assert.equal(obligation.status, OBLIGATION_STATUS.NEGLECTED);
  obligation = markActive(obligation);
  assert.equal(obligation.status, OBLIGATION_STATUS.ACTIVE);
  // both transitions recorded, nothing silently lost
  assert.equal(obligation.statusHistory.length, 3);
});

// 13. Confirmed cannot return to active.
test('confirmed is permanent — cannot reactivate or re-neglect', () => {
  let obligation = createObligation(validInput);
  obligation = applyResolutionInternal(obligation, {
    status: OBLIGATION_STATUS.CONFIRMED,
    resolution: { obligationId: obligation.id, status: 'confirmed', evidenceObservationIds: ['evd_1'] },
    at: new Date(),
  });
  assert.equal(obligation.status, OBLIGATION_STATUS.CONFIRMED);
  assert.throws(() => markActive(obligation), ObligationValidationError);
  assert.throws(() => markNeglected(obligation), ObligationValidationError);
});

// 14. Invalidated cannot return to active.
test('invalidated is permanent — cannot reactivate or re-neglect', () => {
  let obligation = createObligation(validInput);
  obligation = applyResolutionInternal(obligation, {
    status: OBLIGATION_STATUS.INVALIDATED,
    resolution: { obligationId: obligation.id, status: 'invalidated', evidenceObservationIds: ['evd_1'] },
    at: new Date(),
  });
  assert.equal(obligation.status, OBLIGATION_STATUS.INVALIDATED);
  assert.throws(() => markActive(obligation), ObligationValidationError);
  assert.throws(() => markNeglected(obligation), ObligationValidationError);
});

// 15. Creating a new Obligation does not resolve an old one.
test('creating a new Obligation never touches an existing one', () => {
  const original = createObligation(validInput);
  const another = createObligation({ ...validInput, asset: 'GBPUSD', condition: 'A different, unrelated condition' });
  assert.notEqual(original.id, another.id);
  assert.equal(original.status, OBLIGATION_STATUS.ACTIVE);
});

test('an already-terminal Obligation cannot be resolved again', () => {
  let obligation = createObligation(validInput);
  obligation = applyResolutionInternal(obligation, {
    status: OBLIGATION_STATUS.CONFIRMED,
    resolution: { obligationId: obligation.id, status: 'confirmed', evidenceObservationIds: ['evd_1'] },
    at: new Date(),
  });
  assert.throws(
    () =>
      applyResolutionInternal(obligation, {
        status: OBLIGATION_STATUS.INVALIDATED,
        resolution: { obligationId: obligation.id, status: 'invalidated', evidenceObservationIds: ['evd_2'] },
        at: new Date(),
      }),
    ObligationValidationError
  );
});
