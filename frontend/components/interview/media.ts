export type DeviceFailure = "denied" | "unavailable";

export async function requestInterviewDevices(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException("Media capture is unavailable", "NotSupportedError");
  }

  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
    },
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });
}

export function classifyDeviceError(error: unknown): DeviceFailure {
  if (
    error instanceof DOMException &&
    ["NotAllowedError", "SecurityError", "PermissionDeniedError"].includes(error.name)
  ) {
    return "denied";
  }
  return "unavailable";
}
