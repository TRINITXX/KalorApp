import type { CatalogProduct } from "@/db/queries/products";
import { buildRequestBody } from "@/lib/voice/claude";
import { interpretReply, VoiceReplyError } from "@/lib/voice/interpret";
import { buildCatalog, VOICE_MODEL } from "@/lib/voice/prompt";
import { prepareVoiceDraft } from "@/lib/voice/run-voice";

function product(id: string, name: string, extra: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id,
    name,
    brand: null,
    image_url: null,
    source: "manual",
    calories: 100,
    proteins: 10,
    carbs: 10,
    fats: 1,
    fiber: null,
    sugars: null,
    saturated_fat: null,
    salt: null,
    category: "side",
    last_quantity: 100,
    created_at: "2026-10-22 10:00:00",
    is_favorite: 0,
    favorite_quantity: null,
    ...extra,
  };
}

const item = (over: object) => ({
  spoken: "x",
  product_index: null,
  grams: 100,
  quantity_source: "said",
  new_product: null,
  ...over,
});

describe("buildCatalog", () => {
  it("numbers favorites first and gives each usual portion", () => {
    const { text, byIndex } = buildCatalog([
      product("a", "Riz basmati cuit", { last_quantity: 180 }),
      product("b", "Yaourt grec", { is_favorite: 1, favorite_quantity: 125, brand: "Fage" }),
    ]);
    expect(text.split("\n")).toEqual([
      "1. ★ Yaourt grec (Fage) | portion 125 g | 100 kcal/100 g",
      "2. Riz basmati cuit | portion 180 g | 100 kcal/100 g",
    ]);
    expect(byIndex.get(1)?.id).toBe("b");
  });
});

describe("interpretReply", () => {
  const { byIndex } = buildCatalog([product("riz", "Riz basmati cuit")]);

  it("maps a listed product and rounds its grams", () => {
    const meal = interpretReply(
      { items: [item({ product_index: 1, grams: 182.4 })], meal: null, day_offset: 0, not_understood: [] },
      byIndex,
    );
    expect(meal.foods).toEqual([
      { kind: "known", product: byIndex.get(1), grams: 182, spoken: "x" },
    ]);
  });

  it("keeps an unknown food as an estimate when Claude gives its values", () => {
    const meal = interpretReply(
      {
        items: [
          item({
            spoken: "une part de quiche",
            grams: 150,
            quantity_source: "estimated",
            new_product: { name: "Quiche lorraine", category: "side", calories: 280, proteins: 9, carbs: 18, fats: 19 },
          }),
        ],
        meal: "dinner",
        day_offset: 0,
        not_understood: [],
      },
      byIndex,
    );
    expect(meal.foods[0]).toMatchObject({ kind: "estimated", grams: 150, draft: { name: "Quiche lorraine" } });
    expect(meal.meal).toBe("dinner");
  });

  it("reports a food with neither a match nor values as not understood", () => {
    const meal = interpretReply(
      { items: [item({ spoken: "un truc", product_index: 99 })], meal: null, day_offset: 0, not_understood: [] },
      byIndex,
    );
    expect(meal.foods).toEqual([]);
    expect(meal.notUnderstood).toEqual(["un truc"]);
  });

  it("understands yesterday and nothing further back", () => {
    const base = { items: [], meal: null, not_understood: [] };
    expect(interpretReply({ ...base, day_offset: -1 }, byIndex).dayOffset).toBe(-1);
    expect(interpretReply({ ...base, day_offset: -5 }, byIndex).dayOffset).toBe(0);
  });

  it("rejects a reply that does not follow the schema", () => {
    expect(() => interpretReply({ items: "nope" }, byIndex)).toThrow(VoiceReplyError);
  });
});

describe("buildRequestBody", () => {
  it("asks Sonnet for JSON in the schema, without removed sampling settings", () => {
    const body = buildRequestBody("Ce que j'ai mangé : « riz »");
    expect(body.model).toBe(VOICE_MODEL);
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body).not.toHaveProperty("temperature");
  });
});

describe("prepareVoiceDraft", () => {
  it("adds up a product said twice and saves estimated foods as new products", async () => {
    const writes: unknown[][] = [];
    const db = { runAsync: async (...args: unknown[]) => void writes.push(args) };
    const riz = product("riz", "Riz basmati cuit");
    const draft = await prepareVoiceDraft(
      db as never,
      {
        foods: [
          { kind: "known", product: riz, grams: 150, spoken: "du riz" },
          { kind: "known", product: riz, grams: 50, spoken: "encore du riz" },
          {
            kind: "estimated",
            grams: 150,
            spoken: "une part de quiche",
            draft: { name: "Quiche lorraine", category: "side", calories: 280, proteins: 9, carbs: 18, fats: 19 },
          },
        ],
        meal: null,
        dayOffset: 0,
        notUnderstood: [],
      },
      "du riz, encore du riz et une part de quiche",
    );
    expect(draft.selection.riz).toBe(200);
    expect(draft.estimatedNames).toEqual(["Quiche lorraine"]);
    const quicheId = Object.keys(draft.selection).find((id) => id.startsWith("estimated-"));
    expect(draft.selection[quicheId!]).toBe(150);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("estimated");
  });
});
