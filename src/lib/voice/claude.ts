import { OUTPUT_SCHEMA, SYSTEM_PROMPT, VOICE_MODEL } from "@/lib/voice/prompt";

// Raw HTTP on purpose: the official Anthropic TypeScript SDK does not support
// React Native ("React Native is not supported at this time", SDK README).
const API_URL = "https://api.anthropic.com/v1/messages";
export const API_VERSION = "2026-10-21";
// Server-side fallback when a safety classifier declines (Claude API only).
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const TIMEOUT_MS = 25_000;

export type ClaudeErrorKind =
  | "missing-key"
  | "bad-key"
  | "rate-limited"
  | "overloaded"
  | "network"
  | "timeout"
  | "refused"
  | "invalid-reply";

export class ClaudeError extends Error {
  constructor(
    readonly kind: ClaudeErrorKind,
    message: string,
  ) {
    super(message);
  }
}

/** French message shown to the user for each failure. */
export const CLAUDE_ERROR_MESSAGES: Record<ClaudeErrorKind, string> = {
  "missing-key": "Ajoute ta clé Claude dans Réglages pour utiliser la dictée.",
  "bad-key": "Ta clé Claude est refusée. Vérifie-la dans Réglages.",
  "rate-limited": "Trop de demandes d'un coup. Réessaie dans une minute.",
  overloaded: "Claude est surchargé. Réessaie dans un instant.",
  network: "Pas de réseau. Réessaie quand tu es connecté.",
  timeout: "Claude met trop de temps à répondre. Réessaie.",
  refused: "Claude n'a pas voulu traiter cette phrase. Reformule-la.",
  "invalid-reply": "Réponse de Claude illisible. Réessaie.",
};

export function buildRequestBody(userMessage: string) {
  return {
    model: VOICE_MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      // Sorting a list is simple: low effort keeps the answer fast for Siri.
      effort: "low",
      format: { type: "json_schema", schema: OUTPUT_SCHEMA },
    },
    fallbacks: "default",
  };
}

interface MessagesResponse {
  stop_reason: string | null;
  content: { type: string; text?: string }[];
}

/** Sends the dictated meal to Claude and returns its parsed JSON reply. */
export async function askClaude(apiKey: string | null, userMessage: string): Promise<unknown> {
  if (!apiKey) throw new ClaudeError("missing-key", "No API key");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": API_VERSION,
        "anthropic-beta": FALLBACK_BETA,
      },
      body: JSON.stringify(buildRequestBody(userMessage)),
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    throw new ClaudeError(aborted ? "timeout" : "network", String(e));
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (response.status === 401 || response.status === 403) throw new ClaudeError("bad-key", detail);
    if (response.status === 429) throw new ClaudeError("rate-limited", detail);
    if (response.status === 529 || response.status >= 500) throw new ClaudeError("overloaded", detail);
    throw new ClaudeError("invalid-reply", `HTTP ${response.status}: ${detail}`);
  }

  const data = (await response.json()) as MessagesResponse;
  if (data.stop_reason === "refusal") throw new ClaudeError("refused", "Refused");
  // Thinking blocks may come first: read the text block, not the first block.
  const text = data.content.find((b) => b.type === "text")?.text;
  if (data.stop_reason === "max_tokens" || !text) {
    throw new ClaudeError("invalid-reply", `stop_reason ${data.stop_reason}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ClaudeError("invalid-reply", "Not JSON");
  }
}

/**
 * Checks a key without spending tokens: listing models is free. A rate limit
 * still proves the key works; a server error only means "try again later".
 */
export async function checkApiKey(apiKey: string): Promise<"ok" | "bad-key" | "network" | "unavailable"> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/models?limit=1", {
      headers: { "x-api-key": apiKey.trim(), "anthropic-version": API_VERSION },
    });
    if (response.ok || response.status === 429) return "ok";
    if (response.status === 401 || response.status === 403) return "bad-key";
    return "unavailable";
  } catch {
    return "network";
  }
}
