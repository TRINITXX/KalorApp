import { requireNativeModule, Platform } from "expo-modules-core";

interface WidgetBridgeModule {
  getSharedContainerPath(): string | null;
  setWidgetData(jsonString: string): void;
  reloadWidgets(): void;
  /** Linked from build 1.2.0 on: the whole module is missing before. */
  setSharedValue?(key: string, value: string): void;
}

const isIOS = Platform.OS === "ios";

let NativeModule: WidgetBridgeModule | null = null;
if (isIOS) {
  try {
    NativeModule = requireNativeModule("WidgetBridge");
  } catch {
    // Module not available in old dev builds — safe to ignore
  }
}

export function getSharedContainerPath(): string | null {
  return NativeModule?.getSharedContainerPath() ?? null;
}

export function setWidgetData(jsonString: string): void {
  NativeModule?.setWidgetData(jsonString);
}

export function reloadWidgets(): void {
  NativeModule?.reloadWidgets();
}

/** Writes a string the Siri extension reads from the app group. */
export function setSharedValue(key: string, value: string): void {
  NativeModule?.setSharedValue?.(key, value);
}
