# Product Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add product categories (Viande/Poisson, Accompagnement, Assaisonnement) and restructure the meal-building flow into category-based steps.

**Architecture:** New `category` column on `products` table with migration. Reusable `CategorySelector` pill component (same pattern as `MealSelector`). Category selection integrated into confirm, manual, and product-detail screens. Add-entry index refactored from 2-step to 4-step flow (meat → side → seasoning → recap).

**Tech Stack:** expo-sqlite migrations, React Native Pressable pills, Zod schema, existing UI patterns

---

### Task 1: Data model — types, constants, migration

**Files:**

- Create: `src/constants/categories.ts`
- Modify: `src/types/database.ts`
- Modify: `src/db/schema.ts`
- Modify: `src/db/migrations.ts`

- [ ] **Step 1: Create category constants**

Create `src/constants/categories.ts`:

```typescript
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
```

- [ ] **Step 2: Add ProductCategory type and update ProductRow**

In `src/types/database.ts`, add:

```typescript
export type ProductCategory = "meat" | "side" | "seasoning";
```

Add to `ProductRow` interface after `salt`:

```typescript
category: ProductCategory;
```

- [ ] **Step 3: Add migration for category column**

In `src/db/migrations.ts`:

- Bump `CURRENT_VERSION` from `2` to `3`
- Add migration block:

```typescript
if (currentVersion < 3) {
  await db.execAsync(
    "ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'side'",
  );
}
```

- [ ] **Step 4: Update schema.ts for fresh installs**

In `src/db/schema.ts`, add to `CREATE_PRODUCTS_TABLE` after `last_quantity`:

```sql
category TEXT NOT NULL DEFAULT 'side',
```

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: Errors in files that use `ProductRow` without `category` (products.ts, product-utils.ts, etc.) — these are fixed in next tasks.

- [ ] **Step 6: Commit**

```bash
git add src/constants/categories.ts src/types/database.ts src/db/schema.ts src/db/migrations.ts
git commit -m "feat(db): add product category column with migration"
```

---

### Task 2: Update queries and utils for category

**Files:**

- Modify: `src/db/queries/products.ts`
- Modify: `src/lib/product-utils.ts`

- [ ] **Step 1: Update upsertProduct**

In `src/db/queries/products.ts`, add `category` to the INSERT column list (after `last_quantity`) and the VALUES placeholders. Add `category = excluded.category` to the ON CONFLICT clause. Add `product.category` to the parameter list (after `product.last_quantity`).

INSERT columns become 15 (add `category`), VALUES gets 15 `?`, ON CONFLICT adds `category = excluded.category`.

- [ ] **Step 2: Add optional category to Product type**

In `src/types/nutrition.ts`, add to the `Product` interface (after `last_quantity`):

```typescript
category?: import("@/types/database").ProductCategory;
```

Or import `ProductCategory` at the top and use it.

- [ ] **Step 3: Update flattenProductForDb**

In `src/lib/product-utils.ts`, add to the return object of `flattenProductForDb`:

```typescript
category: product.category ?? "side",
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: Remaining errors in screens that create `Omit<ProductRow, "created_at">` inline without `category`.

- [ ] **Step 4: Commit**

```bash
git add src/db/queries/products.ts src/lib/product-utils.ts
git commit -m "feat(db): add category to upsertProduct and flattenProductForDb"
```

---

### Task 3: Create CategorySelector component

**Files:**

- Create: `src/components/nutrition/category-selector.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/nutrition/category-selector.tsx` following `MealSelector` pattern:

```typescript
import { Pressable, Text, View } from "react-native";

import { CATEGORIES } from "@/constants/categories";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { ProductCategory } from "@/types/database";

interface CategorySelectorProps {
  value: ProductCategory;
  onChange: (category: ProductCategory) => void;
}

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  const colors = useThemeColors();

  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {CATEGORIES.map((cat) => {
        const isSelected = value === cat.type;
        return (
          <Pressable
            key={cat.type}
            onPress={() => onChange(cat.type)}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 8,
              paddingHorizontal: 6,
              borderRadius: 10,
              borderCurve: "continuous",
              borderWidth: 1.5,
              borderColor: isSelected
                ? colors.accent.calories
                : colors.separator,
              backgroundColor: isSelected
                ? colors.isDark
                  ? "rgba(74,222,128,0.12)"
                  : "rgba(22,163,74,0.08)"
                : "transparent",
              alignItems: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: isSelected ? "600" : "500",
                color: isSelected
                  ? colors.accent.calories
                  : colors.textSecondary,
                textAlign: "center",
              }}
              numberOfLines={1}
            >
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/nutrition/category-selector.tsx
git commit -m "feat(ui): add CategorySelector pill component"
```

---

### Task 4: Integrate category into confirm screen

**Files:**

- Modify: `src/app/add-entry/confirm.tsx`

- [ ] **Step 1: Add category state and selector**

Import `CategorySelector` and `ProductCategory`. Add state:

```typescript
const [category, setCategory] = useState<ProductCategory>("side");
```

Initialize from product in `useFocusEffect` (after `setProduct(p)`):

```typescript
setCategory(p.category);
```

Add `<CategorySelector value={category} onChange={setCategory} />` between the product card and the "Quantité" section.

- [ ] **Step 2: Save category on add**

In `handleAdd`, before `addEntry`, update product category if changed:

```typescript
if (category !== currentProduct.category) {
  currentProduct = { ...currentProduct, category };
  const { created_at, ...rest } = currentProduct;
  await upsertProduct(db, rest);
  setProduct(currentProduct);
}
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/app/add-entry/confirm.tsx
git commit -m "feat(confirm): add category selector to confirm screen"
```

---

### Task 5: Integrate category into manual entry

**Files:**

- Modify: `src/app/add-entry/manual.tsx`

- [ ] **Step 1: Add category to form**

Import `CategorySelector` and `ProductCategory`. Add state:

```typescript
const [category, setCategory] = useState<ProductCategory>("side");
```

Add `<CategorySelector>` in the JSX after the name field, before "Valeurs nutritionnelles" header.

- [ ] **Step 2: Include category in onSubmit**

In `onSubmit`, add `category` to the product object:

```typescript
const product: Omit<ProductRow, "created_at"> = {
  ...existing fields,
  category,
};
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/app/add-entry/manual.tsx
git commit -m "feat(manual): add category selector to manual entry"
```

---

### Task 6: Integrate category into product detail screen

**Files:**

- Modify: `src/app/product/[id].tsx`

- [ ] **Step 1: Add category in view mode**

Import `CategorySelector` and `ProductCategory`. In the view mode JSX, add `<CategorySelector>` between the favorite toggle and the nutrition table. On change, save immediately:

```typescript
const handleCategoryChange = useCallback(
  async (cat: ProductCategory) => {
    if (!product) return;
    const updated = { ...product, category: cat };
    const { created_at, ...rest } = updated;
    await upsertProduct(db, rest);
    setProduct(updated);
  },
  [db, product],
);
```

- [ ] **Step 2: Add category in edit mode**

In `onSave`, include category in the updated product object:

```typescript
category: product.category,
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/app/product/[id].tsx
git commit -m "feat(product-detail): add category selector"
```

---

### Task 7: Fix remaining type errors (inline product objects)

**Files:**

- Modify: `src/app/add-entry/search.tsx` (2 inline product objects in handleSelect)
- Modify: `src/app/add-entry/scan.tsx` (if any inline product creation)

- [ ] **Step 1: Add category to search.tsx inline products**

In `handleSelect`, both the `else` block and the `catch` block create inline product objects. Add `category: "side" as const` to both.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS — all ProductRow usages now include `category`.

- [ ] **Step 3: Commit**

```bash
git add src/app/add-entry/search.tsx
git commit -m "fix(types): add category to inline product objects"
```

---

### Task 8: Refactor add-entry index to category-step flow

**Files:**

- Modify: `src/app/add-entry/index.tsx`

- [ ] **Step 1: Change Step type and navigation helpers**

Replace:

```typescript
type Step = "select" | "recap";
```

With:

```typescript
import type { ProductCategory } from "@/types/database";
import { CATEGORIES, CATEGORY_LABELS } from "@/constants/categories";

type Step = ProductCategory | "recap";

const STEP_ORDER: Step[] = ["meat", "side", "seasoning", "recap"];

function nextStep(current: Step): Step {
  const idx = STEP_ORDER.indexOf(current);
  return STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)];
}

function prevStep(current: Step): Step | null {
  const idx = STEP_ORDER.indexOf(current);
  return idx <= 0 ? null : STEP_ORDER[idx - 1];
}
```

Set initial step to `"meat"`.

- [ ] **Step 2: Refactor select step to filter by category**

Replace the single "select" step rendering with a category-aware render. When `step` is `"meat"`, `"side"`, or `"seasoning"`:

- Show title: `CATEGORY_LABELS[step]`
- Show action buttons only on `step === "meat"`
- Filter favorites: `favorites.filter(f => f.category === step)`
- Show "Aucun favori dans cette catégorie" if filtered list is empty
- "Suivant" button calls `setStep(nextStep(step))`
- "Retour" button calls: if `prevStep(step)` exists, `setStep(prevStep(step))` else `router.back()`
- "Suivant" shows count of items selected in current category

- [ ] **Step 3: Update recap "Retour" button**

Change recap's back button from `setStep("select")` to `setStep("seasoning")`.

- [ ] **Step 4: Update bottom "Suivant" button visibility**

The "Suivant" button should always be visible on category steps (even with 0 selections), not conditionally like the current flow which only shows when `selectedIds.size > 0`.

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/add-entry/index.tsx
git commit -m "feat(add-entry): category-based step flow for meal building"
```

---

### Task 9: Final verification

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors.

- [ ] **Step 2: Manual testing checklist**

1. Scan a product → confirm shows category pills → choose category → add → check DB
2. Manual entry → category visible → required to validate → product saved with category
3. Search → select → confirm shows category
4. Product detail → change category → saved immediately
5. "+" flow → step 1 "Viande / Poisson" → step 2 "Accompagnement" → step 3 "Assaisonnement" → recap
6. Empty category step → shows message → Suivant works
7. Back navigation through all steps works
8. Existing products show as "Accompagnement" (default)
