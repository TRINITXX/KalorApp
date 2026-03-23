import type { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "KalorApp",
  slug: "KalorApp",
  scheme: "kalorapp",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.kalorapp.app",
    appleTeamId: process.env.APPLE_TEAM_ID,
    icon: "./assets/app-icon.icon",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    entitlements: {
      "com.apple.security.application-groups": ["group.com.kalorapp.app"],
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
