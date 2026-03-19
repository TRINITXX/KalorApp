export interface ProductRow {
  id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  source: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  fiber: number | null;
  sugars: number | null;
  saturated_fat: number | null;
  salt: number | null;
  last_quantity: number;
  created_at: string;
}

export interface EntryRow {
  id: number;
  product_id: string;
  product_name: string;
  meal: string;
  quantity: number;
  date: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  fiber: number | null;
  sugars: number | null;
  saturated_fat: number | null;
  salt: number | null;
  created_at: string;
}

export interface FavoriteRow {
  product_id: string;
  sort_order: number;
  created_at: string;
}
