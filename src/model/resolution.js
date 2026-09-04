// src/model/resolution.js
//
// Resolution is confrontation, not activity. Source of truth:
// model/resolution.md.
//
//   condition confronted + supporting evidence    + explicit association + condition satisfied     = confirmed
//   condition confronted + contradicting evidence  + explicit association + condition no longer viable = invalidated
//
// IMPLEMENTATION ASSUMPTION (flagged in the report): whether a given
// Evidence Observation actually "confronts" an Obligation's condition, and
// whether it supports or contradicts that condition, is a semantic
// judgment about market meaning. A model layer with no market-data
// integration and no NLP cannot compute that judgment from the Evidence
// Observation's `data` field alone. This module therefore requires the
// caller to explicitly assert both:
//   - conditionConfronted: true
//   - outcome: 'supports' | 'contradicts'
// What this module DOES enforce, mechanically, is everything resolution.md
// actually specifies as structural: non-empty evidence references,
// permanence of terminal states, and the refusal to let a bare status flip
// stand in for resolution.

import { OBLIGATION_STATUS, isTerminal, applyResolutionInternal } from './obligation.js';

export class ResolutionValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ResolutionValidationError';
    this.field = field;
  }
}

/**
 * Attempts to resolve an Obligation by confrontation.
 *
 * @param {object} obligation
 * @param {object} params
 * @param {string[]} params.evidenceObservationIds - required, non-empty.
 * @param {boolean} params.conditionConfronted - explicit assertion that the
 *   Obligation's condition has actually been tested (resolution.md §4).
 * @param {'supports'|'contradicts'} params.outcome
 * @param {Date|string} [params.resolvedAt]
 * @param {string} [params.note]
 * @returns {{ obligation: object, resolution: object }}
 */
export function resolveObligation(obligation, params = {}) {
  if (!obligation || typeof obligation !== 'object') {
    throw new ResolutionValidationError('A valid Obligation is required');
  }

  if (isTerminal(obligation)) {
    throw new ResolutionValidationError(
      `Obligation is already ${obligation.status}; ${obligation.status} is permanent and cannot be re-resolved`,
      'status'
    );
  }

  const { evidenceObservationIds, conditionConfronted, outcome, resolvedAt, note } = params;

  if (!Array.isArray(evidenceObservationIds) || evidenceObservationIds.length === 0) {
    throw new ResolutionValidationError(
      'evidenceObservationIds must be a non-empty array — resolution requires explicit evidence references',
      'evidenceObservationIds'
    );
  }
  if (evidenceObservationIds.some((id) => !id || typeof id !== 'string')) {
    throw new ResolutionValidationError('evidenceObservationIds must contain valid string ids', 'evidenceObservationIds');
  }

  if (conditionConfronted !== true) {
    throw new ResolutionValidationError(
      'Resolution requires explicit confrontation — evidence without confrontation cannot resolve an Obligation',
      'conditionConfronted'
    );
  }

  if (outcome !== 'supports' && outcome !== 'contradicts') {
    throw new ResolutionValidationError("outcome must be 'supports' or 'contradicts'", 'outcome');
  }

  const status = outcome === 'supports' ? OBLIGATION_STATUS.CONFIRMED : OBLIGATION_STATUS.INVALIDATED;
  const at = resolvedAt ? new Date(resolvedAt) : new Date();
  if (Number.isNaN(at.getTime())) {
    throw new ResolutionValidationError('resolvedAt must be a valid date', 'resolvedAt');
  }

  const resolutionRecord = Object.freeze({
    obligationId: obligation.id,
    status,
    resolvedAt: at.toISOString(),
    evidenceObservationIds: Object.freeze([...evidenceObservationIds]),
    note: note ? String(note) : null,
  });

  const resolvedObligation = applyResolutionInternal(obligation, {
    status,
    resolution: resolutionRecord,
    at,
  });

  return { obligation: resolvedObligation, resolution: resolutionRecord };
}

/**
 * Records evidence that bears on an Obligation WITHOUT resolving it
 * (resolution.md: "Partial evidence can strengthen or weaken an Obligation
 * without resolving it"). This function can never change obligation.status —
 * it returns an annotation record only, and the caller must not treat its
 * output as a Resolution.
 */
export function recordPartialEvidence(obligation, { evidenceObservationIds, note } = {}) {
  if (!obligation || typeof obligation !== 'object') {
    throw new ResolutionValidationError('A valid Obligation is required');
  }
  if (!Array.isArray(evidenceObservationIds) || evidenceObservationIds.length === 0) {
    throw new ResolutionValidationError('evidenceObservationIds must be a non-empty array', 'evidenceObservationIds');
  }
  return Object.freeze({
    obligationId: obligation.id,
    evidenceObservationIds: Object.freeze([...evidenceObservationIds]),
    note: note ? String(note) : null,
    recordedAt: new Date().toISOString(),
    resolves: false,
  });
}
