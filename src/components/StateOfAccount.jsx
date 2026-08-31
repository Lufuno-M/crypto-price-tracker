import {
  ThesisState,
  getAccountNeglectStatus,
  obligationsNeedingReconciliation,
  obligationsOpen,
  obligationsResolved,
} from "../model/obligation";

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const RESOLVED_LABEL = {
  [ThesisState.CONFIRMED]: "Confirmed",
  [ThesisState.INVALIDATED]: "Invalidated",
  [ThesisState.WITHDRAWN]: "Withdrawn",
};

function ObligationRow({ obligation, reconciliation }) {
  return (
    <div className="py-5 border-b border-(--color-rule) last:border-b-0">
      <div className="flex items-baseline justify-between gap-6">
        <p className="text-[15px] leading-snug text-(--color-ink)">{obligation.claim}</p>
        <span className="shrink-0 text-xs text-(--color-ink-faint)">{obligation.asset}</span>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-(--color-ink-muted)">{obligation.mechanism}</p>

      {reconciliation ? (
        <div className="mt-3 flex items-start gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-attention)" />
          <p className="text-[13px] leading-relaxed text-(--color-attention)">{reconciliation.description}</p>
        </div>
      ) : (
        <p className="mt-2 text-[12px] text-(--color-ink-faint)">
          {obligation.condition} · opened {formatDate(obligation.createdAt)}
        </p>
      )}
    </div>
  );
}

function ResolvedRow({ obligation }) {
  return (
    <div className="py-3 border-b border-(--color-rule) last:border-b-0 flex items-baseline justify-between gap-6">
      <p className="text-[14px] text-(--color-ink-muted)">{obligation.claim}</p>
      <span className="shrink-0 text-xs text-(--color-ink-faint)">
        {RESOLVED_LABEL[obligation.state]} · {formatDate(obligation.stateHistory.at(-1).changedAt)}
      </span>
    </div>
  );
}

export default function StateOfAccount({ obligations }) {
  const needsReconciliation = obligationsNeedingReconciliation(obligations);
  const open = obligationsOpen(obligations);
  const resolved = obligationsResolved(obligations).slice(0, 4);
  const neglect = getAccountNeglectStatus(obligations);

  return (
    <div className="min-h-screen bg-(--color-paper)">
      <div className="mx-auto max-w-[640px] px-6 pt-16 pb-32">
        <p className="text-[13px] text-(--color-ink-faint)">MarketBrain</p>

        <h1 className="mt-8 font-(family-name:--font-display) text-[26px] leading-snug text-(--color-ink)">
          What relationship with reality currently requires your attention?
        </h1>

        {neglect.neglected && (
          <p className="mt-4 text-[13px] text-(--color-ink-muted)">
            {neglect.unengagedCount} reconciliation opportunities have gone unanswered. That's a pattern, not a
            single missed moment.
          </p>
        )}

        {needsReconciliation.length > 0 && (
          <section className="mt-12">
            <h2 className="text-[13px] text-(--color-ink-muted)">Needs reconciliation</h2>
            <div className="mt-2">
              {needsReconciliation.map((o) => {
                const opp = o.reconciliationOpportunities.find((r) => !r.engaged);
                return <ObligationRow key={o.id} obligation={o} reconciliation={opp} />;
              })}
            </div>
          </section>
        )}

        {open.length > 0 && (
          <section className="mt-12">
            <h2 className="text-[13px] text-(--color-ink-muted)">Open</h2>
            <div className="mt-2">
              {open.map((o) => (
                <ObligationRow key={o.id} obligation={o} reconciliation={null} />
              ))}
            </div>
          </section>
        )}

        {resolved.length > 0 && (
          <section className="mt-12">
            <h2 className="text-[13px] text-(--color-ink-muted)">Recently resolved</h2>
            <div className="mt-2">
              {resolved.map((o) => (
                <ResolvedRow key={o.id} obligation={o} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
