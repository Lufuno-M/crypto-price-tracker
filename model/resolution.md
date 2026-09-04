# MarketBrain Resolution Mechanics

## 1. Resolution Is Confrontation

An Obligation changes from unresolved to resolved only when its defining condition is confronted by relevant evidence.

The system must distinguish:

- activity
- observation
- confrontation
- resolution

These are not interchangeable.

---

## 2. Activity Is Not Resolution

The following do not resolve an Obligation by themselves:

- opening a new trade
- closing a trade
- viewing an Obligation
- editing an Obligation
- creating another Obligation
- reading news
- observing price movement without relation to the condition
- allowing time to pass
- manually marking something as resolved without evidence

Activity may change attention.

It does not establish truth.

---

## 3. Evidence

A resolving event must be represented by an Evidence Observation.

An Evidence Observation should contain:

- `id`
- `observedAt`
- `type`
- `description`
- `source`
- relevant market/context data

Examples:

- CPI publication
- central-bank decision
- price reaching a defined level
- liquidity sweep
- entry into a defined macro imbalance
- other observable market event

---

## 4. Confrontation

An Evidence Observation confronts an Obligation when it directly bears on the Obligation's defining condition.

A relationship such as:

`Observation -> Obligation`

does not automatically mean:

`Observation -> Resolution`

The system must determine whether the Observation actually tests the condition.

---

## 5. Confirmation

An Obligation becomes `confirmed` only when:

1. its condition has been confronted;
2. the relevant Evidence Observation supports the expected outcome;
3. the evidence is explicitly associated with the resolution;
4. the original condition is satisfied.

Formally:

`condition confronted + supporting evidence + condition satisfied = confirmed`

---

## 6. Invalidation

An Obligation becomes `invalidated` only when:

1. its condition has been confronted;
2. the relevant Evidence Observation contradicts the expected outcome;
3. the evidence is explicitly associated with the resolution;
4. the original condition is no longer viable under the Obligation's stated rules.

Formally:

`condition confronted + contradicting evidence + invalidation condition satisfied = invalidated`

---

## 7. Evidence References Are Required

A resolution must contain explicit evidence references.

Conceptually:

```text
Resolution
├── obligationId
├── status
├── resolvedAt
└── evidenceObservationIds[]
