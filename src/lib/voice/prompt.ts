import { defaultPortion, type CatalogProduct } from "@/db/queries/products";

/**
 * Everything sent to Claude to sort a dictated meal. The Siri side (Swift)
 * receives SYSTEM_PROMPT and OUTPUT_SCHEMA from the app through the app group,
 * so these stay the single source of the instructions.
 */

export const VOICE_MODEL = "claude-sonnet-5-5";

export const SYSTEM_PROMPT = `Tu tries ce que l'utilisateur a mangé, dicté à voix haute en français, pour son journal de calories.

Tu reçois la liste numérotée de ses produits. ★ marque ses favoris. Chaque ligne donne sa portion habituelle et les calories pour 100 g.

Pour chaque aliment dicté :
- Retrouve le produit de la liste qui correspond au même aliment, même formulé autrement (« des pâtes » = « Pâtes complètes cuites »). Si deux produits se ressemblent, préfère le favori, ou la marque citée.
- Quantité dite en grammes, kilos ou millilitres : convertis en grammes (1 ml de boisson ≈ 1 g).
- Quantité en unités (« 2 yaourts », « un œuf ») : si la portion habituelle du produit correspond à une unité, multiplie-la. Sinon, estime le poids courant d'une unité.
- Pas de quantité : prends la portion habituelle du produit (quantity_source "portion").
- Taille vague (« une grosse assiette », « un bol ») : estime les grammes.
- Aliment absent de la liste : product_index null, et new_product avec un nom court en français, sa catégorie et des valeurs réalistes pour 100 g (tables de composition françaises). N'invente jamais un aliment qui n'a pas été dit.
- Un plat composé non listé (« une part de quiche ») reste un seul aliment.

meal : seulement si le repas est dit (« ce midi » = lunch, « ce soir » = dinner, « au goûter » = snack, « au petit-déj » = breakfast), sinon null.
day_offset : -1 si l'utilisateur parle d'hier, sinon 0.
not_understood : les morceaux de phrase qui ne sont pas des aliments compris, sinon une liste vide.`;

const nullable = (schema: object) => ({ anyOf: [schema, { type: "null" }] });

export const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "meal", "day_offset", "not_understood"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["spoken", "product_index", "grams", "quantity_source", "new_product"],
        properties: {
          spoken: { type: "string", description: "Les mots dictés pour cet aliment." },
          product_index: nullable({ type: "integer" }),
          grams: { type: "number" },
          quantity_source: { type: "string", enum: ["said", "portion", "estimated"] },
          new_product: nullable({
            type: "object",
            additionalProperties: false,
            required: ["name", "category", "calories", "proteins", "carbs", "fats"],
            properties: {
              name: { type: "string" },
              category: { type: "string", enum: ["meat", "side", "seasoning", "dessert"] },
              calories: { type: "number" },
              proteins: { type: "number" },
              carbs: { type: "number" },
              fats: { type: "number" },
            },
          }),
        },
      },
    },
    meal: nullable({ type: "string", enum: ["breakfast", "lunch", "snack", "dinner"] }),
    day_offset: { type: "integer" },
    not_understood: { type: "array", items: { type: "string" } },
  },
} as const;

export interface Catalog {
  text: string;
  /** Product for each 1-based index of the list. */
  byIndex: Map<number, CatalogProduct>;
}

const fmt = (n: number) => String(Math.round(n * 10) / 10);

/** Numbered product list, favorites first, as Claude reads it. */
export function buildCatalog(products: CatalogProduct[]): Catalog {
  const ordered = [...products].sort((a, b) => b.is_favorite - a.is_favorite);
  const byIndex = new Map<number, CatalogProduct>();
  const lines = ordered.map((p, i) => {
    byIndex.set(i + 1, p);
    const star = p.is_favorite ? "★ " : "";
    const brand = p.brand ? ` (${p.brand})` : "";
    return `${i + 1}. ${star}${p.name}${brand} | portion ${fmt(defaultPortion(p))} g | ${fmt(p.calories)} kcal/100 g`;
  });
  return { text: lines.join("\n"), byIndex };
}

export function buildUserMessage(transcript: string, catalogText: string): string {
  return `Mes produits :\n${catalogText || "(aucun produit)"}\n\nCe que j'ai mangé : « ${transcript.trim()} »`;
}
