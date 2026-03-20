import type { Product, NutritionValues } from "@/types/nutrition";

const BASE_URL = "https://world.openfoodfacts.org";
const USER_AGENT = "KalorApp/1.0 (personal project)";
const TIMEOUT_MS = 5000;

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
  const salt =
    n.salt_100g ?? (n.sodium_100g != null ? n.sodium_100g * 2.5 : null);

  const nutrition_per_100g: NutritionValues = {
    calories: n["energy-kcal_100g"] ?? 0,
    proteins: n.proteins_100g ?? 0,
    carbs: n.carbohydrates_100g ?? 0,
    fats: n.fat_100g ?? 0,
    fiber: n.fiber_100g ?? null,
    sugars: n.sugars_100g ?? null,
    saturated_fat: n["saturated-fat_100g"] ?? null,
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
  retries: number = 1,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        return await fetch(url, {
          headers: { "User-Agent": USER_AGENT },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      if (attempt === retries) throw error;
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
