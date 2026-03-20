import { requireNativeModule, Platform } from "expo-modules-core";

interface WidgetBridgeModule {
  getSharedContainerPath(): string | null;
  setWidgetData(jsonString: string): void;
  reloadWidgets(): void;
}

const isIOS = Platform.OS === "ios";

const NativeModule: WidgetBridgeModule | null = isIOS
  ? requireNativeModule("WidgetBridge")
  : null;

export function getSharedContainerPath(): string | null {
  return NativeModule?.getSharedContainerPath() ?? null;
}

export function setWidgetData(jsonString: string): void {
  NativeModule?.setWidgetData(jsonString);
}

export function reloadWidgets(): void {
  NativeModule?.reloadWidgets();
}
