import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { formatDateISO, msUntilMidnight } from "@/lib/dates";

/**
 * Today's local date, kept fresh: it rolls over at midnight and when the app
 * comes back to the foreground after a night in the background.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => formatDateISO());

  useEffect(() => {
    const refresh = () => setToday(formatDateISO());
    let timer = setTimeout(function tick() {
      refresh();
      timer = setTimeout(tick, msUntilMidnight() + 1000);
    }, msUntilMidnight() + 1000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return today;
}
