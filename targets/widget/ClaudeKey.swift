import Foundation
import Security

/// Reads the Claude API key the app saved with expo-secure-store.
/// Mirror of src/lib/voice/api-key.ts: service "kalorapp" plus expo's
/// ":no-auth" suffix, account = the key name as UTF-8 data. Both targets list
/// the keychain group "$(AppIdentifierPrefix)com.kalorapp.shared" first.
enum ClaudeKey {
    static func read() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "kalorapp:no-auth",
            kSecAttrAccount as String: Data("anthropic_api_key".utf8),
            kSecMatchLimit as String: kSecMatchLimitOne,
            kSecReturnData as String: true,
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let key = String(data: data, encoding: .utf8),
              !key.isEmpty
        else { return nil }
        return key
    }
}
