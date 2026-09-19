import type { Claim, ConsistencyCheck, ConsistencyProfile } from "@shared/contracts";
import { cx } from "@/lib/cx";
import { askNext, KIND_LABEL, OUTCOMES, OUTCOME_META, personChecks } from "@/lib/consistency";
import { InfoTip } from "./InfoTip";
import { OutcomeBadge } from "./OutcomeBadge";

// Source-consistency dossier. It sits beside the interview statuses and never
// replaces them: a conflict here is a question for the recruiter, and the
// counts are coverage of what was checked, not a rating of the person.
export function ConsistencyPanel({
  profile,
  claims,
  printView = false,
}: {
  profile: ConsistencyProfile | null | undefined;
  claims: Claim[];
  printView?: boolean;
}) {
  const muted = cx("text-sm text-slate-500", !printView && "dark:text-slate-400");
  const card = cx(
    "rounded-lg border border-slate-200 bg-white p-4 shadow-sm print:shadow-none",
    !printView && "dark:border-slate-800 dark:bg-slate-900",
  );

  if (!profile || profile.checks.length === 0) {
    return (
      <section aria-labelledby="consistency-heading" className={card}>
        <Heading printView={printView} />
        <p className={cx("mt-2", muted)}>
          No source checks were run for this report. Statuses above describe the interview only.
        </p>
      </section>
    );
  }

  const questions = askNext(profile);
  const person = personChecks(profile);
  const claimChecks = claims
    .map((claim) => ({ claim, checks: profile.checks.filter((c) => c.claim_id === claim.id) }))
    .filter((group) => group.checks.length > 0);

  return (
    <section aria-labelledby="consistency-heading" className={cx(card, "space-y-4 print:break-inside-avoid")}>
      <Heading printView={printView} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {OUTCOMES.map((outcome) => (
          <div
            key={outcome}
            className={cx(
              "rounded-md border border-slate-200 px-3 py-2",
              !printView && "dark:border-slate-800",
            )}
          >
            <div className="flex items-baseline gap-1.5">
              <span className={cx("text-xl font-semibold text-slate-900", !printView && "dark:text-slate-100")}>
                {profile.coverage[outcome] ?? 0}
              </span>
              <span className={cx("text-xs font-medium text-slate-700", !printView && "dark:text-slate-300")}>
                {OUTCOME_META[outcome].label}
              </span>
              {!printView && (
                <span className="self-center">
                  <InfoTip label={OUTCOME_META[outcome].label} text={OUTCOME_META[outcome].meaning} />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className={cx("text-xs text-slate-600", !printView && "dark:text-slate-400")}>
        Counts show what was checked and what each source showed. They are not a candidate score, and
        &ldquo;aligned&rdquo; does not prove authorship or verify a degree.
      </p>

      <div>
        <h3 className={cx("text-xs font-semibold uppercase tracking-wide text-slate-500", !printView && "dark:text-slate-400")}>
          Ask next
        </h3>
        {questions.length === 0 ? (
          <p className={cx("mt-1", muted)}>Every check aligned. No source-driven questions remain.</p>
        ) : (
          <ol className="mt-1.5 space-y-2">
            {questions.map((item) => (
              <li
                key={item.question}
                className={cx(
                  "flex flex-wrap items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-900",
                  !printView && "dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-100",
                )}
              >
                <OutcomeBadge outcome={item.outcome} printView={printView} />
                <span className="min-w-0 flex-1">
                  <span className={cx("mr-1.5 text-xs font-medium text-slate-500", !printView && "dark:text-slate-400")}>
                    {KIND_LABEL[item.kind]}
                    {item.claim_id ? ` · ${claims.find((c) => c.id === item.claim_id)?.statement ?? item.claim_id}` : ""}
                  </span>
                  <span className="block">{item.question}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <details className="group" open={printView}>
        <summary className={cx("cursor-pointer text-sm font-medium text-slate-700", !printView && "dark:text-slate-300", "print:hidden")}>
          All checks ({profile.checks.length})
        </summary>
        <div className="mt-3 space-y-4">
          {person.length > 0 && (
            <CheckGroup title="About the person" checks={person} printView={printView} />
          )}
          {claimChecks.map(({ claim, checks }) => (
            <CheckGroup key={claim.id} title={claim.statement} checks={checks} printView={printView} />
          ))}
        </div>
      </details>
    </section>
  );
}

function Heading({ printView }: { printView: boolean }) {
  return (
    <div>
      <h2 id="consistency-heading" className={cx("text-lg font-semibold text-slate-900", !printView && "dark:text-slate-100")}>
        Source consistency
      </h2>
      <p className={cx("text-sm text-slate-600", !printView && "dark:text-slate-400")}>
        What public and stored records line up with the application, what conflicts, and what to ask.
      </p>
    </div>
  );
}

function CheckGroup({ title, checks, printView }: { title: string; checks: ConsistencyCheck[]; printView: boolean }) {
  return (
    <div>
      <h4 className={cx("mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500", !printView && "dark:text-slate-400")}>
        {title}
      </h4>
      <ul className="space-y-2">
        {checks.map((check) => (
          <li
            key={check.id}
            data-record-id={check.id}
            className={cx(
              "rounded-md border border-slate-200 bg-slate-50 p-3 text-sm",
              !printView && "dark:border-slate-800 dark:bg-slate-800/60",
            )}
          >
            <div className={cx("flex flex-wrap items-center gap-2 text-xs text-slate-500", !printView && "dark:text-slate-400")}>
              <OutcomeBadge outcome={check.outcome} printView={printView} />
              <span className={cx("font-medium text-slate-700", !printView && "dark:text-slate-300")}>{KIND_LABEL[check.kind]}</span>
              <span>·</span>
              <span>{check.source_label}</span>
              <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                {check.mode}
              </span>
              {check.source_url && (
                <a
                  href={check.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className={cx("text-sky-700 underline underline-offset-2", !printView && "dark:text-sky-400")}
                >
                  Open source
                </a>
              )}
            </div>
            <p className={cx("mt-1.5 text-slate-900", !printView && "dark:text-slate-100")}>{check.summary}</p>
            {check.excerpt && (
              <p className={cx("mt-1.5 border-l-2 border-slate-300 pl-3 text-xs italic text-slate-700", !printView && "dark:border-slate-700 dark:text-slate-300")}>
                &ldquo;{check.excerpt}&rdquo;
              </p>
            )}
            <p className={cx("mt-1.5 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900", !printView && "dark:bg-amber-950/50 dark:text-amber-200")}>
              <span className="font-medium">Limitation: </span>
              {check.limitations}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
