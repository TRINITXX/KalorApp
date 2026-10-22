import { z } from "zod";

import type { CatalogProduct } from "@/db/queries/products";
import type { ProductCategory } from "@/types/database";
import type { MealType } from "@/types/nutrition";

const MAX_GRAMS = 5000;

const replySchema = z.object({
  items: z.array(
    z.object({
      spoken: z.string(),
      product_index: z.number().int().nullable(),
      grams: z.number(),
      quantity_source: z.enum(["said", "portion", "estimated"]),
      new_product: z
        .object({
          name: z.string(),
          category: z.enum(["meat", "side", "seasoning", "dessert"]),
          calories: z.number(),
          proteins: z.number(),
          carbs: z.number(),
          fats: z.number(),
        })
        .nullable(),
    }),
  ),
  meal: z.enum(["breakfast", "lunch", "snack", "dinner"]).nullable(),
  day_offset: z.number().int(),
  not_understood: z.array(z.string()),
});

export type VoiceReply = z.infer<typeof replySchema>;

export interface NewProductDraft {
  name: string;
  category: ProductCategory;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

export type VoiceFood =
  | { kind: "known"; product: CatalogProduct; grams: number; spoken: string }
  | { kind: "estimated"; draft: NewProductDraft; grams: number; spoken: string };

export interface VoiceMeal {
  foods: VoiceFood[];
  meal: MealType | null;
  /** 0 for today, -1 for yesterday. */
  dayOffset: 0 | -1;
  notUnderstood: string[];
}

export class VoiceReplyError extends Error {}

const clampGrams = (g: number) => Math.min(Math.max(Math.round(g), 1), MAX_GRAMS);
const nonNegative = (n: number) => Math.max(0, Math.round(n * 10) / 10);

/**
 * Turns Claude's JSON into foods ready for the add screen. A product index
 * outside the list counts as unknown food; an unknown food without estimated
 * values is reported as not understood rather than invented.
 */
export function interpretReply(raw: unknown, byIndex: Map<number, CatalogProduct>): VoiceMeal {
  const parsed = replySchema.safeParse(raw);
  if (!parsed.success) throw new VoiceReplyError("Réponse de Claude illisible");
  const reply = parsed.data;

  const foods: VoiceFood[] = [];
  const notUnderstood = [...reply.not_understood];
  for (const item of reply.items) {
    if (!(item.grams > 0)) {
      notUnderstood.push(item.spoken);
      continue;
    }
    const product = item.product_index != null ? byIndex.get(item.product_index) : undefined;
    if (product) {
      foods.push({ kind: "known", product, grams: clampGrams(item.grams), spoken: item.spoken });
    } else if (item.new_product && item.new_product.name.trim() !== "") {
      const d = item.new_product;
      foods.push({
        kind: "estimated",
        spoken: item.spoken,
        grams: clampGrams(item.grams),
        draft: {
          name: d.name.trim(),
          category: d.category,
          calories: nonNegative(d.calories),
          proteins: nonNegative(d.proteins),
          carbs: nonNegative(d.carbs),
          fats: nonNegative(d.fats),
        },
      });
    } else {
      notUnderstood.push(item.spoken);
    }
  }

  return {
    foods,
    meal: reply.meal,
    dayOffset: reply.day_offset === -1 ? -1 : 0,
    notUnderstood,
  };
}
