# MarketBrain Ontology

## 1. Purpose

MarketBrain exists to restore context to the user's relationship with the market.

It does not primarily answer:

> What is the market doing?

It answers:

> What did I believe, what made that belief conditional, what has happened since, and what remains unresolved?

---

## 2. Primary Entity: Obligation

An Obligation is a commitment made by the user about a future market condition.

An Obligation must contain:

- `id`
- `asset`
- `condition`
- `mechanism`
- `timeframe`
- `importance`
- `status`
- `createdAt`

The condition must be falsifiable.

The mechanism explains why the user believes the condition matters.

The timeframe defines when the commitment is relevant.

Importance is explicitly asserted when the Obligation is created.

Importance is not inferred from clicks, attention, frequency of viewing, or recency.

---

## 3. Obligation Status

An Obligation may be:

- `active`
- `neglected`
- `confirmed`
- `invalidated`

### Active

The condition remains unresolved and relevant.

### Neglected

The Obligation remains unresolved but has not received attention.

Neglected is reversible.

Neglect is evidence about the user's relationship to the Obligation, not proof that the Obligation is false.

### Confirmed

The condition has been confronted and the evidence supports the original commitment.

Confirmed is permanent.

### Invalidated

The condition has been confronted and the evidence contradicts the original commitment.

Invalidated is permanent.

---

## 4. Resolution

An Obligation is not resolved merely because:

- time passed
- the user created another trade
- the user looked at the market
- price moved
- the user stopped thinking about it

Resolution requires confrontation with the Obligation's actual condition.

A resolution must reference one or more Evidence Observations.

Therefore:

`resolution -> evidenceObservationIds`

A new Obligation does not resolve an old Obligation unless it explicitly addresses the old Obligation's condition.

---

## 5. Evidence Observation

An Evidence Observation records something that happened in the world or in the user's documented market experience.

Examples:

- CPI release
- central-bank decision
- price reaching a defined level
- liquidity sweep
- macro imbalance being entered
- documented market event

An Evidence Observation can be linked to one or more Obligations.

Evidence is not created merely to make an Obligation easier to resolve.

---

## 6. Observation Links

Observations may be connected to Obligations through topic relationships.

The relationship does not automatically imply resolution.

An Observation becomes resolving evidence only when it actually confronts the condition of the Obligation.

---

## 7. Asset

An Asset is contextual.

Examples:

- BTC
- EURUSD
- AUDUSD
- NZDUSD
- DXY
- US30
- NAS100

The Asset is not the primary unit of meaning.

Multiple Obligations may exist for the same Asset.

The same Asset may therefore contain:

- active Obligations
- neglected Obligations
- confirmed Obligations
- invalidated Obligations

---

## 8. Pursuit

Pursuit represents what the user is currently trying to understand or act upon.

Pursuit is a ranking input.

It does not change:

- whether an Obligation is true
- whether an Obligation is important
- whether an Obligation is confirmed
- whether an Obligation is invalidated

Pursuit influences which context is restored first.

---

## 9. Price Gravity

Price Gravity describes the relationship between:

- macro Imbalances / Fair Value Gaps
- liquidity pools
- recent swing highs and lows
- current price location

Price Gravity is contextual evidence around an Obligation.

It is not itself an Obligation.

A price interaction with an Imbalance or liquidity level may trigger renewed attention, but attention alone does not resolve an Obligation.

---

## 10. Core Principle

MarketBrain is not an information dashboard.

Its fundamental unit is:

`Obligation -> Evidence -> Confrontation -> Resolution`

Its fundamental purpose is:

`restore the right context at the right time`

The interface must remain subordinate to this model.
