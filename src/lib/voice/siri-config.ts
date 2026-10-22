import { setSharedValue } from "@/modules/widget-bridge";
import { API_VERSION, FALLBACK_BETA, buildRequestBody } from "@/lib/voice/claude";

/**
 * Hands the Claude request settings to the Siri extension (Swift), so the
 * prompt, schema and model stay defined once, here, and an over-the-air
 * update changes Siri's sorting too. Swift adds the user message.
 */
export function syncSiriVoiceConfig(): void {
  const { messages: _messages, ...requestTemplate } = buildRequestBody("");
  setSharedValue(
    "voiceConfig",
    JSON.stringify({
      requestTemplate,
      headers: { "anthropic-version": API_VERSION, "anthropic-beta": FALLBACK_BETA },
    }),
  );
}
