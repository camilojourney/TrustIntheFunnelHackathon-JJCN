"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CandidateReport, Claim, EvidenceItem, InterviewQuestion } from "@shared/contracts";
import fixture from "@fixtures/report.json";
import { api } from "@/lib/session-api";
import { MicrophoneCapture } from "./MicrophoneCapture";

const KEY = "claimproof-integrated-session-v1";
type Event = { id: string; stage: string; status: string; created_at: string; details: Record<string, unknown> };
type Session = {
  id: string; mode: "live" | "offline"; candidate: string; interview: string;
  claims: Claim[]; question: InterviewQuestion | null; report?: CandidateReport;
  questions: InterviewQuestion[]; answers: CandidateReport["answers"]; evidence: EvidenceItem[]; events: Event[];
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
function offlineQuestion(claim: Claim): InterviewQuestion {
  return { id: crypto.randomUUID(), claim_id: claim.id, kind: "opening", text: `Walk through how you accomplished: ${claim.statement}`, intent: "Explain the mechanism, measurement, and limitations." };
}
const button = "rounded-lg bg-slate-900 px-4 py-3 font-medium text-white disabled:opacity-40";

export function ConnectedInterview() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [original, setOriginal] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [notice, setNotice] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("https://demo.claimproof.example/hybrid-rag");
  const [evidenceMode, setEvidenceMode] = useState<"fixture" | "live">("fixture");
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
      if (mode === "live") {
        const app = await api<{ application_id: string }>("applications", id, { use_seed: true });
        claims = await api<Claim[]>(`applications/${app.application_id}/extract-claims`, id, {});
        const created = await api<{ interview_id: string }>("interviews", id, { candidate_id: "demo-candidate-1", claim_ids: claims.map(c => c.id) });
        interview = created.interview_id;
      }
      const question = mode === "live"
        ? (await api<{ question: InterviewQuestion }>(`interviews/${interview}/next-question`, id)).question
        : offlineQuestion(claims[0]);
      save({ id, mode, candidate: "demo-candidate-1", interview, claims, question, questions: [question], answers: [], evidence: [],
        events: [event("claim_extraction"), event("question_generation", { claim_id: question.claim_id })] });
      setNotice(mode === "offline" ? "Offline rehearsal: answers stay in this browser. Assessments remain unresolved until reviewed." : "Connected to the backend. DEMO_MODE uses deterministic model fixtures.");
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
          assessments: session.claims.map(c => ({ claim_id: c.id, status: "unresolved", rationale: "Offline rehearsal: answers were recorded but have not been assessed. Human review is required.", evidence_ids: session.evidence.filter(e => e.claim_id === c.id).map(e => e.id), unresolved_questions: ["Review the recorded explanation and supporting evidence."] })) };
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
      if (session.mode === "live") evidence = await api<EvidenceItem>("claims/claim-rag-pipeline/collect-evidence", session.id, { url: evidenceUrl, mode: evidenceMode });
      else {
        if (evidenceMode !== "fixture" || evidenceUrl !== "https://demo.claimproof.example/hybrid-rag") throw new Error("Offline rehearsal supports only the controlled fixture.");
        evidence = structuredClone(fixture.evidence.find(e => e.id === "ev-a3")!) as EvidenceItem;
      }
      save({ ...session, evidence: [...session.evidence, evidence], events: [...session.events, event("evidence_collection", { mode: evidenceMode })] });
      setNotice("Evidence attached to the RAG claim with its limitations.");
    });
  }
  async function reset() {
    await run(async () => {
      if (session?.mode === "live") await api("demo/reset", session.id, {});
      if (session) localStorage.removeItem(`claimproof-trace-${session.id}`);
      localStorage.removeItem(KEY); localStorage.removeItem("claimproof-offline-report");
      setSession(null); setDraft(""); setOriginal(null); setNotice(""); setConsent(false);
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
  return <main className="mx-auto w-full max-w-4xl space-y-6 px-5 py-10">
    <header className="flex items-center justify-between"><Link href="/candidate" className="text-xl font-semibold">ClaimProof</Link><Link className="text-sky-700 underline" href="/recruiter">Recruiter view</Link></header>
    <h1 className="text-3xl font-semibold">The evidence behind your application</h1>
    <p className="text-slate-600">One fictional candidate, three claims, and a conversation grounded in what you explain. Voice and text are equal; no camera or behavioral scoring.</p>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg bg-amber-50 p-4 text-amber-900">{notice}</p>}
    {!session ? <section className="space-y-5 rounded-xl border bg-white p-6">
      <h2 className="text-xl font-semibold">Machine Learning Engineer · fictional demo</h2>
      <p>Only the seeded resume is used in this integration. Your submitted answers are saved to the local backend in connected mode, or this browser in offline mode. Reset clears the demo session.</p>
      <label className="flex gap-3"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />I understand how the demo uses my answers.</label>
      <div className="flex flex-wrap gap-3"><button className={button} disabled={busy || !consent} onClick={() => start("live")}>Start connected demo</button><button className={button} disabled={busy || !consent} onClick={() => start("offline")}>Start offline rehearsal</button></div>
    </section> : <>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-medium">{session.mode === "live" ? "Connected session" : "Offline rehearsal · simulated flow"}</p><div className="flex gap-4"><a className="text-sky-700 underline" href={`/traces/${session.id}?source=${session.mode}`}>Session trace</a><button className="text-slate-700 underline" disabled={busy} onClick={reset}>Reset demo</button></div></div>
      <details className="rounded-xl border bg-white p-5"><summary className="cursor-pointer font-semibold">Review all three source claims</summary><ul className="mt-4 space-y-3">{session.claims.map(c => <li key={c.id}><strong>{c.statement}</strong><blockquote className="text-slate-600">{c.source_excerpt}</blockquote></li>)}</ul></details>
      {session.question ? <>
        <section className="space-y-4 rounded-xl border bg-white p-6">
          <p className="text-sm uppercase tracking-wide text-slate-500">{session.question.kind === "follow_up" ? "Follow-up" : "Opening question"} · Claim {session.claims.findIndex(c => c.id === claim?.id) + 1} of 3</p>
          <blockquote className="border-l-4 border-sky-200 pl-4 text-slate-600">{claim?.source_excerpt}</blockquote>
          <h2 className="text-2xl font-semibold">{session.question.text}</h2><p className="text-sm text-slate-600">Why this was asked: {session.question.intent}</p>
          {original === null ? <>
            <MicrophoneCapture transcript={draft} onTranscript={setDraft} onFallbackToText={setNotice} onAudio={transcribe} />
            <label className="block font-medium">Your answer<textarea className="mt-2 block w-full rounded-lg border p-3 font-normal" rows={5} value={draft} onChange={e => setDraft(e.target.value)} /></label>
            <div className="flex flex-wrap gap-3"><button className={button} disabled={busy || !draft.trim()} onClick={() => setOriginal(draft)}>Review answer</button><button className="text-sky-700 underline" disabled={busy} onClick={() => { setDraft(session.question!.kind === "follow_up" && claim?.id === "claim-rag-pipeline" ? ragFollowup : sampleAnswers[claim!.id]); setNotice("Example answer inserted for the fictional demo. It is not a real candidate response."); }}>Use example answer</button></div>
          </> : <><p className="text-sm text-slate-600">Original transcript: {original}</p><label className="block font-medium">Correct transcript before submitting<textarea className="mt-2 block w-full rounded-lg border p-3 font-normal" rows={5} value={draft} onChange={e => setDraft(e.target.value)} /></label><button className={button} disabled={busy || !draft.trim()} onClick={submit}>Submit reviewed answer</button></>}
        </section>
        <section className="space-y-3 rounded-xl border bg-white p-5"><h2 className="font-semibold">Supporting evidence for the RAG claim</h2><p className="text-sm text-slate-600">The controlled artifact is fictional. Live retrieval requires an approved public host.</p><a href="/demo-artifact" target="_blank" className="text-sky-700 underline">Inspect synthetic artifact</a><div className="flex flex-wrap gap-3"><select aria-label="Evidence mode" className="rounded border p-2" value={evidenceMode} onChange={e => setEvidenceMode(e.target.value as "fixture" | "live")}><option value="fixture">Synthetic fixture</option><option value="live">Live public page</option></select><input aria-label="Evidence URL" className="min-w-0 flex-1 rounded border p-2" value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} /><button className={button} disabled={busy} onClick={attach}>Attach evidence</button></div>{session.evidence.map(e => <p key={e.id} className="text-sm">{e.source_label}: {e.limitations}</p>)}</section>
      </> : <section className="space-y-5 rounded-xl border bg-white p-6"><h2 className="text-2xl font-semibold">Conversation complete</h2><p>Your answers and evidence are ready for review. The report describes available evidence and remaining questions.</p><a className="inline-block rounded-lg bg-slate-900 px-4 py-3 text-white" href={session.mode === "live" ? `/recruiter/${session.candidate}?source=live&session=${session.id}` : `/recruiter/offline?session=${session.id}`}>Open evidence report</a></section>}
    </>}
    {busy && <p role="status">Saving or loading…</p>}
  </main>;
}
