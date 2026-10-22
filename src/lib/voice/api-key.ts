import { loadSecureStore } from "@/lib/voice/native";

const KEY_NAME = "anthropic_api_key";

/**
 * Shared with the Siri extension: both targets list the keychain group
 * "$(AppIdentifierPrefix)com.kalorapp.shared" first, so items written without
 * an explicit group land there. "After first unlock" lets Siri read the key
 * while the phone is locked. Mirror of targets/widget/ClaudeKey.swift.
 */
const OPTIONS = { keychainService: "kalorapp" } as const;

export async function getApiKey(): Promise<string | null> {
  const store = loadSecureStore();
  if (!store) return null;
  try {
    return (await store.getItemAsync(KEY_NAME, OPTIONS)) || null;
  } catch {
    return null;
  }
}

export async function saveApiKey(value: string): Promise<void> {
  const store = loadSecureStore();
  if (!store) throw new Error("Secure store unavailable");
  const key = value.trim();
  if (key === "") await store.deleteItemAsync(KEY_NAME, OPTIONS);
  else
    await store.setItemAsync(KEY_NAME, key, {
      ...OPTIONS,
      keychainAccessible: store.AFTER_FIRST_UNLOCK,
    });
}
