import { defaultPortion, UPSERT_PRODUCT_SQL } from "@/db/queries/products";

describe("UPSERT_PRODUCT_SQL", () => {
  it("updates the source, so a checked estimate stops being an estimate", () => {
    expect(UPSERT_PRODUCT_SQL).toContain("source = excluded.source");
  });
});

describe("defaultPortion", () => {
  it("prefers the favorite portion, then the last quantity, then 100 g", () => {
    expect(defaultPortion({ favorite_quantity: 125, last_quantity: 200 })).toBe(125);
    expect(defaultPortion({ favorite_quantity: null, last_quantity: 200 })).toBe(200);
    expect(defaultPortion({ favorite_quantity: null, last_quantity: null })).toBe(100);
  });
});
