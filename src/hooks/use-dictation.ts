import { useCallback, useEffect, useRef, useState } from "react";

import { loadSpeechRecognition } from "@/lib/voice/native";
import { addResult, EMPTY_TRANSCRIPT, transcriptText, type TranscriptState } from "@/lib/voice/transcript";

export type DictationPhase = "idle" | "listening" | "stopping";

interface DictationState {
  phase: DictationPhase;
  /** Words recognised so far, updated while the user speaks. */
  transcript: string;
  /** Input level from 0 to 1, for the waveform. */
  level: number;
  error: string | null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Autorise le micro et la reconnaissance vocale pour KalorApp dans Réglages de l'iPhone.",
  "service-not-allowed": "La reconnaissance vocale est désactivée sur cet iPhone.",
  "language-not-supported": "Le français n'est pas disponible pour la reconnaissance vocale.",
  "no-speech": "Je n'ai rien entendu. Réessaie en parlant près du téléphone.",
  "audio-capture": "Le micro est indisponible. Réessaie.",
  network: "Pas de réseau pour la reconnaissance vocale.",
};

/**
 * Apple speech recognition in French, through expo-speech-recognition.
 * `finish()` stops listening and resolves with the final transcript.
 */
export function useDictation(contextualStrings: string[]) {
  const speech = useRef(loadSpeechRecognition()).current;
  const [state, setState] = useState<DictationState>({
    phase: "idle",
    transcript: "",
    level: 0,
    error: null,
  });
  const transcriptRef = useRef<TranscriptState>(EMPTY_TRANSCRIPT);
  const listeningRef = useRef(false);
  const finishResolvers = useRef<((text: string) => void)[]>([]);

  useEffect(() => {
    if (!speech) return;
    const m = speech.ExpoSpeechRecognitionModule;
    const subs = [
      m.addListener("result", (e) => {
        transcriptRef.current = addResult(transcriptRef.current, e);
        const text = transcriptText(transcriptRef.current);
        setState((s) => ({ ...s, transcript: text }));
      }),
      m.addListener("volumechange", (e) => {
        setState((s) => ({ ...s, level: Math.max(0, Math.min(e.value / 10, 1)) }));
      }),
      m.addListener("error", (e) => {
        if (e.error === "aborted") return;
        setState((s) => ({ ...s, error: ERRORS[e.error] ?? "La dictée a échoué. Réessaie." }));
      }),
      m.addListener("end", () => {
        listeningRef.current = false;
        setState((s) => ({ ...s, phase: "idle", level: 0 }));
        const resolvers = finishResolvers.current;
        finishResolvers.current = [];
        const text = transcriptText(transcriptRef.current);
        resolvers.forEach((resolve) => resolve(text));
      }),
    ];
    return () => {
      subs.forEach((sub) => sub.remove());
      // Leaving the screen must close the microphone: continuous mode has no
      // silence timer, and a session left running breaks the next start().
      if (listeningRef.current) m.abort();
      listeningRef.current = false;
    };
  }, [speech]);

  const start = useCallback(async () => {
    if (!speech) return;
    const m = speech.ExpoSpeechRecognitionModule;
    transcriptRef.current = EMPTY_TRANSCRIPT;
    setState({ phase: "listening", transcript: "", level: 0, error: null });
    const permission = await m.requestPermissionsAsync();
    if (!permission.granted) {
      setState((s) => ({ ...s, phase: "idle", error: ERRORS["not-allowed"] }));
      return;
    }
    listeningRef.current = true;
    m.start({
      lang: "fr-FR",
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      // Product names help Apple's recognizer spell "skyr" or "Fage".
      contextualStrings: contextualStrings.slice(0, 100),
      volumeChangeEventOptions: { enabled: true, intervalMillis: 120 },
    });
  }, [contextualStrings, speech]);

  const finish = useCallback((): Promise<string> => {
    if (!speech) return Promise.resolve("");
    setState((s) => ({ ...s, phase: "stopping" }));
    return new Promise((resolve) => {
      finishResolvers.current.push(resolve);
      speech.ExpoSpeechRecognitionModule.stop();
    });
  }, [speech]);

  const cancel = useCallback(() => {
    speech?.ExpoSpeechRecognitionModule.abort();
    listeningRef.current = false;
    finishResolvers.current = [];
    setState({ phase: "idle", transcript: "", level: 0, error: null });
  }, [speech]);

  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  return { ...state, available: speech != null, start, finish, cancel, clearError };
}
