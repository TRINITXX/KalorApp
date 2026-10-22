import {
  entryNutrition,
  entryPer100g,
  exportEntriesCsv,
  formatAmount,
} from "@/lib/nutrition-utils";

const chicken = {
  calories: 165,
  proteins: 31,
  carbs: 0,
  fats: 3.6,
  fiber: null,
  sugars: 0,
  saturated_fat: 1,
  salt: 0.18,
};

describe("entryNutrition", () => {
  it("scales per-100 g values to the quantity, rounded to 0.1", () => {
    expect(entryNutrition(chicken, 150)).toEqual({
      calories: 247.5,
      proteins: 46.5,
      carbs: 0,
      fats: 5.4,
      fiber: null,
      sugars: 0,
      saturated_fat: 1.5,
      salt: 0.3,
    });
  });
});

describe("exportEntriesCsv", () => {
  it("escapes product names holding quotes or commas", () => {
    const csv = exportEntriesCsv([
      {
        date: "2026-10-22",
        meal: "lunch",
        product_name: 'Yaourt "grec", nature',
        quantity: 150,
        calories: 146,
        proteins: 9,
        carbs: 6,
        fats: 9,
        fiber: null,
        sugars: null,
        saturated_fat: null,
        salt: null,
      },
    ]);
    expect(csv.split("\n")[1]).toBe(
      '2026-10-22,lunch,"Yaourt ""grec"", nature",150,146,9,6,9,,,,',
    );
  });
});

describe("entryPer100g", () => {
  it("gives back the values per 100 g recorded in the entry", () => {
    const entry = { quantity: 150, ...entryNutrition(chicken, 150) };
    // Stored values are rounded to 0.1, so the way back is close, not exact.
    expect(entryPer100g(entry)).toEqual({
      calories: expect.closeTo(165, 5),
      proteins: expect.closeTo(31, 5),
      carbs: 0,
      fats: expect.closeTo(3.6, 5),
      fiber: null,
      sugars: 0,
      saturated_fat: expect.closeTo(1, 5),
      salt: expect.closeTo(0.2, 5),
    });
  });
});

describe("formatAmount", () => {
  it("keeps one decimal only when there is one", () => {
    expect(formatAmount(2.5)).toBe("2,5");
    expect(formatAmount(3)).toBe("3");
  });
});
