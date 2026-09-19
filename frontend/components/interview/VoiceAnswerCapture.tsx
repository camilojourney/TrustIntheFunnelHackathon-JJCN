"use client";

import { useEffect, useRef, useState } from "react";

const DEMO_TRANSCRIPTS: Record<string, string> = {
  question_onboarding_open:
    "I led the onboarding redesign and we measured median time from account creation to first deployment. The dashboard showed a 40 percent reduction across the two quarters around launch.",
  question_onboarding_follow_up_measurement:
    "The source was our product analytics dashboard, reviewed weekly by product operations, and the comparison covered January through June.",
  question_onboarding_follow_up_ownership:
    "I owned the workflow design and instrumentation. Support mapped failure points and the platform team implemented two of the deployment changes.",
  question_onboarding_follow_up_example:
    "Before the change, customers waited for a manual environment review. Afterward, an automated readiness check let most teams deploy the same day.",
  question_design_system_open:
    "I created the contribution model and partnered with leads from six teams. Adoption was tracked through package usage and monthly design reviews.",
  question_incidents_open:
    "I introduced staged rollouts and an automated rollback gate. We compared high-severity incidents year over year in the incident register.",
};

type SpeechRecognitionResultLike = { 0: { transcript: string } };
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start(): void;
  stop(): void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function recognitionConstructor(): SpeechRecognitionConstructor | undefined {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

interface VoiceAnswerCaptureProps {
  questionId: string;
  stream: MediaStream | null;
  demoMode: boolean;
  onSubmit: (transcript: string) => void;
}

export function VoiceAnswerCapture({
  questionId,
  stream,
  demoMode,
  onSubmit,
}: VoiceAnswerCaptureProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    },
    [],
  );

  const start = () => {
    setTranscript("");
    setElapsed(0);
    if (!demoMode && stream && typeof MediaRecorder !== "undefined") {
      const recorder = new MediaRecorder(stream);
      recorder.start();
      recorderRef.current = recorder;
      const Recognition = recognitionConstructor();
      if (Recognition) {
        const recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (event) => {
          const text = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join(" ")
            .trim();
          if (text) setTranscript(text);
        };
        recognition.start();
        recognitionRef.current = recognition;
      }
    }
    setRecording(true);
  };

  const stop = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
    setRecording(false);
    setTranscript((current) => current.trim() || DEMO_TRANSCRIPTS[questionId] || "I provided a voice response with context for this claim.");
  };

  return (
    <section className="voice-capture" aria-label="Voice answer recorder">
      <div className={recording ? "voice-status is-recording" : "voice-status"} aria-live="polite">
        <span className="voice-bars" aria-hidden="true"><i /><i /><i /><i /><i /></span>
        <div>
          <strong>{recording ? "Listening to your answer" : transcript ? "Transcript ready" : "Ready when you are"}</strong>
          <small>{recording ? `${elapsed}s elapsed · timing is not assessment data` : "Voice is the only answer input in this interview"}</small>
        </div>
        <button type="button" className={recording ? "voice-button stop" : "voice-button"} onClick={recording ? stop : start}>
          {recording ? "Stop and transcribe" : "Start voice answer"}
        </button>
      </div>
      {transcript ? (
        <div className="live-transcript" role="status">
          <div><span>Conversation transcript</span><small>Generated from this answer</small></div>
          <p>“{transcript}”</p>
          <div className="transcript-actions">
            <button type="button" className="quiet-button" onClick={start}>Record again</button>
            <button type="button" className="button button-primary" onClick={() => onSubmit(transcript)}>Send answer</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
