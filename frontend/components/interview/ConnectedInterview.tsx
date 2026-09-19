"use client";
import { useEffect, useRef, useState } from "react";
import type { CandidateReport, Claim, ConsistencyProfile, EvidenceItem, InterviewQuestion } from "@shared/contracts";
import fixture from "@fixtures/report.json";
import { api } from "@/lib/session-api";
import { SageInterviewView } from "./SageInterviewView";

const KEY = "claimproof-integrated-session-v1";
type Event = { id: string; stage: string; status: string; created_at: string; details: Record<string, unknown> };
export type EvidenceMode = "fixture" | "live" | "solari";
// Optional own-application intake. Empty means the seeded fictional candidate.
export type Intake = { resumeText: string; coverLetterText: string; roleTitle: string; resumeFile: File | null; coverLetterFile: File | null };
export const EMPTY_INTAKE: Intake = { resumeText: "", coverLetterText: "", roleTitle: "", resumeFile: null, coverLetterFile: null };
export type Session = {
  id: string; mode: "live" | "offline"; candidate: string; interview: string;
  claims: Claim[]; question: InterviewQuestion | null; report?: CandidateReport;
  questions: InterviewQuestion[]; answers: CandidateReport["answers"]; evidence: EvidenceItem[]; events: Event[];
  // Sources the scan will inspect, shown to the candidate before the interview.
  consistency?: ConsistencyProfile | null;
};
const sampleAnswers: Record<string, string> = {
  "claim-rag-pipeline": "I used Neo4j for the RAG pipeline.",
  "claim-aws-service": "I deployed an AWS service on EC2 behind a load balancer. S3 held files and a queue buffered jobs. The load balancer stopped sending traffic to a failed instance.",
  "claim-inference-throughput": "I am not sure how the 10x inference throughput was measured; I do not know the baseline or load conditions.",
};
const ragFollowup = "Neo4j supplied graph relationships while vector retrieval found semantic matches for RAG. Across 200 evaluation queries, F1 improved by 2.75 percentage points. Dual writes increased indexing latency, so I would batch updates and rerun the evaluation.";
function event(stage: string, details: Record<string, unknown> = {}): Event {
  return { id: crypto.randomUUID(), stage, status: "ok", created_at: new Date().toISOString(), details };
}
// Seeded candidate by default; pasted text or PDF/text uploads create a fresh candidate.
async function createApplication(session: string, intake: Intake | null): Promise<{ candidate_id: string; application_id: string }> {
  if (!intake) return api("applications", session, { use_seed: true });
  if (intake.resumeFile) {
    const data = new FormData();
    data.append("resume", intake.resumeFile);
    if (intake.coverLetterFile) data.append("cover_letter", intake.coverLetterFile);
    if (intake.roleTitle.trim()) data.append("role_title", intake.roleTitle.trim());
    const response = await fetch("/api/backend/applications/upload", { method: "POST", headers: { "X-Session-ID": session }, body: data });
    const result = await response.json();
    if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Upload failed. Paste the text instead.");
    return result;
  }
  return api("applications", session, { resume_text: intake.resumeText, cover_letter_text: intake.coverLetterText || null, role_title: intake.roleTitle || null });
}
function offlineConsistency(profile: ConsistencyProfile | null | undefined): ConsistencyProfile | null {
  if (!profile) return null;
  const checks = profile.checks.filter(c => c.kind !== "technical_relevance").map(c => ({ ...c, mode: "fixture" as const }));
  const coverage = { aligned: 0, conflict: 0, not_found: 0, unavailable: 0, insufficient: 0 };
  for (const c of checks) coverage[c.outcome] += 1;
  return { ...profile, generated_at: new Date().toISOString(), coverage, checks };
}
function offlineQuestion(claim: Claim): InterviewQuestion {
  return { id: crypto.randomUUID(), claim_id: claim.id, kind: "opening", text: `Walk through how you accomplished: ${claim.statement}`, intent: "Explain the mechanism, measurement, and limitations." };
}

export function ConnectedInterview() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [original, setOriginal] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("https://demo.claimproof.example/hybrid-rag");
  const [evidenceMode, setEvidenceMode] = useState<EvidenceMode>("fixture");
  const [intake, setIntake] = useState<Intake>(EMPTY_INTAKE);
  const pending = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      try { const saved = localStorage.getItem(KEY); if (saved) setSession(JSON.parse(saved)); }
      catch { localStorage.removeItem(KEY); }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  function save(next: Session) {
    setSession(next); localStorage.setItem(KEY, JSON.stringify(next));
    if (next.mode === "offline") {
      localStorage.setItem(`claimproof-trace-${next.id}`, JSON.stringify(next.events));
      if (next.report) localStorage.setItem("claimproof-offline-report", JSON.stringify(next.report));
    }
  }
  async function run(work: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : "Request failed"); }
    finally { pending.current = false; setBusy(false); }
  }
  async function start(mode: Session["mode"]) {
    await run(async () => {
      const id = crypto.randomUUID();
      let claims = structuredClone(fixture.claims) as Claim[];
      let interview = "offline";
      let consistency: ConsistencyProfile | null = structuredClone(fixture.consistency) as ConsistencyProfile;
      let candidate = "demo-candidate-1";
      const events: Event[] = [event("claim_extraction")];
      const ownApplication = Boolean(intake.resumeText.trim() || intake.resumeFile);
      if (mode === "live") {
        const app = await createApplication(id, ownApplication ? intake : null);
        candidate = app.candidate_id;
        claims = await api<Claim[]>(`applications/${app.application_id}/extract-claims`, id, {});
        // The source scan is best-effort: a backend without fixtures or a failed
        // collector must not block the interview. Nothing is invented on failure.
        try {
          consistency = await api<ConsistencyProfile>(`candidates/${candidate}/consistency-scan`, id, { mode: "fixture" });
          events.push(event("consistency_scan", { checks: consistency.checks.length }));
        } catch {
          consistency = null;
          events.push({ ...event("consistency_scan"), status: "unavailable" });
        }
        const created = await api<{ interview_id: string }>("interviews", id, { candidate_id: candidate, claim_ids: claims.map(c => c.id) });
        interview = created.interview_id;
      } else if (ownApplication) {
        consistency = null;
      }
      const question = mode === "live"
        ? (await api<{ question: InterviewQuestion }>(`interviews/${interview}/next-question`, id)).question
        : offlineQuestion(claims[0]);
      events.push(event("question_generation", { claim_id: question.claim_id }));
      save({ id, mode, candidate, interview, claims, question, questions: [question], answers: [], evidence: [], consistency, events });
      setNotice(mode === "offline"
        ? `Offline rehearsal: answers stay in this browser. Assessments remain unresolved until reviewed.${ownApplication ? " Your own application text is not used offline; the seeded claims are shown." : ""}`
        : ownApplication ? "Connected to the backend with your application text. Claims below were extracted from it." : "Connected to the backend. DEMO_MODE uses deterministic model fixtures.");
    });
  }
  async function submit() {
    if (!session?.question || !draft.trim()) return;
    await run(async () => {
      const q = session.question!;
      const answer = { id: crypto.randomUUID(), question_id: q.id, transcript: draft.trim(), original_transcript: original, created_at: new Date().toISOString() };
      const answers = [...session.answers, answer];
      let question: InterviewQuestion | null = null;
      let report: CandidateReport | undefined;
      if (session.mode === "live") {
        const result = await api<{ next_action: string; question: InterviewQuestion | null; grounding?: { rationale: string } }>(
          `interviews/${session.interview}/answers`, session.id, { question_id: q.id, transcript: draft.trim(), original_transcript: original });
        if (result.next_action === "off_topic_notice") {
          setNotice(`Please address this claim before continuing. ${result.grounding?.rationale || ""}`);
          setOriginal(null); return;
        }
        question = result.question;
        if (result.next_action === "next_claim") question = (await api<{ question: InterviewQuestion }>(`interviews/${session.interview}/next-question`, session.id)).question;
        if (result.next_action === "completed") report = await api<CandidateReport>(`interviews/${session.interview}/complete`, session.id, {});
      } else {
        const index = session.claims.findIndex(c => c.id === q.claim_id);
        if (q.kind === "opening") {
          const focus = /latency|cost|index/i.test(draft) ? "the cost or latency you mentioned" : /team|we /i.test(draft) ? "your own contribution to the team work you mentioned" : "the measurement method and baseline behind your explanation";
          question = { ...q, id: crypto.randomUUID(), kind: "follow_up", text: `Could you explain ${focus}, with one concrete example?`, intent: "Clarify a detail from the submitted answer." };
        } else if (index + 1 < session.claims.length) question = offlineQuestion(session.claims[index + 1]);
        else report = { candidate_id: session.candidate, role_title: fixture.role_title, claims: session.claims, questions: session.questions, answers, evidence: session.evidence,
          assessments: session.claims.map(c => ({ claim_id: c.id, status: "unresolved", rationale: "Offline rehearsal: answers were recorded but have not been assessed. Human review is required.", evidence_ids: session.evidence.filter(e => e.claim_id === c.id).map(e => e.id), unresolved_questions: ["Review the recorded explanation and supporting evidence."] })),
          // Offline rehearsal cannot inspect sources; only the fixture's non-interview checks carry over, so no relevance is claimed for typed answers.
          consistency: offlineConsistency(session.consistency) };
      }
      const events = [...session.events, event("answer_submission", { claim_id: q.claim_id }), event(question ? (question.kind === "follow_up" ? "follow_up_generation" : "question_generation") : "assessment_generation")];
      save({ ...session, question, questions: question ? [...session.questions, question] : session.questions, answers, report, events });
      setDraft(""); setOriginal(null); setNotice("");
    });
  }
  async function attach() {
    if (!session) return;
    await run(async () => {
      let evidence: EvidenceItem;
      // The fixture belongs to the seeded RAG claim; live and Solari retrieval attach to the claim being discussed.
      const target = evidenceMode === "fixture" ? "claim-rag-pipeline" : (session.question?.claim_id ?? session.claims[0]?.id ?? "claim-rag-pipeline");
      if (session.mode === "live") evidence = await api<EvidenceItem>(`claims/${target}/collect-evidence`, session.id, { url: evidenceUrl, mode: evidenceMode });
      else {
        if (evidenceMode !== "fixture" || evidenceUrl !== "https://demo.claimproof.example/hybrid-rag") throw new Error("Offline rehearsal supports only the controlled fixture.");
        evidence = structuredClone(fixture.evidence.find(e => e.id === "ev-a3")!) as EvidenceItem;
      }
      save({ ...session, evidence: [...session.evidence, evidence], events: [...session.events, event("evidence_collection", { mode: evidenceMode })] });
      setNotice(evidenceMode === "fixture" ? "Evidence attached to the RAG claim with its limitations." : `Evidence attached to the current claim via ${evidenceMode === "solari" ? "a Solari browser" : "direct retrieval"}, with its limitations.`);
    });
  }
  async function reset() {
    await run(async () => {
      if (session?.mode === "live") await api("demo/reset", session.id, {});
      if (session) localStorage.removeItem(`claimproof-trace-${session.id}`);
      localStorage.removeItem(KEY); localStorage.removeItem("claimproof-offline-report");
      setSession(null); setDraft(""); setOriginal(null); setNotice(""); setConsent(false); setIntake(EMPTY_INTAKE);
    });
  }
  async function transcribe(blob: Blob) {
    if (!session || session.mode === "offline") { setNotice("Offline voice uses browser transcription when supported; otherwise type your answer."); return; }
    await run(async () => {
      const data = new FormData(); data.append("audio", blob, "answer.webm");
      const response = await fetch("/api/backend/transcribe", { method: "POST", headers: { "X-Session-ID": session.id }, body: data });
      if (!response.ok) throw new Error("Transcription unavailable. Type your answer to continue.");
      const result = await response.json(); setDraft(result.transcript);
      setNotice(result.mode === "fixture" ? "Simulated transcript from the demo fixture — this is not recognition of your recording. Replace it or use it for rehearsal." : "Transcribed recording. Review and correct the text before submitting.");
    });
  }
  const claim = session?.claims.find(c => c.id === session.question?.claim_id);
  return <SageInterviewView
    session={session} busy={busy} error={error} notice={notice}
    consent={consent} draft={draft} original={original}
    evidenceUrl={evidenceUrl} evidenceMode={evidenceMode} intake={intake} setIntake={setIntake}
    setConsent={setConsent} setDraft={setDraft} setOriginal={setOriginal}
    setNotice={setNotice} setEvidenceUrl={setEvidenceUrl} setEvidenceMode={setEvidenceMode}
    start={start} submit={submit} attach={attach} reset={reset} transcribe={transcribe}
    useExample={() => {
      if (!session?.question || !claim) return;
      // Own-application claims reuse seeded ids with a suffix, so match by prefix; otherwise fall back to a generic example.
      const key = Object.keys(sampleAnswers).find(k => claim.id === k || claim.id.startsWith(`${k}-`));
      const generic = `I worked on ${claim.entities[0] ?? "this"}: here is how it was built, how it was measured, and which part I personally owned.`;
      setDraft(session.question.kind === "follow_up" && key === "claim-rag-pipeline" ? ragFollowup : key ? sampleAnswers[key] : generic);
      setNotice("Example answer inserted for the fictional demo. It is not a real candidate response.");
    }}
  />;
}
