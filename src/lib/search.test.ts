import { matchesQuery } from "@/lib/search";

describe("matchesQuery", () => {
  it("ignores accents and case", () => {
    expect(matchesQuery("pate", "Pâtes complètes")).toBe(true);
    expect(matchesQuery("CREME", "Crème fraîche")).toBe(true);
  });

  it("needs every word, in any order, in the name or the brand", () => {
    expect(matchesQuery("grec yaourt", "Yaourt grec", null)).toBe(true);
    expect(matchesQuery("yaourt danone", "Yaourt grec", "Danone")).toBe(true);
    expect(matchesQuery("yaourt soja", "Yaourt grec", "Danone")).toBe(false);
  });

  it("matches everything on an empty query", () => {
    expect(matchesQuery("  ", "Riz")).toBe(true);
  });
});
