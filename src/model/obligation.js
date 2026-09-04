// src/model/obligation.js
//
// Ontology layer. Source of truth: model/ontology.md, model/README.md.
//
// The Obligation is the primary entity. It represents something the user
// believes, expects, or is committed to testing against reality.
//
// This module owns:
//   - Obligation shape + creation validation
//   - the reversible active <-> neglected transition
//   - the permanence rule for confirmed/invalidated
//
// This module deliberately does NOT decide when confirmation or
// invalidation is valid — that judgment belongs to resolution.js, which
// calls the internal `applyResolutionInternal` helper exported here.

export const OBLIGATION_STATUS = Object.freeze({
  ACTIVE: 'active',
  NEGLECTED: 'neglected',
  CONFIRMED: 'confirmed',
  INVALIDATED: 'invalidated',
});

const REQUIRED_FIELDS = ['asset', 'condition', 'mechanism', 'timeframe', 'importance'];

const TERMINAL_STATUSES = new Set([
  OBLIGATION_STATUS.CONFIRMED,
  OBLIGATION_STATUS.INVALIDATED,
]);

let obligationSequence = 0;
function nextId() {
  obligationSequence += 1;
  return `obl_${Date.now().toString(36)}_${obligationSequence}`;
}

export class ObligationValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ObligationValidationError';
    this.field = field;
  }
}

/**
 * Creates a new Obligation.
 *
 * IMPLEMENTATION ASSUMPTION: "the condition must be falsifiable" (ontology.md
 * §2) is a semantic property this module cannot verify from a string alone.
 * It enforces only a structural minimum (a non-trivial descriptive string).
 * Actual falsifiability is the user's responsibility at the point of
 * assertion. See report for why this is a boundary, not a gap.
 */
export function createObligation(input = {}) {
  if (typeof input !== 'object' || input === null) {
    throw new ObligationValidationError('Obligation input must be an object');
  }

  for (const field of REQUIRED_FIELDS) {
    const value = input[field];
    if (value === undefined || value === null || value === '') {
      throw new ObligationValidationError(`Missing required field: ${field}`, field);
    }
  }

  if (typeof input.asset !== 'string' || input.asset.trim() === '') {
    throw new ObligationValidationError('asset must be a non-empty string', 'asset');
  }

  if (typeof input.condition !== 'string' || input.condition.trim().length < 3) {
    throw new ObligationValidationError(
      'condition must be a falsifiable statement (a descriptive, non-empty string)',
      'condition'
    );
  }

  if (typeof input.mechanism !== 'string' || input.mechanism.trim() === '') {
    throw new ObligationValidationError('mechanism must be a non-empty string', 'mechanism');
  }

  if (typeof input.importance !== 'number' || Number.isNaN(input.importance)) {
    throw new ObligationValidationError(
      'importance must be an explicitly asserted number (it is never inferred)',
      'importance'
    );
  }
  if (input.importance < 1 || input.importance > 5) {
    throw new ObligationValidationError('importance must be between 1 and 5', 'importance');
  }

  const timeframe = normalizeTimeframe(input.timeframe);

  const createdAt = input.createdAt ? new Date(input.createdAt) : new Date();
  if (Number.isNaN(createdAt.getTime())) {
    throw new ObligationValidationError('createdAt must be a valid date', 'createdAt');
  }

  return Object.freeze({
    id: input.id || nextId(),
    asset: input.asset.trim(),
    condition: input.condition.trim(),
    mechanism: input.mechanism.trim(),
    timeframe,
    importance: input.importance,
    status: OBLIGATION_STATUS.ACTIVE,
    createdAt: createdAt.toISOString(),
    // Audit trail only. Never used as a source of truth for ranking or
    // resolution — those read `status` and `resolution` directly.
    statusHistory: Object.freeze([
      { status: OBLIGATION_STATUS.ACTIVE, at: createdAt.toISOString(), reason: 'created' },
    ]),
    resolution: null,
  });
}

function normalizeTimeframe(timeframe) {
  if (typeof timeframe === 'string') {
    if (timeframe.trim() === '') {
      throw new ObligationValidationError('timeframe must not be empty', 'timeframe');
    }
    return Object.freeze({ label: timeframe.trim(), expiresAt: null });
  }
  if (typeof timeframe === 'object' && timeframe !== null) {
    const label = typeof timeframe.label === 'string' && timeframe.label.trim() !== ''
      ? timeframe.label.trim()
      : null;
    let expiresAt = null;
    if (timeframe.expiresAt) {
      const d = new Date(timeframe.expiresAt);
      if (Number.isNaN(d.getTime())) {
        throw new ObligationValidationError('timeframe.expiresAt must be a valid date', 'timeframe');
      }
      expiresAt = d.toISOString();
    }
    if (!label && !expiresAt) {
      throw new ObligationValidationError('timeframe must include a label or an expiresAt date', 'timeframe');
    }
    return Object.freeze({ label, expiresAt });
  }
  throw new ObligationValidationError('timeframe must be a string or an object', 'timeframe');
}

export function isTerminal(obligation) {
  return TERMINAL_STATUSES.has(obligation.status);
}

/**
 * Neglected is reversible: active <-> neglected (ontology.md §3).
 * Neglect is a pattern fact about attention, not a truth claim, and must
 * never be applied to a terminal Obligation.
 */
export function markNeglected(obligation, { at = new Date(), reason = 'neglect detected' } = {}) {
  assertNotTerminal(obligation, 'marked neglected');
  if (obligation.status === OBLIGATION_STATUS.NEGLECTED) return obligation;
  return transition(obligation, OBLIGATION_STATUS.NEGLECTED, at, reason);
}

/** Reversal: neglected -> active. Never valid from a terminal state. */
export function markActive(obligation, { at = new Date(), reason = 're-engaged' } = {}) {
  assertNotTerminal(obligation, 'reactivated');
  if (obligation.status === OBLIGATION_STATUS.ACTIVE) return obligation;
  return transition(obligation, OBLIGATION_STATUS.ACTIVE, at, reason);
}

function assertNotTerminal(obligation, attemptedAction) {
  if (isTerminal(obligation)) {
    throw new ObligationValidationError(
      `Cannot be ${attemptedAction}: Obligation is ${obligation.status}, which is permanent`,
      'status'
    );
  }
}

function transition(obligation, status, at, reason) {
  const atIso = new Date(at).toISOString();
  return Object.freeze({
    ...obligation,
    status,
    statusHistory: Object.freeze([...obligation.statusHistory, { status, at: atIso, reason }]),
  });
}

/**
 * Internal seam used only by resolution.js. Not part of the public surface
 * for general callers — obligation.js does not itself judge when
 * confirmation/invalidation is valid.
 */
export function applyResolutionInternal(obligation, { status, resolution, at }) {
  assertNotTerminal(obligation, 'resolved');
  if (status !== OBLIGATION_STATUS.CONFIRMED && status !== OBLIGATION_STATUS.INVALIDATED) {
    throw new ObligationValidationError('Resolution status must be confirmed or invalidated', 'status');
  }
  const atIso = new Date(at).toISOString();
  return Object.freeze({
    ...obligation,
    status,
    statusHistory: Object.freeze([
      ...obligation.statusHistory,
      { status, at: atIso, reason: 'resolved by confrontation' },
    ]),
    resolution: Object.freeze({ ...resolution }),
  });
}
