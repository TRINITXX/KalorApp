import { requireOptionalNativeModule } from "expo-modules-core";

/**
 * Dictation needs two native modules that only exist from build 1.1.0 on.
 * JS sent over the air to an older build must not import them blindly:
 * their packages throw at import time when the native side is missing.
 */
export const voiceAvailable =
  requireOptionalNativeModule("ExpoSpeechRecognition") != null &&
  requireOptionalNativeModule("ExpoSecureStore") != null;

export function loadSecureStore(): typeof import("expo-secure-store") | null {
  if (requireOptionalNativeModule("ExpoSecureStore") == null) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-secure-store");
}

export function loadSpeechRecognition(): typeof import("expo-speech-recognition") | null {
  if (requireOptionalNativeModule("ExpoSpeechRecognition") == null) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-speech-recognition");
}
