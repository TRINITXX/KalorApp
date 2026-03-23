import type { ProductCategory } from "@/types/database";

export const CATEGORIES: { type: ProductCategory; label: string }[] = [
  { type: "meat", label: "Viande / Poisson" },
  { type: "side", label: "Accompagnement" },
  { type: "seasoning", label: "Assaisonnement" },
];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  meat: "Viande / Poisson",
  side: "Accompagnement",
  seasoning: "Assaisonnement",
};
