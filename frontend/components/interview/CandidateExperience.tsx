"use client";

import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { localCandidateApi } from "./candidate-api";
import { buildAssessments } from "./demo-data";
import {
  initialInterviewState,
  interviewReducer,
  type InterviewState,
} from "./interview-machine";
import { MicrophoneCapture } from "./MicrophoneCapture";
import type { ArtifactAttachment, Claim, EvidenceStatus } from "./contracts";

const STORAGE_KEY = "claimproof-candidate-session-v1";
const SESSION_SECONDS = 15 * 60;

function subscribeToConnectivity(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function useOfflineStatus() {
  return useSyncExternalStore(
    subscribeToConnectivity,
    () => !navigator.onLine,
    () => false,
  );
}

function Icon({ name }: { name: "arrow" | "check" | "file" | "flag" | "lock" | "reset" }) {
  const paths = {
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    check: <path d="m5 12 4 4L19 6" />,
    file: <path d="M7 3h7l4 4v14H7zM14 3v5h5M10 13h5M10 17h5" />,
    flag: <path d="M6 21V4m0 1h10l-2 4 2 4H6" />,
    lock: <path d="M6 10h12v10H6zM9 10V7a3 3 0 0 1 6 0v3" />,
    reset: <path d="M4 12a8 8 0 1 0 2.3-5.7L4 8m0-5v5h5" />,
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      {paths[name]}
    </svg>
  );
}

function getClaim(state: InterviewState, claimId: string): Claim | undefined {
  return state.application?.claims.find((claim) => claim.id === claimId);
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function Header({ isOffline }: { isOffline: boolean }) {
  return (
    <>
      <header className="site-header">
        <a className="brand" href="/candidate">
          <span className="brand-mark" aria-hidden="true">CP</span>
          <span>ClaimProof</span>
        </a>
        <div className="header-meta">
          <span className="privacy-chip"><Icon name="lock" /> Private demo</span>
          <a href="mailto:help@claimproof.example">Accommodation or help</a>
        </div>
      </header>
      {isOffline ? (
        <div className="offline-banner" role="status">
          You are offline. This local demo still works, and your progress stays in this browser.
        </div>
      ) : null}
    </>
  );
}

function StepLabel({ children }: { children: React.ReactNode }) {
  return <p className="step-label">{children}</p>;
}

function Landing({
  onLoadDemo,
  onImport,
  busy,
  error,
}: {
  onLoadDemo: () => void;
  onImport: (resume: File | null, text: string) => void;
  busy: boolean;
  error: string | null;
}) {
  const [resume, setResume] = useState<File | null>(null);
  const [text, setText] = useState("");

  return (
    <main className="landing-shell" id="main-content">
      <section className="landing-hero">
        <div className="hero-copy">
          <StepLabel>Candidate evidence notebook</StepLabel>
          <h1>Add context to the work behind your application.</h1>
          <p className="hero-lede">
            ClaimProof asks about three specific claims in one 15-minute conversation. Answer by voice or text, review the record, and choose any supporting artifact you want to share.
          </p>
          <div className="hero-actions">
            <button className="button button-primary button-large" type="button" onClick={onLoadDemo} disabled={busy}>
              {busy ? "Loading candidate..." : "Load demo candidate"}
              {!busy ? <Icon name="arrow" /> : <span className="spinner" aria-hidden="true" />}
            </button>
            <span>No account or live service needed</span>
          </div>
          {error ? (
            <div className="error-panel" role="alert">
              <strong>We could not prepare that application.</strong>
              <p>{error} Your input was not lost. You can retry or continue with the local demo.</p>
              <button className="button button-light" type="button" onClick={onLoadDemo}>Continue with local demo</button>
            </div>
          ) : null}
        </div>
        <aside className="principles-card" aria-label="How ClaimProof works">
          <span className="folio">01 / Before you begin</span>
          <h2>Your evidence, with clear boundaries.</h2>
          <ul>
            <li><span>01</span><div><strong>No camera or screen recording</strong><p>We only use answers and items you intentionally attach.</p></div></li>
            <li><span>02</span><div><strong>Voice and text are equal</strong><p>Your response method is not an assessment signal.</p></div></li>
            <li><span>03</span><div><strong>No behavior analysis</strong><p>No accent, tone, emotion, timing, honesty, or personality scoring.</p></div></li>
          </ul>
        </aside>
      </section>

      <section className="import-section" aria-labelledby="bring-application-title">
        <div>
          <StepLabel>Use your own material</StepLabel>
          <h2 id="bring-application-title">Bring an application</h2>
          <p>In this offline-ready prototype, uploads and pasted text safely fall back to the seeded candidate so the full journey remains available.</p>
        </div>
        <div className="import-grid">
          <label className="upload-field">
            <span className="upload-icon"><Icon name="file" /></span>
            <strong>{resume ? resume.name : "Upload a resume"}</strong>
            <span>PDF, DOCX, or TXT · up to 10 MB</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(event) => setResume(event.target.files?.[0] ?? null)}
            />
          </label>
          <label className="paste-field">
            <span>Or paste application text</span>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste a resume, profile, or application excerpt..."
              rows={5}
            />
          </label>
        </div>
        <button
          className="button button-dark"
          type="button"
          disabled={busy || (!resume && !text.trim())}
          onClick={() => onImport(resume, text)}
        >
          Prepare focus areas <Icon name="arrow" />
        </button>
      </section>
    </main>
  );
}

function ClaimCard({
  claim,
  index,
  flagged,
  onFlag,
}: {
  claim: Claim;
  index: number;
  flagged: boolean;
  onFlag: () => void;
}) {
  return (
    <article className={flagged ? "claim-card is-flagged" : "claim-card"}>
      <div className="claim-number">0{index + 1}</div>
      <div className="claim-content">
        <span className="source-kicker">{claim.source.document} · {claim.source.section}</span>
        <h3>{claim.text}</h3>
        <blockquote>“{claim.source.excerpt}”</blockquote>
        <button className="text-action" type="button" onClick={onFlag} aria-pressed={flagged}>
          <Icon name={flagged ? "check" : "flag"} />
          {flagged ? "Issue flagged for review" : "Flag source or extraction issue"}
        </button>
        {flagged ? <p className="flag-note" role="status">Noted. The original focus stays visible so the interview record remains traceable.</p> : null}
      </div>
    </article>
  );
}

function Preview({ state, dispatch }: { state: InterviewState; dispatch: React.Dispatch<Parameters<typeof interviewReducer>[1]> }) {
  return (
    <main className="page-shell" id="main-content">
      <div className="page-heading">
        <div>
          <StepLabel>Step 1 of 2 · Review the focus</StepLabel>
          <h1>Three parts of your application</h1>
          <p>These focus areas will guide one continuous conversation. You can flag an extraction issue, but the original claim remains in the evidence record.</p>
        </div>
        <div className="candidate-stamp">
          <span>Prepared for</span>
          <strong>{state.application?.candidateName}</strong>
          <small>{state.application?.roleTitle}</small>
        </div>
      </div>
      {state.fallbackNotice ? (
        <div className="demo-notice" role="status">
          The demo parser is offline, so we loaded the seeded candidate. Your full interview path is available.
        </div>
      ) : null}
      <section className="claim-list" aria-label="Interview focus claims">
        {state.application?.claims.map((claim, index) => (
          <ClaimCard
            key={claim.id}
            claim={claim}
            index={index}
            flagged={state.flaggedClaimIds.includes(claim.id)}
            onFlag={() => dispatch({ type: "TOGGLE_FLAG", claimId: claim.id })}
          />
        ))}
      </section>
      <div className="sticky-action-row">
        <p><strong>Next:</strong> choose voice or text and review the recording notice.</p>
        <button className="button button-primary" type="button" onClick={() => dispatch({ type: "OPEN_NOTICE" })}>
          Continue <Icon name="arrow" />
        </button>
      </div>
    </main>
  );
}

function Notice({ state, dispatch }: { state: InterviewState; dispatch: React.Dispatch<Parameters<typeof interviewReducer>[1]> }) {
  return (
    <main className="notice-shell" id="main-content">
      <section className="notice-paper">
        <StepLabel>Step 2 of 2 · Participation notice</StepLabel>
        <h1>Before the conversation begins</h1>
        <p className="notice-intro">Choose how you would like to answer. You can switch at any time, and your choice is not used as assessment evidence.</p>
        <div className="mode-preview-grid">
          <button
            type="button"
            className={state.answerMode === "voice" ? "mode-preview is-selected" : "mode-preview"}
            onClick={() => dispatch({ type: "SET_MODE", mode: "voice" })}
            aria-pressed={state.answerMode === "voice"}
          >
            <span className="radio-mark" /><strong>Speak</strong><p>Microphone audio is recorded locally for this demo and transcribed when browser support is available.</p>
          </button>
          <button
            type="button"
            className={state.answerMode === "text" ? "mode-preview is-selected" : "mode-preview"}
            onClick={() => dispatch({ type: "SET_MODE", mode: "text" })}
            aria-pressed={state.answerMode === "text"}
          >
            <span className="radio-mark" /><strong>Type</strong><p>No microphone recording is needed. The same claims, questions, and status meanings apply.</p>
          </button>
        </div>
        <div className="notice-details">
          <h2>What is and is not used</h2>
          <p>We use the content of your answers, the source claims shown with each question, transcript changes you approve, and evidence you intentionally attach.</p>
          <p>We do not use your camera and do not analyze accent, tone, emotion, personality, honesty, eye contact, disability, timing, or other behavioral characteristics.</p>
          <p>You can stop and cleanly reset this demo at any time.</p>
        </div>
        <label className="acknowledgment">
          <input
            type="checkbox"
            checked={state.noticeAccepted}
            onChange={(event) => dispatch({ type: "SET_NOTICE_ACCEPTED", accepted: event.target.checked })}
          />
          <span><strong>I understand what may be recorded and how this demo uses my interview information.</strong><small>This acknowledges the notice. It is not a claim about truth or identity.</small></span>
        </label>
        <div className="notice-actions">
          <button className="button button-light" type="button" onClick={() => dispatch({ type: "RETURN_TO_PREVIEW" })}>Back</button>
          <button
            className="button button-primary"
            type="button"
            disabled={!state.noticeAccepted}
            onClick={() => dispatch({ type: "START_INTERVIEW", now: Date.now() })}
          >
            Begin 15-minute conversation <Icon name="arrow" />
          </button>
        </div>
      </section>
    </main>
  );
}

function InterviewSidebar({ state, secondsLeft }: { state: InterviewState; secondsLeft: number }) {
  const active = state.questions[state.activeQuestionIndex];
  const answeredClaims = new Set(state.answers.map((answer) => answer.claimId));
  const progress = Math.round((state.answers.length / state.questions.length) * 100);

  return (
    <aside className="interview-sidebar" aria-label="Interview progress">
      <div className="timer-block">
        <span>Session time</span>
        <strong>{formatTime(secondsLeft)}</strong>
        <small>Time only guides the session. It is not assessment evidence.</small>
      </div>
      <div className="progress-block">
        <div><span>Overall progress</span><strong>{progress}%</strong></div>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      </div>
      <ol className="focus-nav">
        {state.application?.claims.map((claim, index) => {
          const current = active?.claimId === claim.id;
          const done = answeredClaims.has(claim.id) && !current;
          return (
            <li key={claim.id} className={current ? "is-current" : done ? "is-done" : ""}>
              <span>{done ? <Icon name="check" /> : `0${index + 1}`}</span>
              <div><small>Focus area {index + 1}</small><strong>{claim.text}</strong></div>
            </li>
          );
        })}
      </ol>
      <p className="sidebar-help">Need a pause or accommodation? <a href="mailto:help@claimproof.example">Contact a person</a>.</p>
    </aside>
  );
}

function ConversationHistory({ state }: { state: InterviewState }) {
  return (
    <div className="conversation-history" aria-label="Conversation so far">
      {state.answers.map((answer) => {
        const question = state.questions.find((item) => item.id === answer.questionId);
        const claim = getClaim(state, answer.claimId);
        if (!question || !claim) return null;
        return (
          <article className="history-entry" key={answer.id}>
            <div className="history-rule"><span>ClaimProof</span><i /></div>
            <p className="history-question">{question.prompt}</p>
            <div className="history-answer">
              <span>{state.application?.candidateName}</span>
              <p>{answer.correctedTranscript || answer.originalTranscript}</p>
              {answer.correctedTranscript ? <small>Transcript correction retained with original</small> : null}
              {answer.clarification ? <div className="clarification"><strong>Candidate clarification</strong>{answer.clarification}</div> : null}
              {answer.artifact ? <div className="artifact-pill"><Icon name="file" /> {answer.artifact.fileName} · linked to {claim.text}</div> : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Interview({ state, dispatch, secondsLeft }: { state: InterviewState; dispatch: React.Dispatch<Parameters<typeof interviewReducer>[1]>; secondsLeft: number }) {
  const activeQuestion = state.questions[state.activeQuestionIndex];
  const claim = getClaim(state, activeQuestion.claimId);
  const [microphoneFallback, setMicrophoneFallback] = useState<string | null>(null);

  return (
    <main className="interview-layout" id="main-content">
      <InterviewSidebar state={state} secondsLeft={secondsLeft} />
      <section className="conversation-panel">
        <div className="conversation-title">
          <div><StepLabel>Evidence conversation · Question {state.activeQuestionIndex + 1} of {state.questions.length}</StepLabel><h1>{activeQuestion.kind === "follow_up" ? "A closer look" : "Let’s add context"}</h1></div>
          <span className="live-chip"><i /> Session in progress</span>
        </div>
        <ConversationHistory state={state} />
        <article className="active-question" aria-labelledby="active-question-title">
          <div className="question-context">
            <div><span>Source claim</span><strong>{claim?.text}</strong><small>{claim?.source.document} · {claim?.source.section}</small></div>
            <div><span>Why we’re asking</span><p>{activeQuestion.why}</p></div>
          </div>
          <div className="question-main">
            <span className="speaker-label">ClaimProof asks</span>
            <h2 id="active-question-title">{activeQuestion.prompt}</h2>
          </div>
          <div className="answer-composer">
            <div className="mode-tabs" aria-label="Answer method">
              <button type="button" className={state.answerMode === "voice" ? "is-active" : ""} onClick={() => dispatch({ type: "SET_MODE", mode: "voice" })} aria-pressed={state.answerMode === "voice"}>Speak answer</button>
              <button type="button" className={state.answerMode === "text" ? "is-active" : ""} onClick={() => dispatch({ type: "SET_MODE", mode: "text" })} aria-pressed={state.answerMode === "text"}>Type answer</button>
            </div>
            {state.answerMode === "voice" ? (
              <MicrophoneCapture
                transcript={state.answerDraft}
                onTranscript={(value) => dispatch({ type: "SET_ANSWER_DRAFT", value })}
                onFallbackToText={(message) => {
                  setMicrophoneFallback(message);
                  dispatch({ type: "SET_MODE", mode: "text" });
                }}
              />
            ) : null}
            {microphoneFallback && state.answerMode === "text" ? (
              <p className="fallback-message" role="status">{microphoneFallback}</p>
            ) : null}
            <label className="answer-field">
              <span>{state.answerMode === "voice" ? "Live transcript or typed fallback" : "Your answer"}</span>
              <textarea
                aria-label="Answer transcript"
                rows={7}
                value={state.answerDraft}
                onChange={(event) => dispatch({ type: "SET_ANSWER_DRAFT", value: event.target.value })}
                placeholder={state.answerMode === "voice" ? "Your transcript will appear here. You can also type at any time." : "Add the context, decisions, and evidence you want the recruiter to understand..."}
              />
            </label>
            <div className="composer-footer">
              <span>Review and correction come next.</span>
              <button className="button button-primary" type="button" disabled={!state.answerDraft.trim()} onClick={() => dispatch({ type: "BEGIN_REVIEW" })}>
                Review answer <Icon name="arrow" />
              </button>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}

function Review({ state, dispatch, secondsLeft }: { state: InterviewState; dispatch: React.Dispatch<Parameters<typeof interviewReducer>[1]>; secondsLeft: number }) {
  const review = state.review!;
  const claim = getClaim(state, review.question.claimId)!;
  const fileRef = useRef<HTMLInputElement>(null);

  const attach = (file: File | undefined) => {
    if (!file) return;
    const artifact: ArtifactAttachment = {
      id: `artifact_${review.question.claimId}_${file.name}`,
      claimId: review.question.claimId,
      fileName: file.name,
      mediaType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    };
    dispatch({ type: "SET_ARTIFACT", artifact });
  };

  return (
    <main className="interview-layout" id="main-content">
      <InterviewSidebar state={state} secondsLeft={secondsLeft} />
      <section className="review-panel">
        <div className="conversation-title"><div><StepLabel>Review before adding to the record</StepLabel><h1>Your answer, with lineage preserved</h1></div></div>
        <div className="lineage-note"><Icon name="lock" /><p><strong>Your original answer stays in the record.</strong> A transcription correction and any added clarification are stored as separately labeled layers.</p></div>
        <article className="review-sheet">
          <div className="review-source"><span>For claim</span><strong>{claim.text}</strong></div>
          <section>
            <div className="field-heading"><div><span>01</span><h2>Original answer</h2></div><small>Read-only · {review.mode}</small></div>
            <blockquote className="original-transcript">“{review.originalTranscript}”</blockquote>
          </section>
          <section>
            <div className="field-heading"><div><span>02</span><h2>Correct transcription</h2></div><small>Fix words the transcript got wrong</small></div>
            <label className="sr-only" htmlFor="correction">Correct transcription</label>
            <textarea id="correction" rows={5} value={review.correction} onChange={(event) => dispatch({ type: "SET_CORRECTION", value: event.target.value })} />
            <p className="field-help">This does not replace the original answer above.</p>
          </section>
          <section>
            <div className="field-heading"><div><span>03</span><h2>Add a clarification</h2></div><small>Optional · shown separately</small></div>
            <label className="sr-only" htmlFor="clarification">Add a clarification</label>
            <textarea id="clarification" rows={3} value={review.clarification} onChange={(event) => dispatch({ type: "SET_CLARIFICATION", value: event.target.value })} placeholder="Add context you want the recruiter to see..." />
          </section>
          <section>
            <div className="field-heading"><div><span>04</span><h2>Supporting artifact</h2></div><small>Optional · you choose what to share</small></div>
            <input ref={fileRef} className="sr-only" type="file" aria-label="Choose supporting artifact" onChange={(event) => attach(event.target.files?.[0])} />
            {review.artifact ? (
              <div className="attached-file"><Icon name="file" /><div><strong>{review.artifact.fileName}</strong><span>Linked only to this claim · {(review.artifact.sizeBytes / 1024).toFixed(1)} KB</span></div><button type="button" onClick={() => dispatch({ type: "SET_ARTIFACT", artifact: null })}>Remove</button></div>
            ) : (
              <button className="artifact-button" type="button" onClick={() => fileRef.current?.click()}><Icon name="file" /><span><strong>Add a supporting artifact</strong><small>Choose a specific document, image, or excerpt. We never record your screen.</small></span></button>
            )}
          </section>
        </article>
        <div className="review-actions">
          <button className="button button-light" type="button" onClick={() => dispatch({ type: "SET_CORRECTION", value: review.originalTranscript })}>Restore transcript text</button>
          <button className="button button-primary" type="button" disabled={!review.correction.trim()} onClick={() => dispatch({ type: "COMMIT_REVIEW" })}>
            Add to conversation <Icon name="arrow" />
          </button>
        </div>
      </section>
    </main>
  );
}

const STATUS_COPY: Record<EvidenceStatus, { label: string; description: string }> = {
  demonstrated: { label: "Demonstrated", description: "The interview evidence directly supported the parts of this claim that were assessed." },
  partially_demonstrated: { label: "Partially demonstrated", description: "The interview supported some parts while other relevant parts remained unsupported or unclear." },
  unresolved: { label: "Unresolved", description: "The interview did not provide enough relevant evidence to assess this claim." },
};

function Completion({ state, onReset }: { state: InterviewState; onReset: () => void }) {
  const assessments = buildAssessments(state.answers);
  return (
    <main className="completion-shell" id="main-content">
      <section className="completion-heading">
        <div className="completion-mark"><Icon name="check" /></div>
        <StepLabel>Conversation complete</StepLabel>
        <h1>Your evidence notebook is ready.</h1>
        <p>Thank you, {state.application?.candidateName}. Here is how the evidence provided in this interview relates to each focus area.</p>
      </section>
      <div className="limitation-banner" role="note">
        <strong>What these labels mean</strong>
        <p>These statuses describe the evidence available in this interview. They are not judgments about truthfulness, character, competence, or whether you should be hired.</p>
      </div>
      <section className="assessment-list" aria-label="Claim evidence statuses">
        {assessments.map((assessment, index) => {
          const claim = getClaim(state, assessment.claimId)!;
          const copy = STATUS_COPY[assessment.status];
          return (
            <article className="assessment-card" key={assessment.claimId}>
              <div className="assessment-index">0{index + 1}</div>
              <div className="assessment-main">
                <span className="source-kicker">{claim.source.document} · {claim.source.section}</span>
                <h2>{claim.text}</h2>
                <div className={`status-label status-${assessment.status}`}><i />{copy.label}</div>
                <p>{copy.description}</p>
              </div>
              <div className="evidence-excerpt"><span>Evidence excerpt</span><blockquote>“{assessment.evidenceExcerpts[0]}”</blockquote></div>
            </article>
          );
        })}
      </section>
      <section className="completion-next">
        <div><StepLabel>Demo data controls</StepLabel><h2>Start fresh when you are ready.</h2><p>Reset removes this local session, including transcript changes and artifact metadata, from this browser.</p></div>
        <button className="button button-dark" type="button" onClick={onReset}><Icon name="reset" /> Reset demo</button>
      </section>
    </main>
  );
}

export function CandidateExperience() {
  const [state, dispatch] = useReducer(interviewReducer, initialInterviewState);
  const [restored, setRestored] = useState(false);
  const isOffline = useOfflineStatus();
  const [now, setNow] = useState(0);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as InterviewState;
      if (parsed.application && parsed.phase !== "landing" && parsed.phase !== "loading" && parsed.phase !== "load_error") {
        const restoreTimer = window.setTimeout(() => {
          dispatch({ type: "RESTORE", state: parsed });
          setRestored(true);
        }, 0);
        return () => window.clearTimeout(restoreTimer);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [state.phase]);

  useEffect(() => {
    if (state.phase === "landing" || state.phase === "loading" || state.phase === "load_error") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  useEffect(() => {
    if (!state.startedAt || state.phase === "complete") return;
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [state.startedAt, state.phase]);

  const secondsLeft = useMemo(() => {
    if (!state.startedAt || !now) return SESSION_SECONDS;
    return Math.max(0, SESSION_SECONDS - Math.floor((now - state.startedAt) / 1000));
  }, [now, state.startedAt]);

  const loadDemo = async () => {
    dispatch({ type: "LOAD_STARTED" });
    try {
      const application = await localCandidateApi.loadDemoCandidate();
      dispatch({ type: "LOAD_SUCCEEDED", application });
    } catch (error) {
      dispatch({ type: "LOAD_FAILED", message: error instanceof Error ? error.message : "Unknown loading error." });
    }
  };

  const importApplication = async (resume: File | null, pastedText: string) => {
    dispatch({ type: "LOAD_STARTED" });
    try {
      const result = await localCandidateApi.importApplication({ resume, pastedText });
      dispatch({ type: "LOAD_SUCCEEDED", ...result });
    } catch (error) {
      dispatch({ type: "LOAD_FAILED", message: error instanceof Error ? error.message : "Unknown loading error." });
    }
  };

  const reset = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: "RESET" });
    setRestored(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Header isOffline={isOffline} />
      {restored ? (
        <div className="recovery-banner" role="status">
          <span><strong>Session recovered.</strong> Your local progress was restored after refresh.</span>
          <button type="button" onClick={() => setRestored(false)}>Dismiss</button>
        </div>
      ) : null}
      {(state.phase === "landing" || state.phase === "loading" || state.phase === "load_error") && (
        <Landing onLoadDemo={loadDemo} onImport={importApplication} busy={state.phase === "loading"} error={state.loadError} />
      )}
      {state.phase === "preview" && <Preview state={state} dispatch={dispatch} />}
      {state.phase === "notice" && <Notice state={state} dispatch={dispatch} />}
      {state.phase === "interview" && <Interview state={state} dispatch={dispatch} secondsLeft={secondsLeft} />}
      {state.phase === "review" && <Review state={state} dispatch={dispatch} secondsLeft={secondsLeft} />}
      {state.phase === "complete" && <Completion state={state} onReset={reset} />}
      <footer className="site-footer"><span>ClaimProof · Candidate demo</span><span>Evidence with boundaries, not surveillance.</span></footer>
    </div>
  );
}
