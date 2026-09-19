// The contract has no summary field and must not change, so the collapsed card
// derives one: the first sentences of the rationale, whole, never cut with "…".

function sentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
}

export function summarize(text: string, maxSentences = 2): string {
  return splitLead(text, maxSentences).lead;
}

// lead = the first sentences, rest = everything after it. The card shows the
// lead bold and the rest in normal weight, so print keeps the full text.
export function splitLead(text: string, maxSentences = 2): { lead: string; rest: string } {
  const parts = sentences(text);
  if (parts.length <= maxSentences) return { lead: text.trim(), rest: "" };
  return {
    lead: parts.slice(0, maxSentences).join(" "),
    rest: parts.slice(maxSentences).join(" "),
  };
}
