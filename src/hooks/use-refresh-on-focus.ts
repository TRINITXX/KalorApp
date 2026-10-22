import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useFocusEffect, useIsFocused } from "expo-router";

/**
 * Runs `load` when the screen gets focus, and again when the app comes back
 * to the foreground while the screen is shown: Siri writes to the database
 * while the app sleeps, and a plain focus effect would miss it.
 * `load` must be stable (useCallback); its cleanup cancels a pending load.
 */
export function useRefreshOnFocus(load: () => void | (() => void)) {
  const isFocused = useIsFocused();
  const loadRef = useRef(load);
  loadRef.current = load;

  useFocusEffect(load);

  useEffect(() => {
    if (!isFocused) return;
    let cleanup: void | (() => void);
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (typeof cleanup === "function") cleanup();
      cleanup = loadRef.current();
    });
    return () => {
      sub.remove();
      if (typeof cleanup === "function") cleanup();
    };
  }, [isFocused]);
}
