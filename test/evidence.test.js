import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEvidenceObservation,
  linkObservationToObligation,
  EvidenceValidationError,
} from '../src/model/evidence.js';

const validInput = {
  observedAt: '2026-09-03T12:30:00.000Z',
  type: 'macro-imbalance-entry',
  description: 'Price entered the unmitigated daily FVG at 1.0850-1.0870',
  source: 'chart-analysis',
  data: { low: 1.085, high: 1.087 },
};

// 3. Evidence can be recorded.
test('an Evidence Observation can be recorded', () => {
  const evidence = createEvidenceObservation(validInput);
  assert.ok(evidence.id);
  assert.equal(evidence.type, 'macro-imbalance-entry');
  assert.equal(evidence.data.low, 1.085);
});

test('missing required evidence fields are rejected', () => {
  for (const field of ['observedAt', 'type', 'description', 'source']) {
    const bad = { ...validInput, [field]: undefined };
    assert.throws(() => createEvidenceObservation(bad), EvidenceValidationError, `missing ${field} should throw`);
  }
});

test('invalid observedAt is rejected', () => {
  assert.throws(() => createEvidenceObservation({ ...validInput, observedAt: 'not-a-date' }), EvidenceValidationError);
});

test('a topic link between evidence and an obligation is purely informational', () => {
  const evidence = createEvidenceObservation(validInput);
  const link = linkObservationToObligation(evidence, 'obl_123');
  assert.equal(link.evidenceObservationId, evidence.id);
  assert.equal(link.obligationId, 'obl_123');
  // The link itself carries no resolving power — it has no status field at all.
  assert.equal('status' in link, false);
});
