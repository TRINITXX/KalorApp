# Product Categories

## Context

Users want to categorize their food products into three groups — **Viande / Poisson**, **Accompagnement**, **Assaisonnement** — to structure the meal-building flow. When adding a meal via the "+" button, favorites are presented one category at a time instead of a flat list.

## Data Model

### New column on `products`

```sql
ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT 'side';
```

Values: `"meat"` | `"side"` | `"seasoning"`

### TypeScript type

```typescript
type ProductCategory = "meat" | "side" | "seasoning";
```

Add `category: ProductCategory` to `ProductRow` interface in `src/types/database.ts`.

### Display labels

| Value       | Label            |
| ----------- | ---------------- |
| `meat`      | Viande / Poisson |
| `side`      | Accompagnement   |
| `seasoning` | Assaisonnement   |

Define these in a shared constant (`src/constants/categories.ts`).

### Migration

Add migration in `src/db/schema.ts` — run `ALTER TABLE` on database open if column does not exist. Existing products default to `"side"`.

## Category Selector Component

New reusable component: `src/components/nutrition/category-selector.tsx`

- 3 horizontal pills, same visual pattern as `MealSelector`
- Active pill: `backgroundColor: colors.accent.calories`, white text
- Inactive pill: `backgroundColor: colors.card`, border `colors.separator`, gray text
- Props: `value: ProductCategory`, `onChange: (v: ProductCategory) => void`

## Integration Points

### 1. Confirm screen (`src/app/add-entry/confirm.tsx`)

- Add `CategorySelector` between the product card and the quantity section
- Store category in local state, initialized from `product.category`
- On "Ajouter": save updated category via `upsertProduct` before creating entry

### 2. Manual entry (`src/app/add-entry/manual.tsx`)

- Add `CategorySelector` after the name field, before nutrition values
- Category is required (default: `"side"`)
- Include in Zod schema and `onSubmit`

### 3. Scan flow (`src/app/add-entry/scan.tsx`)

- No change to scan itself — category is chosen on the confirm screen after scan

### 4. Search flow (`src/app/add-entry/search.tsx`)

- No change — category is chosen on the confirm screen after selecting a search result

### 5. Product detail (`src/app/product/[id].tsx`)

- Show `CategorySelector` in both read and edit mode
- In read mode: tapping a pill directly saves the new category
- Allows user to recategorize products at any time

### 6. `upsertProduct` query (`src/db/queries/products.ts`)

- Add `category` parameter to INSERT and ON CONFLICT UPDATE clauses

## Meal-Building Flow (Add Entry Index)

### Current flow

```
select → recap
```

### New flow

```
meat → side → seasoning → recap
```

### Step type change

```typescript
type Step = "meat" | "side" | "seasoning" | "recap";
```

Initial step: `"meat"`.

### Each category step

- Title bar showing category label (e.g., "Viande / Poisson")
- Action buttons (Scanner/Rechercher/Manuel) visible on the first step only (`"meat"`)
- Favorites filtered by `category === currentStep`
- Checkboxes to select items
- If no favorites in category: show "Aucun favori dans cette catégorie"
- "Suivant" button advances to next step
- "Retour" button goes to previous step (hidden on first step)
- Selected items persist across steps

### Navigation order

| Current     | Suivant     | Retour        |
| ----------- | ----------- | ------------- |
| `meat`      | `side`      | (close modal) |
| `side`      | `seasoning` | `meat`        |
| `seasoning` | `recap`     | `side`        |
| `recap`     | submit      | `seasoning`   |

### Recap step

Same as current: shows all selected items across all categories with quantity inputs + multiplier pills. No changes needed.

## Files to Modify

| File                                             | Change                                                   |
| ------------------------------------------------ | -------------------------------------------------------- |
| `src/db/schema.ts`                               | Add migration for `category` column                      |
| `src/types/database.ts`                          | Add `category` to `ProductRow`, export `ProductCategory` |
| `src/constants/categories.ts`                    | **New** — category constants and labels                  |
| `src/components/nutrition/category-selector.tsx` | **New** — reusable pill selector                         |
| `src/db/queries/products.ts`                     | Add `category` to `upsertProduct`                        |
| `src/app/add-entry/confirm.tsx`                  | Add `CategorySelector`                                   |
| `src/app/add-entry/manual.tsx`                   | Add `CategorySelector` + Zod field                       |
| `src/app/add-entry/index.tsx`                    | Multi-step category flow                                 |
| `src/app/product/[id].tsx`                       | Add `CategorySelector` in read/edit mode                 |
| `src/lib/product-utils.ts`                       | Add `category` to `flattenProductForDb`                  |

## Verification

1. Scan a product → confirm screen shows category pills → select "Viande / Poisson" → add → product saved with category
2. Manual entry → category selector visible, required → validate → product has category
3. Search → select result → confirm shows category → choose and add
4. Product detail → change category → saved immediately
5. "+" flow → step 1 shows only meat favorites → step 2 shows only side favorites → step 3 shows seasoning → recap shows all selected
6. Empty category step shows message + Suivant still works
7. Existing products default to "Accompagnement"
8. `npx tsc --noEmit` passes
