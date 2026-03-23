import type { ProductCategory } from "@/types/database";

export interface NutritionValues {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  fiber: number | null;
  sugars: number | null;
  saturated_fat: number | null;
  salt: number | null;
}

export interface Product {
  id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  source: "openfoodfacts" | "manual";
  nutrition_per_100g: NutritionValues;
  last_quantity: number;
  category?: ProductCategory;
  created_at: string;
}

export interface Entry {
  id: number;
  product_id: string;
  product_name: string;
  meal: MealType;
  quantity: number;
  date: string;
  nutrition: NutritionValues;
  created_at: string;
}

export interface Favorite {
  product_id: string;
  sort_order: number;
  created_at: string;
  product?: Product;
}

export interface DailySummary {
  date: string;
  total: NutritionValues;
  by_meal: Record<MealType, { entries: Entry[]; subtotal: NutritionValues }>;
}

export interface WeeklySummary {
  start_date: string;
  end_date: string;
  daily_totals: { date: string; total: NutritionValues }[];
  week_total: NutritionValues;
}

export interface Goals {
  calories: number | null;
  proteins: number | null;
  carbs: number | null;
  fats: number | null;
  fiber: number | null;
  sugars: number | null;
  saturated_fat: number | null;
  salt: number | null;
}

export type MealType = "breakfast" | "lunch" | "snack" | "dinner";
