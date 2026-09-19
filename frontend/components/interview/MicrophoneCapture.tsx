"use client";

import { useEffect, useRef, useState } from "react";
import { classifyMicrophoneError, requestMicrophone } from "./media";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

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

interface MicrophoneCaptureProps {
  transcript: string;
  onTranscript: (transcript: string) => void;
  onFallbackToText: (message: string) => void;
  onAudio?: (blob: Blob) => void;
}

export function MicrophoneCapture({
  transcript,
  onTranscript,
  onFallbackToText,
  onAudio,
}: MicrophoneCaptureProps) {
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef(transcript);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const stopRecording = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
    if (!transcriptRef.current.trim()) {
      setMessage(
        "Audio capture stopped, but live transcription is not available here. Type your answer below to continue.",
      );
    } else {
      setMessage("Recording stopped. Review the transcript below before continuing.");
    }
  };

  const startRecording = async () => {
    setMessage("Requesting microphone access...");
    try {
      const stream = await requestMicrophone();
      streamRef.current = stream;
      recorderRef.current = new MediaRecorder(stream);
      const recorder = recorderRef.current;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => { if (chunks.length && onAudio) onAudio(new Blob(chunks, { type: recorder.mimeType })); };
      recorderRef.current.start();

      const Recognition = recognitionConstructor();
      if (Recognition) {
        const recognition = new Recognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (event) => {
          const words = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join(" ")
            .trim();
          if (words) onTranscript(words);
        };
        recognition.start();
        recognitionRef.current = recognition;
        setMessage("Listening. A live transcript will appear below.");
      } else {
        setMessage(
          "Recording audio. Live transcription is unavailable in this browser, so you can type the transcript below.",
        );
      }
      setRecording(true);
    } catch (error) {
      const failure = classifyMicrophoneError(error);
      const fallbackMessage =
        failure === "denied"
          ? "Microphone access was not allowed. Nothing is blocked - continue with the equal text option."
          : "Microphone capture is unavailable here. Continue with the equal text option.";
      setMessage(fallbackMessage);
      onFallbackToText(fallbackMessage);
    }
  };

  return (
    <div className="microphone-panel" aria-live="polite">
      <div className="recording-control">
        <span className={recording ? "mic-mark is-recording" : "mic-mark"} aria-hidden="true">
          <span />
        </span>
        <div>
          <strong>{recording ? "Microphone recording" : "Ready to speak"}</strong>
          <p>Only microphone audio is requested. Camera access is never requested.</p>
        </div>
        <button
          className={recording ? "button button-stop" : "button button-dark"}
          type="button"
          onClick={recording ? stopRecording : startRecording}
        >
          {recording ? "Stop recording" : "Start microphone"}
        </button>
      </div>
      {message ? <p className="permission-message">{message}</p> : null}
    </div>
  );
}
