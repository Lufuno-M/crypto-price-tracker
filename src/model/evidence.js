// src/model/evidence.js
//
// Evidence Observations record something that happened in the world, or in
// the user's documented market experience. Source of truth: model/ontology.md
// §5-6, model/resolution.md §3.
//
// Hard rule this module exists to protect:
//   Activity != Evidence.  Evidence != Confrontation.  Confrontation != Resolution.
//
// Creating an Evidence Observation, or linking it to an Obligation, NEVER
// changes any Obligation. Only resolution.js can change Obligation status,
// and only when the caller explicitly asserts confrontation (see there).

const REQUIRED_FIELDS = ['observedAt', 'type', 'description', 'source'];

let evidenceSequence = 0;
function nextId() {
  evidenceSequence += 1;
  return `evd_${Date.now().toString(36)}_${evidenceSequence}`;
}

export class EvidenceValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'EvidenceValidationError';
    this.field = field;
  }
}

/**
 * Creates an Evidence Observation.
 *
 * `data` is deliberately free-form (a CPI print, a price level, FVG bounds,
 * a liquidity-sweep description, ...). Its shape depends on `type` and is
 * not validated here — validating domain-specific payloads is out of scope
 * for the model layer per the task brief (no market-data integrations).
 */
export function createEvidenceObservation(input = {}) {
  if (typeof input !== 'object' || input === null) {
    throw new EvidenceValidationError('Evidence input must be an object');
  }

  for (const field of REQUIRED_FIELDS) {
    if (input[field] === undefined || input[field] === null || input[field] === '') {
      throw new EvidenceValidationError(`Missing required field: ${field}`, field);
    }
  }

  const observedAt = new Date(input.observedAt);
  if (Number.isNaN(observedAt.getTime())) {
    throw new EvidenceValidationError('observedAt must be a valid date', 'observedAt');
  }

  if (typeof input.type !== 'string' || input.type.trim() === '') {
    throw new EvidenceValidationError('type must be a non-empty string', 'type');
  }
  if (typeof input.description !== 'string' || input.description.trim() === '') {
    throw new EvidenceValidationError('description must be a non-empty string', 'description');
  }
  if (typeof input.source !== 'string' || input.source.trim() === '') {
    throw new EvidenceValidationError('source must be a non-empty string', 'source');
  }

  return Object.freeze({
    id: input.id || nextId(),
    observedAt: observedAt.toISOString(),
    type: input.type.trim(),
    description: input.description.trim(),
    source: input.source.trim(),
    data: input.data ? Object.freeze({ ...input.data }) : Object.freeze({}),
  });
}

/**
 * A topic link between an Observation and an Obligation (ontology.md §6).
 * This is informational only — it does NOT imply resolving evidence, and it
 * cannot be used by resolution.js as a substitute for explicit
 * evidenceObservationIds on a Resolution.
 */
export function linkObservationToObligation(evidenceObservation, obligationId) {
  if (!evidenceObservation || !evidenceObservation.id) {
    throw new EvidenceValidationError('A valid Evidence Observation is required to link');
  }
  if (!obligationId || typeof obligationId !== 'string') {
    throw new EvidenceValidationError('obligationId is required to link');
  }
  return Object.freeze({
    evidenceObservationId: evidenceObservation.id,
    obligationId,
    linkedAt: new Date().toISOString(),
  });
}
