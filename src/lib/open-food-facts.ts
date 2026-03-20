import type { Product, NutritionValues } from "@/types/nutrition";

const BASE_URL = "https://world.openfoodfacts.org";
const TIMEOUT_MS = 15000;
const MAX_RETRIES = 2;

interface OFFResponse {
  code: string;
  status: number;
  product?: {
    product_name?: string;
    brands?: string;
    image_front_url?: string;
    nutriments?: Record<string, number>;
  };
}

export function parseProduct(
  raw: OFFResponse,
): Omit<Product, "created_at"> | null {
  if (raw.status !== 1 || !raw.product) return null;

  const n = raw.product.nutriments ?? {};

  // Some products only have _prepared_100g variants (e.g. ready-to-cook items)
  const val = (key: string): number | undefined =>
    n[`${key}_100g`] ?? n[`${key}_prepared_100g`];
  const optVal = (key: string): number | null =>
    n[`${key}_100g`] ?? n[`${key}_prepared_100g`] ?? null;

  const sodium = optVal("sodium");
  const salt = optVal("salt") ?? (sodium != null ? sodium * 2.5 : null);

  const nutrition_per_100g: NutritionValues = {
    calories: val("energy-kcal") ?? 0,
    proteins: val("proteins") ?? 0,
    carbs: val("carbohydrates") ?? 0,
    fats: val("fat") ?? 0,
    fiber: optVal("fiber"),
    sugars: optVal("sugars"),
    saturated_fat: optVal("saturated-fat"),
    salt,
  };

  return {
    id: raw.code,
    name: raw.product.product_name ?? "Unknown",
    brand: raw.product.brands ?? null,
    image_url: raw.product.image_front_url ?? null,
    source: "openfoodfacts",
    nutrition_per_100g,
    last_quantity: 100,
  };
}

async function fetchWithTimeout(
  url: string,
  retries: number = MAX_RETRIES,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        return await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      if (attempt === retries) throw error;
      // Wait briefly before retry
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("Unreachable");
}

const PRODUCT_FIELDS = [
  "code",
  "product_name",
  "brands",
  "image_front_url",
  "nutriments",
].join(",");

export async function fetchProduct(
  ean: string,
): Promise<Omit<Product, "created_at"> | null> {
  const response = await fetchWithTimeout(
    `${BASE_URL}/api/v2/product/${ean}?fields=${PRODUCT_FIELDS}`,
  );
  const data: OFFResponse = await response.json();
  return parseProduct(data);
}

export interface SearchResult {
  id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  calories: number | null;
}

const SEARCH_FIELDS = [
  "code",
  "product_name",
  "brands",
  "image_front_small_url",
  "nutriments",
].join(",");

export async function searchProducts(query: string): Promise<SearchResult[]> {
  const encoded = encodeURIComponent(query);
  const response = await fetchWithTimeout(
    `${BASE_URL}/cgi/search.pl?search_terms=${encoded}&json=true&page_size=20&fields=${SEARCH_FIELDS}`,
  );
  const data = await response.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.products ?? []).map((p: any) => ({
    id: p.code,
    name: p.product_name ?? "Unknown",
    brand: p.brands ?? null,
    image_url: p.image_front_small_url ?? null,
    calories: p.nutriments?.["energy-kcal_100g"] ?? null,
  }));
}
