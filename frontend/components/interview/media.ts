export type MicrophoneFailure = "denied" | "unavailable" | "interrupted";

export async function requestMicrophone(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    throw new DOMException("Microphone capture is unavailable", "NotSupportedError");
  }

  // Audio only by policy. Camera participation is outside the MVP and any future
  // camera experiment must live behind a separate, explicit capability boundary.
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}

export function classifyMicrophoneError(error: unknown): MicrophoneFailure {
  if (
    error instanceof DOMException &&
    ["NotAllowedError", "SecurityError", "PermissionDeniedError"].includes(error.name)
  ) {
    return "denied";
  }
  return "unavailable";
}
