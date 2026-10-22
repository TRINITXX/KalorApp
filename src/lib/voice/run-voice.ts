import type { SQLiteDatabase } from "expo-sqlite";

import { getCatalog, upsertProduct } from "@/db/queries/products";
import { getApiKey } from "@/lib/voice/api-key";
import { askClaude } from "@/lib/voice/claude";
import { interpretReply, type VoiceMeal } from "@/lib/voice/interpret";
import { buildCatalog, buildUserMessage } from "@/lib/voice/prompt";
import type { MealType } from "@/types/nutrition";

/** What the add screen needs to show a dictated meal, ready to confirm. */
export interface VoiceDraft {
  transcript: string;
  /** Grams per product id, estimated products included. */
  selection: Record<string, number>;
  meal: MealType | null;
  dayOffset: 0 | -1;
  estimatedNames: string[];
  notUnderstood: string[];
}

/** Sends the transcript to Claude with the user's products and reads the reply. */
export async function interpretDictation(db: SQLiteDatabase, transcript: string): Promise<VoiceMeal> {
  const catalog = buildCatalog(await getCatalog(db));
  const raw = await askClaude(await getApiKey(), buildUserMessage(transcript, catalog.text));
  return interpretReply(raw, catalog.byIndex);
}

/**
 * Saves the foods Claude had to estimate as new products (not favorites,
 * marked "estimated" until checked by hand) and builds the selection.
 */
export async function prepareVoiceDraft(
  db: SQLiteDatabase,
  meal: VoiceMeal,
  transcript: string,
): Promise<VoiceDraft> {
  const selection: Record<string, number> = {};
  const estimatedNames: string[] = [];
  const stamp = Date.now().toString(36);

  for (const [i, food] of meal.foods.entries()) {
    let id: string;
    if (food.kind === "known") {
      id = food.product.id;
    } else {
      id = `estimated-${stamp}-${i}`;
      await upsertProduct(db, {
        id,
        name: food.draft.name,
        brand: null,
        image_url: null,
        source: "estimated",
        category: food.draft.category,
        calories: food.draft.calories,
        proteins: food.draft.proteins,
        carbs: food.draft.carbs,
        fats: food.draft.fats,
        fiber: null,
        sugars: null,
        saturated_fat: null,
        salt: null,
        last_quantity: food.grams,
      });
      estimatedNames.push(food.draft.name);
    }
    // The same product said twice ("du riz… et encore du riz") adds up.
    selection[id] = (selection[id] ?? 0) + food.grams;
  }

  return {
    transcript,
    selection,
    meal: meal.meal,
    dayOffset: meal.dayOffset,
    estimatedNames,
    notUnderstood: meal.notUnderstood,
  };
}
