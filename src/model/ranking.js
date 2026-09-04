// src/model/ranking.js
//
// Ranking answers: "given everything currently unresolved, what context
// deserves restoration now?" Source of truth: model/ranking.md.
//
// Ranking NEVER confirms, invalidates, resolves, or changes asserted
// importance (ranking.md §15). It only orders. This module never imports
// resolution.js and never mutates an Obligation.

import { OBLIGATION_STATUS, isTerminal } from './obligation.js';

// IMPLEMENTATION ASSUMPTION: ranking.md describes the restoration-priority
// inputs conceptually (§11) but does not fix numeric weights or a neglect
// threshold. These weights are a starting, tunable point — not a model
// decision. Direct confrontation is deliberately dominant so that a
// contextual hijack (ranking.md §12) can actually occur.
export const RANKING_WEIGHTS = Object.freeze({
  directConfrontation: 100,
  priceGravity: 20,
  pursuit: 15,
  importance: 10, // multiplied by asserted importance (1-5)
  timeframeRelevance: 15,
  neglect: 8,
  evidenceRelevance: 12,
});

// IMPLEMENTATION ASSUMPTION: "meaningful neglect" (ranking.md §6) is not
// numerically defined. Three days is a placeholder threshold below which
// neglect contributes nothing to restoration priority.
const NEGLECT_MEANINGFUL_DAYS = 3;
const NEGLECT_SATURATION_DAYS = 14;
const TIMEFRAME_HORIZON_DAYS = 30;

/**
 * Ranks unresolved Obligations for restoration.
 *
 * @param {object} params
 * @param {object[]} params.obligations
 * @param {object[]} [params.confrontations] - [{ obligationId, strength(0-1) }]
 *   Explicit signals that current market behavior is directly confronting an
 *   Obligation's condition (ranking.md §3). This module does not detect
 *   confrontation from raw price data itself — see report.
 * @param {object[]} [params.priceGravitySignals] - [{ obligationId, relevance(0-1) }]
 * @param {{assetId?: string, obligationId?: string}} [params.pursuit]
 * @param {object[]} [params.evidenceLinks] - [{ obligationId, relevance(0-1) }]
 * @param {Date} [params.now]
 * @returns {{ ranked: object[], history: object[] }}
 */
export function rankObligations(params = {}) {
  const {
    obligations = [],
    confrontations = [],
    priceGravitySignals = [],
    pursuit = {},
    evidenceLinks = [],
    now = new Date(),
  } = params;

  const confrontationById = indexBy(confrontations, 'obligationId');
  const priceGravityById = indexBy(priceGravitySignals, 'obligationId');
  const evidenceRelevanceById = maxRelevanceByObligation(evidenceLinks);

  // ranking.md §6: only active and neglected Obligations compete for
  // restoration. Confirmed/invalidated remain history.
  const candidates = obligations.filter((o) => !isTerminal(o));
  const history = obligations.filter((o) => isTerminal(o));

  const scored = candidates.map((obligation) => {
    const confrontation = confrontationById.get(obligation.id);
    const directConfrontationStrength = confrontation ? clamp01(confrontation.strength ?? 1) : 0;

    const priceGravity = priceGravityById.get(obligation.id);
    const priceGravityRelevance = priceGravity ? clamp01(priceGravity.relevance ?? 0) : 0;

    const isPursued =
      (pursuit.obligationId && pursuit.obligationId === obligation.id) ||
      (pursuit.assetId && pursuit.assetId === obligation.asset);
    const pursuitScore = isPursued ? 1 : 0;

    const timeframeRelevance = computeTimeframeRelevance(obligation, now);

    const neglectDays =
      obligation.status === OBLIGATION_STATUS.NEGLECTED ? daysSince(lastActiveAt(obligation), now) : 0;
    const meaningfulNeglect = neglectDays >= NEGLECT_MEANINGFUL_DAYS;
    const neglectScore = meaningfulNeglect ? clamp01(neglectDays / NEGLECT_SATURATION_DAYS) : 0;

    const evidenceRelevance = clamp01(evidenceRelevanceById.get(obligation.id) ?? 0);

    const breakdown = {
      directConfrontation: round(directConfrontationStrength * RANKING_WEIGHTS.directConfrontation),
      priceGravity: round(priceGravityRelevance * RANKING_WEIGHTS.priceGravity),
      pursuit: round(pursuitScore * RANKING_WEIGHTS.pursuit),
      importance: round(obligation.importance * RANKING_WEIGHTS.importance),
      timeframeRelevance: round(timeframeRelevance * RANKING_WEIGHTS.timeframeRelevance),
      neglect: round(neglectScore * RANKING_WEIGHTS.neglect),
      evidenceRelevance: round(evidenceRelevance * RANKING_WEIGHTS.evidenceRelevance),
    };

    const score = round(Object.values(breakdown).reduce((sum, v) => sum + v, 0));

    return {
      obligationId: obligation.id,
      obligation,
      score,
      breakdown,
      isDirectlyConfronted: directConfrontationStrength > 0,
      isPursued,
    };
  });

  // Stable sort by score descending; ties broken by createdAt (older first —
  // an obligation that has waited longer is not silently buried by one made
  // seconds ago with an identical score).
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(a.obligation.createdAt) - new Date(b.obligation.createdAt);
  });

  const declaredPursuitEntry = scored.find((s) => s.isPursued);

  const ranked = scored.map((entry, index) => {
    // A hijack (ranking.md §12): the top restoration slot is held by a
    // directly-confronted Obligation that is NOT the declared pursuit, while
    // a declared pursuit exists elsewhere in the unresolved set. This flag
    // is purely descriptive of the ranking outcome — it changes nothing
    // about `entry.obligation`.
    const isHijack =
      index === 0 &&
      entry.isDirectlyConfronted &&
      Boolean(declaredPursuitEntry) &&
      declaredPursuitEntry.obligationId !== entry.obligationId;

    return { ...entry, rank: index + 1, isHijack };
  });

  return { ranked, history };
}

function indexBy(list, key) {
  const map = new Map();
  for (const item of list) map.set(item[key], item);
  return map;
}

function maxRelevanceByObligation(evidenceLinks) {
  const map = new Map();
  for (const link of evidenceLinks) {
    const prev = map.get(link.obligationId) ?? 0;
    map.set(link.obligationId, Math.max(prev, clamp01(link.relevance ?? 0)));
  }
  return map;
}

function clamp01(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function round(n) {
  return Math.round(n * 100) / 100;
}

function computeTimeframeRelevance(obligation, now) {
  const expiresAt = obligation.timeframe && obligation.timeframe.expiresAt;
  if (!expiresAt) return 0;
  const daysRemaining = (new Date(expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysRemaining <= 0) return 1;
  if (daysRemaining >= TIMEFRAME_HORIZON_DAYS) return 0;
  return clamp01(1 - daysRemaining / TIMEFRAME_HORIZON_DAYS);
}

function lastActiveAt(obligation) {
  const activeEntries = obligation.statusHistory.filter((h) => h.status === OBLIGATION_STATUS.ACTIVE);
  const last = activeEntries[activeEntries.length - 1];
  return last ? new Date(last.at) : new Date(obligation.createdAt);
}

function daysSince(date, now) {
  return Math.max(0, (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}
