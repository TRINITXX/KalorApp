/** Local calendar date as "YYYY-MM-DD", the format of `entries.date`. */
export function formatDateISO(date?: Date): string {
  const d = date ?? new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Local midnight of a "YYYY-MM-DD" date. */
export function parseDateISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseDateISO(iso);
  d.setDate(d.getDate() + days);
  return formatDateISO(d);
}

/** Monday of the week containing `iso` (weeks start on Monday in France). */
export function mondayOf(iso: string): string {
  const d = parseDateISO(iso);
  const offset = (d.getDay() + 6) % 7;
  return addDays(iso, -offset);
}

/** "Aujourd'hui", "Hier", or "lundi 20 octobre". */
export function formatDayTitle(iso: string, today: string): string {
  if (iso === today) return "Aujourd'hui";
  if (iso === addDays(today, -1)) return "Hier";
  return parseDateISO(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** "mercredi 22 octobre", shown under the day title. */
export function formatDaySubtitle(iso: string): string {
  return parseDateISO(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Milliseconds until the next local midnight. */
export function msUntilMidnight(now: Date = new Date()): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}
