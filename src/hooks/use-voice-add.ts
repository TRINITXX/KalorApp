import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SQLiteDatabase } from "expo-sqlite";

import type { CatalogProduct } from "@/db/queries/products";
import { useDictation } from "@/hooks/use-dictation";
import { getApiKey } from "@/lib/voice/api-key";
import { CLAUDE_ERROR_MESSAGES, ClaudeError } from "@/lib/voice/claude";
import { VoiceReplyError } from "@/lib/voice/interpret";
import { voiceAvailable } from "@/lib/voice/native";
import { interpretDictation, prepareVoiceDraft, type VoiceDraft } from "@/lib/voice/run-voice";

/**
 * Dictation on the add screen: listen, send the words to Claude, hand the
 * sorted meal to `onDraft`. Errors come back as French sentences.
 */
export function useVoiceAdd(
  db: SQLiteDatabase,
  catalog: CatalogProduct[],
  onDraft: (draft: VoiceDraft) => Promise<void>,
) {
  // Favorites first: Apple's recognizer reads at most 100 hints.
  const hints = useMemo(
    () => [...catalog].sort((a, b) => b.is_favorite - a.is_favorite).map((p) => p.name),
    [catalog],
  );
  const dictation = useDictation(hints);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Claude may answer after the screen closed: then nothing is saved or shown.
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const start = useCallback(async () => {
    setError(null);
    if (!(await getApiKey())) {
      setError(CLAUDE_ERROR_MESSAGES["missing-key"]);
      return;
    }
    await dictation.start();
  }, [dictation]);

  const finish = useCallback(async () => {
    const transcript = (await dictation.finish()).trim();
    if (transcript === "") {
      setError("Je n'ai rien entendu. Réessaie en parlant près du téléphone.");
      return;
    }
    setThinking(true);
    try {
      const meal = await interpretDictation(db, transcript);
      if (!mounted.current) return;
      await onDraft(await prepareVoiceDraft(db, meal, transcript));
    } catch (e) {
      if (!mounted.current) return;
      setError(
        e instanceof ClaudeError
          ? CLAUDE_ERROR_MESSAGES[e.kind]
          : e instanceof VoiceReplyError
            ? CLAUDE_ERROR_MESSAGES["invalid-reply"]
            : "La dictée a échoué. Réessaie.",
      );
    } finally {
      if (mounted.current) setThinking(false);
    }
  }, [db, dictation, onDraft]);

  const phase: "listening" | "stopping" | "thinking" | null = thinking
    ? "thinking"
    : dictation.phase === "idle"
      ? null
      : dictation.phase;

  return {
    available: voiceAvailable && dictation.available,
    phase,
    transcript: dictation.transcript,
    level: dictation.level,
    error: error ?? dictation.error,
    start,
    finish,
    cancel: dictation.cancel,
    clearError: () => {
      setError(null);
      dictation.clearError();
    },
  };
}
