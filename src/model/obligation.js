/**
 * MarketBrain — Obligation Model
 * ------------------------------------------------------------------
 * The primary entity is not an asset. It's an obligation: a claim
 * about reality that a person has made, which reality can eventually
 * confront.
 *
 * "BTC looks strong today" is an input — a passing observation with
 * no shape reality can push against. It never becomes an Obligation.
 *
 * "BTC breaks above $120k, and I believe it signals continuation
 * because institutional flows are accelerating" is a commitment.
 * It has a CONDITION (something reality can eventually satisfy or
 * refuse) and a MECHANISM (the reasoning that makes the condition
 * meaningful, not just a coin-flip). That's what qualifies it.
 *
 * Two axes run through this model, and they never collapse into
 * each other:
 *
 *   1. The THESIS axis — Confirmed / Invalidated / Evidence Required
 *      / Withdrawn. These are facts about the claim's relationship
 *      to reality. Only a confrontation with reality can move this
 *      axis. Changing your mind does not.
 *
 *   2. The ACCOUNT axis — Neglect. This is a fact about the person's
 *      relationship to their own obligations, not about whether any
 *      given thesis was right. It is derived across the whole
 *      account, not stored on a single obligation.
 */

// ---------------------------------------------------------------
// Thesis states
// ---------------------------------------------------------------

export const ThesisState = Object.freeze({
  OPEN: "open", // condition not yet met, no confrontation due
  EVIDENCE_REQUIRED: "evidence_required", // trigger fired, mechanism unproven
  CONFIRMED: "confirmed", // reality vindicated the mechanism, not just the trigger
  INVALIDATED: "invalidated", // reality contradicted the claim
  WITHDRAWN: "withdrawn", // explicitly closed by the account holder, not by reality
});

// ---------------------------------------------------------------
// Reconciliation opportunities
// ---------------------------------------------------------------
// A reconciliation opportunity is the system detecting that a
// confrontation may be due. It never resolves anything on its own —
// it only surfaces the moment. Three ways one can arise:

export const ReconciliationType = Object.freeze({
  TRIGGER_FIRED: "trigger_fired", // the stated condition was met
  EVIDENCE_ARRIVED: "evidence_arrived", // new information bears on the mechanism
  STRUCTURAL_DRIFT: "structural_drift", // accumulated change makes the mechanism worth re-asking
});

/**
 * @typedef {Object} ReconciliationOpportunity
 * @property {string} id
 * @property {string} type - ReconciliationType
 * @property {string} description - what was detected, in plain language
 * @property {string} detectedAt - ISO date
 * @property {boolean} engaged - whether the account holder has responded
 * @property {string|null} engagedAt - ISO date, or null
 * @property {string|null} resultingState - the ThesisState it led to, if any
 */

/**
 * @typedef {Object} Obligation
 * @property {string} id
 * @property {string} asset - e.g. "BTC"
 * @property {string} claim - the belief statement, in the account holder's words
 * @property {string} condition - the falsifiable trigger, e.g. "Price closes above $120,000"
 * @property {string} mechanism - the reasoning that makes the claim meaningful
 * @property {string} createdAt - ISO date
 * @property {string} state - ThesisState
 * @property {Array<{state: string, changedAt: string, reason: string}>} stateHistory
 * @property {ReconciliationOpportunity[]} reconciliationOpportunities
 */

/**
 * Creates a new obligation in the OPEN state. This is the only way
 * an obligation is born — there is no "draft" or "observation" that
 * silently upgrades into one. The condition and mechanism are
 * required; without both, this isn't an obligation, it's an input.
 */
export function createObligation({ asset, claim, condition, mechanism, createdAt = new Date().toISOString() }) {
  if (!condition || !mechanism) {
    throw new Error(
      "An obligation requires both a condition (what reality must do) and a mechanism (why it would mean something). Without both, this is an observation, not a commitment."
    );
  }
  return {
    id: crypto.randomUUID(),
    asset,
    claim,
    condition,
    mechanism,
    createdAt,
    state: ThesisState.OPEN,
    stateHistory: [{ state: ThesisState.OPEN, changedAt: createdAt, reason: "Created" }],
    reconciliationOpportunities: [],
  };
}

/**
 * Attaches a reconciliation opportunity to an obligation. This is
 * the system saying "a confrontation may be due" — it does not
 * change the obligation's state. Only the account holder's
 * engagement with this opportunity can do that.
 */
export function detectReconciliation(obligation, { type, description, detectedAt = new Date().toISOString() }) {
  const opportunity = {
    id: crypto.randomUUID(),
    type,
    description,
    detectedAt,
    engaged: false,
    engagedAt: null,
    resultingState: null,
  };
  return {
    ...obligation,
    reconciliationOpportunities: [...obligation.reconciliationOpportunities, opportunity],
  };
}

/**
 * The account holder engages with a reconciliation opportunity.
 * This is the only path by which state can change — and even here,
 * the state that results is the account holder's honest read of
 * whether reality confronted the *mechanism*, not just whether the
 * *trigger* fired. A trigger firing without engagement should
 * usually resolve to EVIDENCE_REQUIRED, not straight to CONFIRMED —
 * the price crossing a level confirms the trigger, not the reasoning.
 */
export function reconcile(obligation, opportunityId, { resultingState, reason, engagedAt = new Date().toISOString() }) {
  const opportunities = obligation.reconciliationOpportunities.map((o) =>
    o.id === opportunityId ? { ...o, engaged: true, engagedAt, resultingState } : o
  );
  return {
    ...obligation,
    state: resultingState,
    stateHistory: [...obligation.stateHistory, { state: resultingState, changedAt: engagedAt, reason }],
    reconciliationOpportunities: opportunities,
  };
}

// ---------------------------------------------------------------
// Account-level neglect (derived, never stored per-obligation)
// ---------------------------------------------------------------

const NEGLECT_THRESHOLD = 2; // consecutive unengaged opportunities across the account before it's a pattern, not a busy week

/**
 * Neglect is not "this obligation is old." Age and dormancy are
 * judgments about the obligation's relationship to reality, which
 * this system isn't qualified to make — a thesis can sit untouched
 * for years and still be alive. Neglect is a judgment about the
 * account holder's relationship to opportunities they were actually
 * given. It only exists where a reconciliation opportunity was
 * detected and repeatedly not engaged with.
 *
 * Returns the current neglect status for the whole account, plus
 * which obligations are carrying the unengaged opportunities.
 */
export function getAccountNeglectStatus(obligations) {
  const unengaged = [];
  for (const obligation of obligations) {
    for (const opp of obligation.reconciliationOpportunities) {
      if (!opp.engaged) {
        unengaged.push({ obligationId: obligation.id, opportunity: opp });
      }
    }
  }
  // Sort oldest-detected first — a pattern is measured from when the
  // opportunities started piling up, not from the most recent one.
  unengaged.sort((a, b) => new Date(a.opportunity.detectedAt) - new Date(b.opportunity.detectedAt));

  return {
    neglected: unengaged.length >= NEGLECT_THRESHOLD,
    unengagedCount: unengaged.length,
    unengaged,
  };
}

/**
 * Obligations that currently have at least one unengaged
 * reconciliation opportunity — these are what belongs in "Needs
 * reconciliation." This is the only place urgency should be
 * computed from something the system detected, not something it
 * decided.
 */
export function obligationsNeedingReconciliation(obligations) {
  return obligations.filter((o) => o.reconciliationOpportunities.some((opp) => !opp.engaged));
}

export function obligationsOpen(obligations) {
  return obligations.filter(
    (o) => o.state === ThesisState.OPEN && !o.reconciliationOpportunities.some((opp) => !opp.engaged)
  );
}

export function obligationsResolved(obligations) {
  return obligations.filter((o) =>
    [ThesisState.CONFIRMED, ThesisState.INVALIDATED, ThesisState.WITHDRAWN].includes(o.state)
  );
}
