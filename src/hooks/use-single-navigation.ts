import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";

/**
 * Wraps a navigation so a fast double tap opens the next screen only once.
 * The lock is synchronous (a ref, not state) and opens again when this
 * screen gets focus back.
 */
export function useSingleNavigation() {
  const busy = useRef(false);

  useFocusEffect(
    useCallback(() => {
      busy.current = false;
    }, []),
  );

  return useCallback((navigate: () => void) => {
    if (busy.current) return;
    busy.current = true;
    navigate();
  }, []);
}
