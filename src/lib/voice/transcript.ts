/**
 * Builds the full dictation from expo-speech-recognition "result" events.
 * In continuous mode on iOS 18+, a pause closes a segment (isFinal: true) and
 * the next results carry only the new words, so final segments add up; the
 * last event can be a final one with no result, which must not wipe the text.
 * On older iOS, results are cumulative and the single final one holds it all.
 */
export interface TranscriptState {
  committed: string;
  interim: string;
  lastFinal: string;
}

export const EMPTY_TRANSCRIPT: TranscriptState = { committed: "", interim: "", lastFinal: "" };

export function addResult(
  state: TranscriptState,
  event: { isFinal: boolean; results: { transcript: string }[] },
): TranscriptState {
  const text = event.results[0]?.transcript ?? "";
  if (text.trim() === "") return event.isFinal ? { ...state, interim: "" } : state;
  if (!event.isFinal) return { ...state, interim: text };
  // The same closing segment can be reported twice in a row.
  if (text.trim() === state.lastFinal && state.interim === "") return state;
  return {
    committed: joinWords(state.committed, text),
    interim: "",
    lastFinal: text.trim(),
  };
}

export function transcriptText(state: TranscriptState): string {
  return joinWords(state.committed, state.interim).trim();
}

function joinWords(a: string, b: string): string {
  if (a.trim() === "") return b.trim();
  if (b.trim() === "") return a.trim();
  return `${a.trim()} ${b.trim()}`;
}

// Said at the end of a dictation to finish it hands-free. Only words that never
// end a food: "fini" or "terminé" would cut "j'ai fini les lasagnes".
// No : without the u flag it splits accented words ("défini").
const STOP_WORDS = /(^|[\s,.;:!?…])(stop|c'est tout)[\s.,;:!?…]*$/i;

const straight = (text: string) => text.replace(/’/g, "'");

/** True when the dictation ends with "stop" or "c'est tout". */
export function endsWithStopWord(text: string): boolean {
  return STOP_WORDS.test(straight(text));
}

/** The dictation without its closing stop word. */
export function withoutStopWord(text: string): string {
  const t = straight(text);
  const match = STOP_WORDS.exec(t);
  return (match ? t.slice(0, match.index + match[1].length) : t).replace(/[\s,;:]+$/, "").trim();
}

/**
 * Finishes the dictation once "stop" has stayed the last word for `delayMs`.
 * The countdown starts at the first result ending with the stop word and is
 * not restarted by repeats of it: only words said after "stop" cancel it.
 */
export function createStopWordWatcher(onStop: () => void, delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return {
    update(text: string) {
      if (!endsWithStopWord(text)) return clear();
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        onStop();
      }, delayMs);
    },
    clear,
  };
}
