import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "KalorApp",
  slug: "KalorApp",
  scheme: "kalorapp",
  // runtimeVersion follows this version: bump it with every native change, so
  // over-the-air updates never reach a build that lacks their native modules.
  version: "1.1.0",
  updates: {
    url: "https://u.expo.dev/0342d525-6026-4429-bb49-c677043f1f19",
  },
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.kalorapp.app",
    appleTeamId: process.env.APPLE_TEAM_ID,
    runtimeVersion: {
      policy: "appVersion",
    },
    icon: "./assets/app-icon.icon",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    entitlements: {
      "com.apple.security.application-groups": ["group.com.kalorapp.app"],
      // First group = default group: the Claude key lands where Siri can read it.
      "keychain-access-groups": ["$(AppIdentifierPrefix)com.kalorapp.shared"],
    },
  },
  android: {
    package: "com.kalorapp.app",
    adaptiveIcon: {
      foregroundImage: "./assets/android-icon.png",
      backgroundImage: "./assets/android-icon.png",
      monochromeImage: "./assets/android-icon.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: [
    ["expo-router", { root: "./src/app" }],
    "expo-sqlite",
    "expo-image",
    "expo-sharing",
    "expo-secure-store",
    [
      "expo-speech-recognition",
      {
        microphonePermission:
          "KalorApp écoute ta voix quand tu touches le micro, pour noter ce que tu as mangé.",
        speechRecognitionPermission:
          "KalorApp transforme ta voix en texte pour retrouver les aliments que tu dictes.",
      },
    ],
    "@bacons/apple-targets",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      root: "./src/app",
    },
    eas: {
      projectId: "0342d525-6026-4429-bb49-c677043f1f19",
    },
  },
});
