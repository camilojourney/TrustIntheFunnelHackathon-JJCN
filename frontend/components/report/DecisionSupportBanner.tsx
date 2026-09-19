export function DecisionSupportBanner() {
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
      <strong className="font-semibold">Decision support, not a hiring decision.</strong>{" "}
      This report shows what the candidate demonstrated in one interview and what
      still needs human review. It does not judge character, and it does not use
      face, voice, accent, or emotion signals.
    </div>
  );
}
