/** Lowercase without accents, so "pate" finds "Pâtes" and "creme" finds "Crème". */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** True when every word of the query appears in the name or the brand. */
export function matchesQuery(
  query: string,
  name: string,
  brand?: string | null,
): boolean {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeText(`${name} ${brand ?? ""}`);
  return words.every((w) => haystack.includes(w));
}
