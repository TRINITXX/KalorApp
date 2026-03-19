# KalorApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal iOS calorie tracking app with EAN barcode scanning, Open Food Facts integration, local SQLite storage, weekly tracking, iOS widget, and Siri Shortcuts.

**Architecture:** Expo SDK 55 with file-based routing (Expo Router). All data stored locally: expo-sqlite for nutritional data/entries/favorites, Zustand + MMKV for preferences/goals. Open Food Facts API (free) for product lookup by EAN barcode. expo-camera for barcode scanning. @bacons/apple-targets for WidgetKit widget and App Intents.

**Tech Stack:** Expo SDK 55, Expo Router, expo-sqlite, Zustand + MMKV, expo-camera, React Hook Form + Zod, Reanimated + Moti, victory-native, @shopify/flash-list, expo-symbols, expo-image, expo-haptics, @bacons/apple-targets

**Spec:** `docs/superpowers/specs/2026-03-19-kalorapp-design.md`

---

## File Map

### Types & Constants

| File                     | Responsibility                                                                    |
| ------------------------ | --------------------------------------------------------------------------------- |
| `src/types/nutrition.ts` | Product, Entry, Favorite, NutritionValues, DailySummary, WeeklySummary interfaces |
| `src/types/database.ts`  | DB row types (raw SQLite results)                                                 |
| `src/constants/meals.ts` | Meal enum, labels, icons, time ranges for auto-select                             |
| `src/constants/theme.ts` | Color palette (dark/light), spacing, typography tokens                            |

### Storage & State

| File                             | Responsibility                                       |
| -------------------------------- | ---------------------------------------------------- |
| `src/lib/storage/app-storage.ts` | MMKV instance + zustandMMKVStorage adapter           |
| `src/stores/settings-store.ts`   | Goals, enabled meals, theme (persisted via MMKV)     |
| `src/stores/ui-store.ts`         | Transient UI state (selected date, active tab, etc.) |

### Database

| File                          | Responsibility                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| `src/db/client.ts`            | SQLiteProvider wrapper, PRAGMA foreign_keys = ON                                            |
| `src/db/schema.ts`            | SQL strings for CREATE TABLE statements                                                     |
| `src/db/migrations.ts`        | Migration logic with PRAGMA user_version                                                    |
| `src/db/queries/products.ts`  | upsertProduct, getProduct, getRecentProducts, updateLastQuantity                            |
| `src/db/queries/entries.ts`   | addEntry, deleteEntry, getEntriesByDate, getDailySummary, getWeeklySummary, getWeeklyTotals |
| `src/db/queries/favorites.ts` | addFavorite, removeFavorite, getFavorites, reorderFavorites, isFavorite                     |

> **Note:** `src/hooks/use-database.ts` from the spec is not needed — `SQLiteProvider` with `onInit` in the root layout handles DB initialization directly.

### Utilities

| File                         | Responsibility                                                                |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `src/lib/open-food-facts.ts` | fetchProduct(ean), searchProducts(query), OFF response parsing, salt fallback |
| `src/lib/nutrition-utils.ts` | calculateForQuantity, formatNumber, getMealForTime, exportEntriesCsv          |

### Navigation

| File                            | Responsibility                                                 |
| ------------------------------- | -------------------------------------------------------------- |
| `src/app/_layout.tsx`           | Root layout: SQLiteProvider, theme provider, Zustand hydration |
| `src/app/(tabs)/_layout.tsx`    | Tab bar: Dashboard, History, Settings (SF Symbols icons)       |
| `src/app/add-entry/_layout.tsx` | Stack for add-entry flow (formSheet presentation)              |

### UI Components

| File                                          | Responsibility                                               |
| --------------------------------------------- | ------------------------------------------------------------ |
| `src/components/nutrition/calorie-ring.tsx`   | Animated SVG ring with kcal/goal                             |
| `src/components/nutrition/macro-bar.tsx`      | Single macro progress bar (label, bar, value/goal)           |
| `src/components/nutrition/micro-chips.tsx`    | Row of compact nutrient chips (fiber, sugars, sat fat, salt) |
| `src/components/nutrition/meal-section.tsx`   | Meal header + entry list with swipe-to-delete                |
| `src/components/nutrition/product-row.tsx`    | Product display row (name, brand, thumbnail, kcal)           |
| `src/components/nutrition/quantity-input.tsx` | Gram input with pre-filled last_quantity                     |

### Screens

| File                            | Responsibility                                           |
| ------------------------------- | -------------------------------------------------------- |
| `src/app/(tabs)/index.tsx`      | Dashboard: ring, macros, micro chips, meal sections, FAB |
| `src/app/(tabs)/history.tsx`    | Week view + Trends view (segmented control)              |
| `src/app/(tabs)/settings.tsx`   | Goals, meal toggles, theme, favorites mgmt, CSV export   |
| `src/app/add-entry/index.tsx`   | Choice screen: scan/search/manual + recent products      |
| `src/app/add-entry/scan.tsx`    | Camera scanner (expo-camera, EAN-13)                     |
| `src/app/add-entry/search.tsx`  | Text search with OFF API, debounce 300ms                 |
| `src/app/add-entry/manual.tsx`  | Manual product form (RHF + Zod)                          |
| `src/app/add-entry/confirm.tsx` | Quantity + meal selector + confirm                       |
| `src/app/product/[id].tsx`      | Product detail, edit (manual only), favorite toggle      |
| `src/app/quick-add.tsx`         | Multi-select favorites, meal selector, batch add         |

### Tests

| File                                             | Responsibility                                     |
| ------------------------------------------------ | -------------------------------------------------- |
| `src/lib/__tests__/nutrition-utils.test.ts`      | calculateForQuantity, formatNumber, getMealForTime |
| `src/lib/__tests__/open-food-facts.test.ts`      | parseProduct, salt fallback, error handling        |
| `src/db/__tests__/queries.test.ts`               | All DB queries with in-memory SQLite               |
| `src/components/__tests__/calorie-ring.test.tsx` | Rendering, progress calculation                    |
| `src/components/__tests__/meal-section.test.tsx` | Rendering entries, delete interaction              |

---

## Task 1: Project Scaffold & Dependencies

**Files:**

- Create: `package.json`, `tsconfig.json`, `app.json`, `src/app/_layout.tsx`

- [ ] **Step 1: Create Expo project**

```bash
npx create-expo-app@latest KalorApp-tmp --template blank-typescript
# Move contents to current directory
cp -r KalorApp-tmp/* KalorApp-tmp/.* . 2>/dev/null; rm -rf KalorApp-tmp
```

- [ ] **Step 2: Install core dependencies**

```bash
npx expo install expo-sqlite expo-camera expo-image expo-haptics expo-symbols expo-sharing react-native-reanimated react-native-gesture-handler @shopify/flash-list react-native-mmkv react-native-safe-area-context
```

- [ ] **Step 3: Install JS dependencies**

```bash
npm install zustand zod react-hook-form @hookform/resolvers victory-native moti uuid
npm install -D @types/uuid
```

- [ ] **Step 4: Configure tsconfig path aliases**

In `tsconfig.json`, add:

```json
{
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 5: Create directory structure**

```bash
mkdir -p src/{app/{\"(tabs)\",add-entry,product},components/{ui,nutrition},db/queries,hooks,lib/{storage,__tests__},stores,types,constants,components/__tests__,db/__tests__}
```

- [ ] **Step 6: Create minimal root layout**

Create `src/app/_layout.tsx`:

```tsx
import { Stack } from "expo-router/stack";

export default function RootLayout() {
  return <Stack />;
}
```

- [ ] **Step 7: Verify app starts**

```bash
npx expo start --clear
```

Expected: Metro bundler starts without errors.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "chore: scaffold Expo project with dependencies"
```

---

## Task 2: Types & Constants

**Files:**

- Create: `src/types/nutrition.ts`, `src/types/database.ts`, `src/constants/meals.ts`, `src/constants/theme.ts`

- [ ] **Step 1: Create nutrition types**

Create `src/types/nutrition.ts`:

```typescript
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
```

- [ ] **Step 2: Create database row types**

Create `src/types/database.ts`:

```typescript
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
```

- [ ] **Step 3: Create meal constants**

Create `src/constants/meals.ts`:

```typescript
import type { MealType } from "@/types/nutrition";

export const MEALS: { type: MealType; label: string; icon: string }[] = [
  { type: "breakfast", label: "Petit-dejeuner", icon: "sunrise" },
  { type: "lunch", label: "Dejeuner", icon: "sun.max" },
  { type: "snack", label: "Gouter", icon: "cup.and.saucer" },
  { type: "dinner", label: "Diner", icon: "moon.stars" },
];

export const MEAL_TIME_RANGES: Record<
  MealType,
  { start: number; end: number }
> = {
  breakfast: { start: 0, end: 11 },
  lunch: { start: 11, end: 14 },
  snack: { start: 14, end: 17 },
  dinner: { start: 17, end: 24 },
};
```

- [ ] **Step 4: Create theme constants**

Create `src/constants/theme.ts`:

```typescript
export const COLORS = {
  dark: {
    background: "#000000",
    backgroundSecondary: "#111111",
    card: "#1a1a1a",
    textPrimary: "#ffffff",
    textSecondary: "#888888",
    textMuted: "#666666",
    separator: "#222222",
  },
  light: {
    background: "#ffffff",
    backgroundSecondary: "#f5f5f5",
    card: "#ffffff",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    textMuted: "#94a3b8",
    separator: "#e5e7eb",
  },
  accent: {
    calories: { dark: "#4ade80", light: "#16a34a" },
    proteins: { dark: "#60a5fa", light: "#2563eb" },
    carbs: { dark: "#fbbf24", light: "#d97706" },
    fats: { dark: "#f87171", light: "#dc2626" },
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;
```

- [ ] **Step 5: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/types src/constants && git commit -m "feat: add types and constants for nutrition, meals, theme"
```

---

## Task 3: Storage & Zustand Stores

**Files:**

- Create: `src/lib/storage/app-storage.ts`, `src/stores/settings-store.ts`, `src/stores/ui-store.ts`

- [ ] **Step 1: Create MMKV storage adapter**

Create `src/lib/storage/app-storage.ts`:

```typescript
import { MMKV } from "react-native-mmkv";
import { type StateStorage } from "zustand/middleware";

export const mmkv = new MMKV();

export const zustandMMKVStorage: StateStorage = {
  getItem: (name: string) => {
    const value = mmkv.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    mmkv.set(name, value);
  },
  removeItem: (name: string) => {
    mmkv.delete(name);
  },
};
```

- [ ] **Step 2: Create settings store**

Create `src/stores/settings-store.ts`:

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandMMKVStorage } from "@/lib/storage/app-storage";
import type { Goals, MealType } from "@/types/nutrition";

interface SettingsState {
  theme: "dark" | "light";
  enabledMeals: Record<MealType, boolean>;
  goals: Goals;
  setTheme: (theme: "dark" | "light") => void;
  toggleMeal: (meal: MealType) => void;
  setGoals: (goals: Partial<Goals>) => void;
}

const DEFAULT_GOALS: Goals = {
  calories: 2100,
  proteins: 120,
  carbs: 260,
  fats: 70,
  fiber: null,
  sugars: null,
  saturated_fat: null,
  salt: null,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      enabledMeals: {
        breakfast: false,
        lunch: true,
        snack: true,
        dinner: true,
      },
      goals: DEFAULT_GOALS,
      setTheme: (theme) => set({ theme }),
      toggleMeal: (meal) =>
        set((state) => ({
          enabledMeals: {
            ...state.enabledMeals,
            [meal]: !state.enabledMeals[meal],
          },
        })),
      setGoals: (goals) =>
        set((state) => ({
          goals: { ...state.goals, ...goals },
        })),
    }),
    {
      name: "kalor-settings",
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
```

- [ ] **Step 3: Create UI store**

Create `src/stores/ui-store.ts`:

```typescript
import { create } from "zustand";

interface UIState {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

const today = () => new Date().toISOString().split("T")[0];

export const useUIStore = create<UIState>()((set) => ({
  selectedDate: today(),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
```

- [ ] **Step 4: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage src/stores && git commit -m "feat: add MMKV storage adapter and Zustand stores"
```

---

## Task 4: Database Layer

**Files:**

- Create: `src/db/schema.ts`, `src/db/migrations.ts`, `src/db/client.ts`
- Test: `src/db/__tests__/queries.test.ts`

- [ ] **Step 1: Create schema**

Create `src/db/schema.ts`:

```typescript
export const CREATE_PRODUCTS_TABLE = `
CREATE TABLE IF NOT EXISTS products (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  brand           TEXT,
  image_url       TEXT,
  source          TEXT NOT NULL,
  calories        REAL NOT NULL,
  proteins        REAL NOT NULL,
  carbs           REAL NOT NULL,
  fats            REAL NOT NULL,
  fiber           REAL,
  sugars          REAL,
  saturated_fat   REAL,
  salt            REAL,
  last_quantity   REAL DEFAULT 100,
  created_at      TEXT DEFAULT (datetime('now'))
);`;

export const CREATE_ENTRIES_TABLE = `
CREATE TABLE IF NOT EXISTS entries (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name    TEXT NOT NULL,
  meal            TEXT NOT NULL,
  quantity        REAL NOT NULL,
  date            TEXT NOT NULL,
  calories        REAL NOT NULL,
  proteins        REAL NOT NULL,
  carbs           REAL NOT NULL,
  fats            REAL NOT NULL,
  fiber           REAL,
  sugars          REAL,
  saturated_fat   REAL,
  salt            REAL,
  created_at      TEXT DEFAULT (datetime('now'))
);`;

export const CREATE_FAVORITES_TABLE = `
CREATE TABLE IF NOT EXISTS favorites (
  product_id      TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  sort_order      INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now'))
);`;

export const CREATE_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
CREATE INDEX IF NOT EXISTS idx_entries_date_meal ON entries(date, meal);
CREATE INDEX IF NOT EXISTS idx_entries_product ON entries(product_id);
`;
```

- [ ] **Step 2: Create migrations**

Create `src/db/migrations.ts`:

```typescript
import type { SQLiteDatabase } from "expo-sqlite";
import {
  CREATE_PRODUCTS_TABLE,
  CREATE_ENTRIES_TABLE,
  CREATE_FAVORITES_TABLE,
  CREATE_INDEXES,
} from "./schema";

const CURRENT_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA foreign_keys = ON;");
  await db.execAsync("PRAGMA journal_mode = 'wal';");

  const result = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion >= CURRENT_VERSION) return;

  if (currentVersion === 0) {
    await db.execAsync(CREATE_PRODUCTS_TABLE);
    await db.execAsync(CREATE_ENTRIES_TABLE);
    await db.execAsync(CREATE_FAVORITES_TABLE);
    await db.execAsync(CREATE_INDEXES);
  }

  await db.execAsync(`PRAGMA user_version = ${CURRENT_VERSION}`);
}
```

- [ ] **Step 3: Create DB client wrapper**

Create `src/db/client.ts`:

```typescript
export { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
export { migrateDbIfNeeded } from "./migrations";

export const DATABASE_NAME = "kalor.db";
```

- [ ] **Step 4: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/db && git commit -m "feat: add SQLite schema, migrations, and client"
```

---

## Task 5: Database Queries

**Files:**

- Create: `src/db/queries/products.ts`, `src/db/queries/entries.ts`, `src/db/queries/favorites.ts`
- Test: `src/db/__tests__/queries.test.ts`

- [ ] **Step 1: Write product queries**

Create `src/db/queries/products.ts`:

```typescript
import type { SQLiteDatabase } from "expo-sqlite";
import type { ProductRow } from "@/types/database";

export async function upsertProduct(
  db: SQLiteDatabase,
  product: Omit<ProductRow, "created_at">,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO products (id, name, brand, image_url, source, calories, proteins, carbs, fats, fiber, sugars, saturated_fat, salt, last_quantity)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       brand = excluded.brand,
       image_url = excluded.image_url,
       calories = excluded.calories,
       proteins = excluded.proteins,
       carbs = excluded.carbs,
       fats = excluded.fats,
       fiber = excluded.fiber,
       sugars = excluded.sugars,
       saturated_fat = excluded.saturated_fat,
       salt = excluded.salt,
       last_quantity = excluded.last_quantity`,
    product.id,
    product.name,
    product.brand,
    product.image_url,
    product.source,
    product.calories,
    product.proteins,
    product.carbs,
    product.fats,
    product.fiber,
    product.sugars,
    product.saturated_fat,
    product.salt,
    product.last_quantity,
  );
}

export async function getProduct(
  db: SQLiteDatabase,
  id: string,
): Promise<ProductRow | null> {
  return db.getFirstAsync<ProductRow>(
    "SELECT * FROM products WHERE id = ?",
    id,
  );
}

export async function getRecentProducts(
  db: SQLiteDatabase,
  limit: number = 10,
): Promise<ProductRow[]> {
  return db.getAllAsync<ProductRow>(
    `SELECT DISTINCT p.* FROM products p
     INNER JOIN entries e ON e.product_id = p.id
     ORDER BY e.created_at DESC
     LIMIT ?`,
    limit,
  );
}

export async function updateLastQuantity(
  db: SQLiteDatabase,
  productId: string,
  quantity: number,
): Promise<void> {
  await db.runAsync(
    "UPDATE products SET last_quantity = ? WHERE id = ?",
    quantity,
    productId,
  );
}
```

- [ ] **Step 2: Write entry queries**

Create `src/db/queries/entries.ts`:

```typescript
import type { SQLiteDatabase } from "expo-sqlite";
import type { EntryRow } from "@/types/database";

export interface AddEntryParams {
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
}

export async function addEntry(
  db: SQLiteDatabase,
  entry: AddEntryParams,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO entries (product_id, product_name, meal, quantity, date, calories, proteins, carbs, fats, fiber, sugars, saturated_fat, salt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.product_id,
    entry.product_name,
    entry.meal,
    entry.quantity,
    entry.date,
    entry.calories,
    entry.proteins,
    entry.carbs,
    entry.fats,
    entry.fiber,
    entry.sugars,
    entry.saturated_fat,
    entry.salt,
  );
  return result.lastInsertRowId;
}

export async function deleteEntry(
  db: SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync("DELETE FROM entries WHERE id = ?", id);
}

export async function getEntriesByDate(
  db: SQLiteDatabase,
  date: string,
): Promise<EntryRow[]> {
  return db.getAllAsync<EntryRow>(
    "SELECT * FROM entries WHERE date = ? ORDER BY created_at ASC",
    date,
  );
}

export interface DailySummaryRow {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  fiber: number;
  sugars: number;
  saturated_fat: number;
  salt: number;
}

export async function getDailySummary(
  db: SQLiteDatabase,
  date: string,
): Promise<DailySummaryRow> {
  const result = await db.getFirstAsync<DailySummaryRow>(
    `SELECT
      COALESCE(SUM(calories), 0) as calories,
      COALESCE(SUM(proteins), 0) as proteins,
      COALESCE(SUM(carbs), 0) as carbs,
      COALESCE(SUM(fats), 0) as fats,
      COALESCE(SUM(fiber), 0) as fiber,
      COALESCE(SUM(sugars), 0) as sugars,
      COALESCE(SUM(saturated_fat), 0) as saturated_fat,
      COALESCE(SUM(salt), 0) as salt
     FROM entries WHERE date = ?`,
    date,
  );
  return (
    result ?? {
      calories: 0,
      proteins: 0,
      carbs: 0,
      fats: 0,
      fiber: 0,
      sugars: 0,
      saturated_fat: 0,
      salt: 0,
    }
  );
}

export async function getWeeklyTotals(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
): Promise<
  {
    date: string;
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
  }[]
> {
  return db.getAllAsync(
    `SELECT date,
      COALESCE(SUM(calories), 0) as calories,
      COALESCE(SUM(proteins), 0) as proteins,
      COALESCE(SUM(carbs), 0) as carbs,
      COALESCE(SUM(fats), 0) as fats
     FROM entries
     WHERE date >= ? AND date <= ?
     GROUP BY date
     ORDER BY date ASC`,
    startDate,
    endDate,
  );
}

export async function getWeeklySummaries(
  db: SQLiteDatabase,
  weeks: number,
): Promise<{ week_start: string; total_calories: number }[]> {
  return db.getAllAsync(
    `SELECT
      date(date, 'weekday 0', '-6 days') as week_start,
      COALESCE(SUM(calories), 0) as total_calories
     FROM entries
     WHERE date >= date('now', '-' || ? || ' days')
     GROUP BY week_start
     ORDER BY week_start DESC`,
    weeks * 7,
  );
}

export async function getAllEntriesForExport(
  db: SQLiteDatabase,
): Promise<EntryRow[]> {
  return db.getAllAsync<EntryRow>(
    "SELECT * FROM entries ORDER BY date ASC, created_at ASC",
  );
}
```

- [ ] **Step 3: Write favorite queries**

Create `src/db/queries/favorites.ts`:

```typescript
import type { SQLiteDatabase } from "expo-sqlite";
import type { ProductRow } from "@/types/database";

export interface FavoriteWithProduct extends ProductRow {
  sort_order: number;
}

export async function addFavorite(
  db: SQLiteDatabase,
  productId: string,
): Promise<void> {
  const maxOrder = await db.getFirstAsync<{ max_order: number | null }>(
    "SELECT MAX(sort_order) as max_order FROM favorites",
  );
  const nextOrder = (maxOrder?.max_order ?? -1) + 1;
  await db.runAsync(
    "INSERT OR IGNORE INTO favorites (product_id, sort_order) VALUES (?, ?)",
    productId,
    nextOrder,
  );
}

export async function removeFavorite(
  db: SQLiteDatabase,
  productId: string,
): Promise<void> {
  await db.runAsync("DELETE FROM favorites WHERE product_id = ?", productId);
}

export async function getFavorites(
  db: SQLiteDatabase,
): Promise<FavoriteWithProduct[]> {
  return db.getAllAsync<FavoriteWithProduct>(
    `SELECT p.*, f.sort_order FROM favorites f
     INNER JOIN products p ON p.id = f.product_id
     ORDER BY f.sort_order ASC`,
  );
}

export async function isFavorite(
  db: SQLiteDatabase,
  productId: string,
): Promise<boolean> {
  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM favorites WHERE product_id = ?",
    productId,
  );
  return (result?.count ?? 0) > 0;
}

export async function reorderFavorites(
  db: SQLiteDatabase,
  orderedProductIds: string[],
): Promise<void> {
  for (let i = 0; i < orderedProductIds.length; i++) {
    await db.runAsync(
      "UPDATE favorites SET sort_order = ? WHERE product_id = ?",
      i,
      orderedProductIds[i],
    );
  }
}
```

- [ ] **Step 4: Write DB integration tests**

Create `src/db/__tests__/queries.test.ts`:

```typescript
import * as SQLite from "expo-sqlite";
import { migrateDbIfNeeded } from "../migrations";
import {
  upsertProduct,
  getProduct,
  getRecentProducts,
} from "../queries/products";
import {
  addEntry,
  deleteEntry,
  getEntriesByDate,
  getDailySummary,
} from "../queries/entries";
import {
  addFavorite,
  removeFavorite,
  getFavorites,
  isFavorite,
} from "../queries/favorites";

let db: SQLite.SQLiteDatabase;

const TEST_PRODUCT = {
  id: "3017620422003",
  name: "Nutella",
  brand: "Ferrero",
  image_url: null,
  source: "openfoodfacts" as const,
  calories: 539,
  proteins: 6.3,
  carbs: 57.5,
  fats: 30.9,
  fiber: 0,
  sugars: 56.3,
  saturated_fat: 10.6,
  salt: 0.107,
  last_quantity: 100,
};

beforeEach(async () => {
  db = await SQLite.openDatabaseAsync(":memory:");
  await migrateDbIfNeeded(db);
});

afterEach(async () => {
  await db.closeAsync();
});

describe("products", () => {
  test("upsertProduct inserts and retrieves product", async () => {
    await upsertProduct(db, TEST_PRODUCT);
    const product = await getProduct(db, TEST_PRODUCT.id);
    expect(product).not.toBeNull();
    expect(product!.name).toBe("Nutella");
    expect(product!.calories).toBe(539);
  });

  test("upsertProduct updates existing product", async () => {
    await upsertProduct(db, TEST_PRODUCT);
    await upsertProduct(db, { ...TEST_PRODUCT, last_quantity: 200 });
    const product = await getProduct(db, TEST_PRODUCT.id);
    expect(product!.last_quantity).toBe(200);
  });
});

describe("entries", () => {
  test("addEntry creates entry with calculated values", async () => {
    await upsertProduct(db, TEST_PRODUCT);
    const id = await addEntry(db, {
      product_id: TEST_PRODUCT.id,
      product_name: "Nutella",
      meal: "snack",
      quantity: 30,
      date: "2026-03-19",
      calories: 161.7,
      proteins: 1.89,
      carbs: 17.25,
      fats: 9.27,
      fiber: 0,
      sugars: 16.89,
      saturated_fat: 3.18,
      salt: 0.032,
    });
    expect(id).toBeGreaterThan(0);
    const entries = await getEntriesByDate(db, "2026-03-19");
    expect(entries).toHaveLength(1);
    expect(entries[0].calories).toBeCloseTo(161.7);
  });

  test("getDailySummary sums entries for a date", async () => {
    await upsertProduct(db, TEST_PRODUCT);
    await addEntry(db, {
      product_id: TEST_PRODUCT.id,
      product_name: "Nutella",
      meal: "snack",
      quantity: 30,
      date: "2026-03-19",
      calories: 161.7,
      proteins: 1.89,
      carbs: 17.25,
      fats: 9.27,
      fiber: 0,
      sugars: 16.89,
      saturated_fat: 3.18,
      salt: 0.032,
    });
    await addEntry(db, {
      product_id: TEST_PRODUCT.id,
      product_name: "Nutella",
      meal: "lunch",
      quantity: 20,
      date: "2026-03-19",
      calories: 107.8,
      proteins: 1.26,
      carbs: 11.5,
      fats: 6.18,
      fiber: 0,
      sugars: 11.26,
      saturated_fat: 2.12,
      salt: 0.021,
    });
    const summary = await getDailySummary(db, "2026-03-19");
    expect(summary.calories).toBeCloseTo(269.5);
    expect(summary.proteins).toBeCloseTo(3.15);
  });

  test("deleteEntry removes entry", async () => {
    await upsertProduct(db, TEST_PRODUCT);
    const id = await addEntry(db, {
      product_id: TEST_PRODUCT.id,
      product_name: "Nutella",
      meal: "snack",
      quantity: 30,
      date: "2026-03-19",
      calories: 161.7,
      proteins: 1.89,
      carbs: 17.25,
      fats: 9.27,
      fiber: 0,
      sugars: 16.89,
      saturated_fat: 3.18,
      salt: 0.032,
    });
    await deleteEntry(db, id);
    const entries = await getEntriesByDate(db, "2026-03-19");
    expect(entries).toHaveLength(0);
  });
});

describe("favorites", () => {
  test("addFavorite and getFavorites", async () => {
    await upsertProduct(db, TEST_PRODUCT);
    await addFavorite(db, TEST_PRODUCT.id);
    const favorites = await getFavorites(db);
    expect(favorites).toHaveLength(1);
    expect(favorites[0].name).toBe("Nutella");
  });

  test("isFavorite returns correct status", async () => {
    await upsertProduct(db, TEST_PRODUCT);
    expect(await isFavorite(db, TEST_PRODUCT.id)).toBe(false);
    await addFavorite(db, TEST_PRODUCT.id);
    expect(await isFavorite(db, TEST_PRODUCT.id)).toBe(true);
  });

  test("removeFavorite deletes favorite", async () => {
    await upsertProduct(db, TEST_PRODUCT);
    await addFavorite(db, TEST_PRODUCT.id);
    await removeFavorite(db, TEST_PRODUCT.id);
    expect(await isFavorite(db, TEST_PRODUCT.id)).toBe(false);
  });
});

describe("ON DELETE CASCADE", () => {
  test("deleting product cascades to entries and favorites", async () => {
    await upsertProduct(db, TEST_PRODUCT);
    await addEntry(db, {
      product_id: TEST_PRODUCT.id,
      product_name: "Nutella",
      meal: "snack",
      quantity: 30,
      date: "2026-03-19",
      calories: 161.7,
      proteins: 1.89,
      carbs: 17.25,
      fats: 9.27,
      fiber: 0,
      sugars: 16.89,
      saturated_fat: 3.18,
      salt: 0.032,
    });
    await addFavorite(db, TEST_PRODUCT.id);
    // Delete the product
    await db.runAsync("DELETE FROM products WHERE id = ?", TEST_PRODUCT.id);
    // Entries and favorites should be cascade-deleted
    const entries = await getEntriesByDate(db, "2026-03-19");
    expect(entries).toHaveLength(0);
    expect(await isFavorite(db, TEST_PRODUCT.id)).toBe(false);
  });
});
```

- [ ] **Step 5: Run tests**

```bash
npx jest src/db/__tests__/queries.test.ts
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/db && git commit -m "feat: add database queries with tests for products, entries, favorites"
```

---

## Task 6: Utility Functions

**Files:**

- Create: `src/lib/nutrition-utils.ts`, `src/lib/open-food-facts.ts`
- Test: `src/lib/__tests__/nutrition-utils.test.ts`, `src/lib/__tests__/open-food-facts.test.ts`

- [ ] **Step 1: Write nutrition-utils tests**

Create `src/lib/__tests__/nutrition-utils.test.ts`:

```typescript
import {
  calculateForQuantity,
  formatNumber,
  getMealForTime,
} from "../nutrition-utils";
import type { NutritionValues } from "@/types/nutrition";

const PER_100G: NutritionValues = {
  calories: 539,
  proteins: 6.3,
  carbs: 57.5,
  fats: 30.9,
  fiber: 0,
  sugars: 56.3,
  saturated_fat: 10.6,
  salt: 0.107,
};

describe("calculateForQuantity", () => {
  test("calculates for 30g", () => {
    const result = calculateForQuantity(PER_100G, 30);
    expect(result.calories).toBeCloseTo(161.7);
    expect(result.proteins).toBeCloseTo(1.89);
    expect(result.fats).toBeCloseTo(9.27);
  });

  test("handles null values", () => {
    const values: NutritionValues = { ...PER_100G, fiber: null, sugars: null };
    const result = calculateForQuantity(values, 50);
    expect(result.fiber).toBeNull();
    expect(result.sugars).toBeNull();
    expect(result.calories).toBeCloseTo(269.5);
  });

  test("returns zero for zero quantity", () => {
    const result = calculateForQuantity(PER_100G, 0);
    expect(result.calories).toBe(0);
  });
});

describe("formatNumber", () => {
  test("formats with 1 decimal", () => {
    expect(formatNumber(161.7)).toBe("161.7");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(1284.35)).toBe("1,284.4");
  });

  test("formats integers without decimal", () => {
    expect(formatNumber(100, 0)).toBe("100");
    expect(formatNumber(2100, 0)).toBe("2,100");
  });
});

describe("getMealForTime", () => {
  test("returns breakfast before 11h", () => {
    expect(getMealForTime(8)).toBe("breakfast");
    expect(getMealForTime(10)).toBe("breakfast");
  });

  test("returns lunch 11-14h", () => {
    expect(getMealForTime(12)).toBe("lunch");
  });

  test("returns snack 14-17h", () => {
    expect(getMealForTime(15)).toBe("snack");
  });

  test("returns dinner after 17h", () => {
    expect(getMealForTime(19)).toBe("dinner");
    expect(getMealForTime(23)).toBe("dinner");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/lib/__tests__/nutrition-utils.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement nutrition-utils**

Create `src/lib/nutrition-utils.ts`:

```typescript
import type { NutritionValues, MealType } from "@/types/nutrition";

export function calculateForQuantity(
  per100g: NutritionValues,
  quantity: number,
): NutritionValues {
  const factor = quantity / 100;
  return {
    calories: per100g.calories * factor,
    proteins: per100g.proteins * factor,
    carbs: per100g.carbs * factor,
    fats: per100g.fats * factor,
    fiber: per100g.fiber !== null ? per100g.fiber * factor : null,
    sugars: per100g.sugars !== null ? per100g.sugars * factor : null,
    saturated_fat:
      per100g.saturated_fat !== null ? per100g.saturated_fat * factor : null,
    salt: per100g.salt !== null ? per100g.salt * factor : null,
  };
}

export function formatNumber(value: number, decimals: number = 1): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function getMealForTime(hour: number): MealType {
  if (hour < 11) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 17) return "snack";
  return "dinner";
}

export function exportEntriesCsv(
  entries: {
    date: string;
    meal: string;
    product_name: string;
    quantity: number;
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    fiber: number | null;
    sugars: number | null;
    saturated_fat: number | null;
    salt: number | null;
  }[],
): string {
  const header =
    "date,meal,product_name,quantity_g,calories,proteins,carbs,fats,fiber,sugars,saturated_fat,salt";
  const rows = entries.map((e) =>
    [
      e.date,
      e.meal,
      `"${e.product_name}"`,
      e.quantity,
      e.calories,
      e.proteins,
      e.carbs,
      e.fats,
      e.fiber ?? "",
      e.sugars ?? "",
      e.saturated_fat ?? "",
      e.salt ?? "",
    ].join(","),
  );
  return [header, ...rows].join("\n");
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/lib/__tests__/nutrition-utils.test.ts
```

Expected: all pass.

- [ ] **Step 5: Write OFF client tests**

Create `src/lib/__tests__/open-food-facts.test.ts`:

```typescript
import { parseProduct } from "../open-food-facts";

describe("parseProduct", () => {
  test("parses standard OFF response", () => {
    const raw = {
      code: "3017620422003",
      product: {
        product_name: "Nutella",
        brands: "Ferrero",
        image_front_url: "https://images.openfoodfacts.org/nutella.jpg",
        nutriments: {
          "energy-kcal_100g": 539,
          proteins_100g: 6.3,
          carbohydrates_100g: 57.5,
          fat_100g: 30.9,
          fiber_100g: 0,
          sugars_100g: 56.3,
          "saturated-fat_100g": 10.6,
          salt_100g: 0.107,
        },
      },
      status: 1,
    };
    const product = parseProduct(raw);
    expect(product).not.toBeNull();
    expect(product!.name).toBe("Nutella");
    expect(product!.nutrition_per_100g.calories).toBe(539);
    expect(product!.nutrition_per_100g.salt).toBe(0.107);
  });

  test("converts sodium to salt when salt is missing", () => {
    const raw = {
      code: "123",
      product: {
        product_name: "Test",
        brands: null,
        image_front_url: null,
        nutriments: {
          "energy-kcal_100g": 100,
          proteins_100g: 5,
          carbohydrates_100g: 10,
          fat_100g: 3,
          sodium_100g: 0.5,
        },
      },
      status: 1,
    };
    const product = parseProduct(raw);
    expect(product!.nutrition_per_100g.salt).toBeCloseTo(1.25);
  });

  test("returns null for status 0", () => {
    const raw = { code: "000", status: 0 };
    expect(parseProduct(raw)).toBeNull();
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

```bash
npx jest src/lib/__tests__/open-food-facts.test.ts
```

Expected: FAIL.

- [ ] **Step 7: Implement OFF client**

Create `src/lib/open-food-facts.ts`:

```typescript
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

export async function fetchProduct(
  ean: string,
): Promise<Omit<Product, "created_at"> | null> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/v2/product/${ean}`);
  const data: OFFResponse = await response.json();
  return parseProduct(data);
}

export interface SearchResult {
  id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
}

export async function searchProducts(query: string): Promise<SearchResult[]> {
  const encoded = encodeURIComponent(query);
  const response = await fetchWithTimeout(
    `${BASE_URL}/cgi/search.pl?search_terms=${encoded}&json=true&page_size=20`,
  );
  const data = await response.json();
  return (data.products ?? []).map((p: Record<string, string>) => ({
    id: p.code,
    name: p.product_name ?? "Unknown",
    brand: p.brands ?? null,
    image_url: p.image_front_small_url ?? null,
  }));
}
```

- [ ] **Step 8: Run all tests**

```bash
npx jest src/lib/__tests__/
```

Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/lib && git commit -m "feat: add nutrition utils and Open Food Facts client with tests"
```

---

## Task 7: Navigation Shell & Theme

**Files:**

- Create/modify: `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx`, `src/app/add-entry/_layout.tsx`
- Create: `src/hooks/use-theme-colors.ts`

- [ ] **Step 1: Create theme hook**

Create `src/hooks/use-theme-colors.ts`:

```typescript
import { COLORS } from "@/constants/theme";
import { useSettingsStore } from "@/stores/settings-store";

export function useThemeColors() {
  const theme = useSettingsStore((s) => s.theme);
  return {
    ...COLORS[theme],
    accent: {
      calories: COLORS.accent.calories[theme],
      proteins: COLORS.accent.proteins[theme],
      carbs: COLORS.accent.carbs[theme],
      fats: COLORS.accent.fats[theme],
    },
    isDark: theme === "dark",
  };
}
```

- [ ] **Step 2: Update root layout with providers**

Update `src/app/_layout.tsx`:

```tsx
import { SQLiteProvider } from "expo-sqlite";
import { Stack } from "expo-router/stack";
import { DATABASE_NAME, migrateDbIfNeeded } from "@/db/client";
import { useSettingsStore } from "@/stores/settings-store";

export default function RootLayout() {
  const theme = useSettingsStore((s) => s.theme);

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme === "dark" ? "#000" : "#fff" },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="add-entry"
          options={{
            presentation: "formSheet",
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.75, 1.0],
          }}
        />
        <Stack.Screen name="product/[id]" options={{ headerShown: true }} />
        <Stack.Screen
          name="quick-add"
          options={{ presentation: "formSheet", sheetGrabberVisible: true }}
        />
      </Stack>
    </SQLiteProvider>
  );
}
```

- [ ] **Step 3: Create tabs layout**

Create `src/app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useThemeColors } from "@/hooks/use-theme-colors";

export default function TabsLayout() {
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent.calories,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Aujourd'hui",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name="flame"
              tintColor={color}
              style={{ width: 24, height: 24 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Historique",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name="chart.bar"
              tintColor={color}
              style={{ width: 24, height: 24 }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Reglages",
          tabBarIcon: ({ color }) => (
            <SymbolView
              name="gearshape"
              tintColor={color}
              style={{ width: 24, height: 24 }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 4: Create add-entry stack layout**

Create `src/app/add-entry/_layout.tsx`:

```tsx
import { Stack } from "expo-router/stack";
import { useThemeColors } from "@/hooks/use-theme-colors";

export default function AddEntryLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.backgroundSecondary },
        headerTintColor: colors.textPrimary,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Ajouter" }} />
      <Stack.Screen
        name="scan"
        options={{ title: "Scanner", headerShown: false }}
      />
      <Stack.Screen name="search" options={{ title: "Rechercher" }} />
      <Stack.Screen name="manual" options={{ title: "Saisie manuelle" }} />
      <Stack.Screen name="confirm" options={{ title: "Confirmer" }} />
    </Stack>
  );
}
```

- [ ] **Step 5: Create placeholder screens for tabs**

Create `src/app/(tabs)/index.tsx`, `src/app/(tabs)/history.tsx`, `src/app/(tabs)/settings.tsx` with placeholder content:

```tsx
// Each file:
import { View, Text } from "react-native";
export default function ScreenName() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Screen</Text>
    </View>
  );
}
```

- [ ] **Step 6: Verify app compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app src/hooks && git commit -m "feat: add navigation shell with tabs, formSheet, and theme"
```

---

## Task 8: UI Components

**Files:**

- Create: `src/components/nutrition/calorie-ring.tsx`, `macro-bar.tsx`, `micro-chips.tsx`, `meal-section.tsx`, `product-row.tsx`, `quantity-input.tsx`

- [ ] **Step 1: Create CalorieRing component**

Create `src/components/nutrition/calorie-ring.tsx`:
Animated SVG ring using react-native-svg + Reanimated.

- Props: `consumed: number`, `goal: number`, `size?: number`
- Displays: animated arc + centered text (consumed / goal kcal)
- Colors: accent.calories from theme
- `fontVariant: 'tabular-nums'` on numbers

- [ ] **Step 2: Create MacroBar component**

Create `src/components/nutrition/macro-bar.tsx`:

- Props: `label: string`, `current: number`, `goal: number | null`, `color: string`, `unit?: string`
- Displays: label, progress bar, "current / goal" text
- `fontVariant: 'tabular-nums'`

- [ ] **Step 3: Create MicroChips component**

Create `src/components/nutrition/micro-chips.tsx`:

- Props: `fiber, sugars, saturatedFat, salt: number`
- Displays: row of 4 compact chips with label + value
- Background: card color from theme

- [ ] **Step 4: Create MealSection component**

Create `src/components/nutrition/meal-section.tsx`:

- Props: `meal: MealType`, `entries: Entry[]`, `onDelete: (id: number) => void`
- Displays: meal label + subtotal kcal, entry list with swipe-to-delete
- Uses `expo-haptics` on delete
- `borderCurve: 'continuous'` on cards

- [ ] **Step 5: Create ProductRow component**

Create `src/components/nutrition/product-row.tsx`:

- Props: `product: Product | SearchResult`, `onPress: () => void`
- Displays: expo-image thumbnail, name, brand, calories per 100g
- Touch target >= 44px

- [ ] **Step 6: Create QuantityInput component**

Create `src/components/nutrition/quantity-input.tsx`:

- Props: `value: number`, `onChange: (v: number) => void`, `unit?: string`
- Displays: numeric input pre-filled with value, "g" suffix
- Validated via Zod: positive number, max 5000

> **Style rule:** All components displaying nutritional numbers MUST use `selectable` prop on `<Text>` and `fontVariant: 'tabular-nums'` style. This applies to CalorieRing, MacroBar, MicroChips, MealSection, and QuantityInput.

- [ ] **Step 7: Write component tests**

Create `src/components/__tests__/calorie-ring.test.tsx`:

```typescript
import { render } from '@testing-library/react-native';
import { CalorieRing } from '../nutrition/calorie-ring';

test('displays consumed and goal', () => {
  const { getByText } = render(<CalorieRing consumed={1284} goal={2100} />);
  expect(getByText('1,284')).toBeTruthy();
  expect(getByText(/2,100/)).toBeTruthy();
});

test('handles zero goal gracefully', () => {
  const { getByText } = render(<CalorieRing consumed={0} goal={0} />);
  expect(getByText('0')).toBeTruthy();
});
```

Create `src/components/__tests__/meal-section.test.tsx`:

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { MealSection } from '../nutrition/meal-section';

const MOCK_ENTRIES = [
  { id: 1, product_name: 'Nutella', quantity: 30, calories: 161.7, meal: 'snack' },
];

test('displays meal name and entries', () => {
  const { getByText } = render(
    <MealSection meal="snack" entries={MOCK_ENTRIES} onDelete={jest.fn()} />
  );
  expect(getByText('Gouter')).toBeTruthy();
  expect(getByText('Nutella')).toBeTruthy();
  expect(getByText('30g')).toBeTruthy();
});
```

- [ ] **Step 8: Run tests**

```bash
npx jest src/components/__tests__/
```

Expected: pass.

- [ ] **Step 9: Commit**

```bash
git add src/components && git commit -m "feat: add nutrition UI components (ring, bars, chips, meal section)"
```

---

## Task 9: Dashboard Screen

**Files:**

- Modify: `src/app/(tabs)/index.tsx`
- Create: `src/hooks/use-daily-summary.ts`

- [ ] **Step 1: Create daily summary hook**

Create `src/hooks/use-daily-summary.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { getEntriesByDate, getDailySummary } from "@/db/queries/entries";
import type { EntryRow } from "@/types/database";
import type { DailySummaryRow } from "@/db/queries/entries";

export function useDailySummary(date: string) {
  const db = useSQLiteContext();
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [summary, setSummary] = useState<DailySummaryRow>({
    calories: 0,
    proteins: 0,
    carbs: 0,
    fats: 0,
    fiber: 0,
    sugars: 0,
    saturated_fat: 0,
    salt: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [e, s] = await Promise.all([
      getEntriesByDate(db, date),
      getDailySummary(db, date),
    ]);
    setEntries(e);
    setSummary(s);
    setLoading(false);
  }, [db, date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, summary, loading, refresh };
}
```

- [ ] **Step 2: Implement Dashboard screen**

Replace `src/app/(tabs)/index.tsx` with full implementation:

- ScrollView with `contentInsetAdjustmentBehavior="automatic"`
- CalorieRing at top, MacroBars below, MicroChips row
- MealSections for each enabled meal, filtered by entries
- FAB button linking to `/add-entry`
- Swipe-to-delete on entries (calls `deleteEntry` + `refresh`)
- Haptic feedback on delete

- [ ] **Step 3: Verify on device/simulator**

```bash
npx expo start
```

Check: dashboard renders with empty state, FAB navigates to add-entry.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(tabs\)/index.tsx src/hooks/use-daily-summary.ts && git commit -m "feat: implement dashboard screen with calorie ring and meal sections"
```

---

## Task 10: Add Entry Flow

**Files:**

- Create: `src/app/add-entry/index.tsx`, `scan.tsx`, `search.tsx`, `manual.tsx`, `confirm.tsx`
- Create: `src/hooks/use-debounce.ts`

- [ ] **Step 1: Create debounce hook**

Create `src/hooks/use-debounce.ts`:

```typescript
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
```

- [ ] **Step 2: Implement choice screen (add-entry/index.tsx)**

3 action buttons (scan, search, manual) + recent products list from `getRecentProducts()`.
Tapping a recent product navigates to `/add-entry/confirm?productId={id}`.

- [ ] **Step 3: Implement scan screen (add-entry/scan.tsx)**

- Full-screen `CameraView` with `onBarcodeScanned`
- Filter for `ean-13` type
- On scan: check local DB → fetch OFF if needed → navigate to confirm
- Handle: product not found → navigate to manual with EAN pre-filled
- Handle: network error → show error + manual entry button
- Handle: camera permission denied → show message with "Open Settings" button (use `Linking.openSettings()`)

- [ ] **Step 4: Implement search screen (add-entry/search.tsx)**

- TextInput with `useDebounce(query, 300)`
- FlashList of `SearchResult` from `searchProducts()`
- Tapping result: `fetchProduct(id)` → upsert to DB → navigate to confirm

- [ ] **Step 5: Implement manual entry screen (add-entry/manual.tsx)**

- React Hook Form + Zod schema:
  ```typescript
  const schema = z.object({
    name: z.string().min(1),
    calories: z.number().min(0),
    proteins: z.number().min(0),
    carbs: z.number().min(0),
    fats: z.number().min(0),
    fiber: z.number().min(0).nullable(),
    sugars: z.number().min(0).nullable(),
    saturated_fat: z.number().min(0).nullable(),
    salt: z.number().min(0).nullable(),
  });
  ```
- On submit: generate UUID, upsert product (source: 'manual'), navigate to confirm

- [ ] **Step 6: Implement confirm screen (add-entry/confirm.tsx)**

- Load product by ID from params
- Show: product name, brand, image (expo-image)
- QuantityInput pre-filled with `product.last_quantity`
- Meal selector (4 buttons, default: `getMealForTime(currentHour)`)
- Confirm button:
  1. `calculateForQuantity(product.nutrition_per_100g, quantity)`
  2. `addEntry(db, { ...calculatedValues, product_id, product_name, meal, quantity, date })`
  3. `updateLastQuantity(db, product_id, quantity)`
  4. Haptic feedback
  5. Dismiss modal (router.back to tabs)

- [ ] **Step 7: Test the full add flow on device**

Scan a product → confirm → verify it appears on dashboard.

- [ ] **Step 8: Commit**

```bash
git add src/app/add-entry src/hooks/use-debounce.ts && git commit -m "feat: implement add entry flow (scan, search, manual, confirm)"
```

---

## Task 11: Product Detail Screen

**Files:**

- Create: `src/app/product/[id].tsx`

- [ ] **Step 1: Implement product detail**

- Load product by `id` param from DB
- Full nutritional table per 100g
- Favorite toggle button (calls `addFavorite`/`removeFavorite`)
- "Edit" button visible only for `source === 'manual'`
- Edit mode: inline form (same fields as manual entry), save updates via `upsertProduct`
- "Add entry" button → navigate to `/add-entry/confirm?productId={id}`

- [ ] **Step 2: Test on device**

Navigate to product detail from dashboard entry tap. Verify edit, favorite toggle.

- [ ] **Step 3: Commit**

```bash
git add src/app/product && git commit -m "feat: implement product detail screen with edit and favorite toggle"
```

---

## Task 12: History Screen

**Files:**

- Modify: `src/app/(tabs)/history.tsx`
- Create: `src/hooks/use-weekly-stats.ts`

- [ ] **Step 1: Create weekly stats hook**

Create `src/hooks/use-weekly-stats.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { getWeeklyTotals, getWeeklySummaries } from "@/db/queries/entries";

export function useWeeklyStats(startDate: string, endDate: string) {
  const db = useSQLiteContext();
  const [dailyTotals, setDailyTotals] = useState<
    {
      date: string;
      calories: number;
      proteins: number;
      carbs: number;
      fats: number;
    }[]
  >([]);

  const refresh = useCallback(async () => {
    const totals = await getWeeklyTotals(db, startDate, endDate);
    setDailyTotals(totals);
  }, [db, startDate, endDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { dailyTotals, refresh };
}

export function useWeekComparisons(weeks: number) {
  const db = useSQLiteContext();
  const [summaries, setSummaries] = useState<
    { week_start: string; total_calories: number }[]
  >([]);

  useEffect(() => {
    getWeeklySummaries(db, weeks).then(setSummaries);
  }, [db, weeks]);

  return summaries;
}
```

- [ ] **Step 2: Implement History screen**

Replace `src/app/(tabs)/history.tsx`:

- SegmentedControl (native iOS) with "Semaine" / "Tendances"
- **Week tab**: week navigator (< > arrows), weekly total, victory-native bar chart (calories per day), day-by-day summary
- **Trends tab**: period selector (4/8/12 weeks), victory-native bar chart (week-vs-week totals), average, trend arrow vs previous

- [ ] **Step 3: Test with sample data**

Add several entries across multiple days, verify charts render correctly.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(tabs\)/history.tsx src/hooks/use-weekly-stats.ts && git commit -m "feat: implement history screen with week view and trends charts"
```

---

## Task 13: Settings Screen

**Files:**

- Modify: `src/app/(tabs)/settings.tsx`

- [ ] **Step 1: Implement Settings screen**

Replace `src/app/(tabs)/settings.tsx`:

- **Goals section**: numeric inputs for each macro (React Hook Form + Zod), save to `useSettingsStore`
- **Enabled meals**: 4 Switch toggles per meal type
- **Theme**: single Switch toggle (dark/light)
- **Manage favorites**: FlashList with drag & drop reorder (react-native-gesture-handler), swipe-to-delete, calls `reorderFavorites`/`removeFavorite`
- **Export CSV**: button → `getAllEntriesForExport()` → `exportEntriesCsv()` → `expo-sharing` ShareSheet

- [ ] **Step 2: Test settings persistence**

Toggle theme, disable a meal, change goals → kill app → reopen → verify state persisted.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(tabs\)/settings.tsx && git commit -m "feat: implement settings screen with goals, meals, theme, favorites management"
```

---

## Task 14: Quick Add Screen

**Files:**

- Create: `src/app/quick-add.tsx`

- [ ] **Step 1: Implement Quick Add screen**

Create `src/app/quick-add.tsx`:

- FlashList of favorites from `getFavorites()`
- Checkbox per item (multi-select state)
- Each item: product name + editable quantity input (default: `last_quantity`)
- Meal selector at bottom (default: `getMealForTime(new Date().getHours())`)
- "Add X products" button:
  1. For each selected favorite: `calculateForQuantity` + `addEntry` + `updateLastQuantity`
  2. Haptic feedback
  3. Dismiss modal

- [ ] **Step 2: Register deep link**

In `app.json`, add scheme:

```json
{ "expo": { "scheme": "kalorapp" } }
```

Verify `kalorapp://quick-add` opens the screen.

- [ ] **Step 3: Commit**

```bash
git add src/app/quick-add.tsx app.json && git commit -m "feat: implement quick-add screen with multi-select favorites and deep link"
```

---

## Task 15: iOS Widget

**Files:**

- Create: `targets/widget/` (Swift WidgetKit extension via @bacons/apple-targets)
- Create: `src/lib/widget-bridge.ts` (JS side: write shared data)

- [ ] **Step 1: Install @bacons/apple-targets**

```bash
npm install @bacons/apple-targets
```

- [ ] **Step 2: Configure widget target**

Add widget target in `app.json` following @bacons/apple-targets docs.
Configure App Group: `group.com.kalorapp.shared`.

- [ ] **Step 3: Create widget bridge (JS side)**

Create `src/lib/widget-bridge.ts`:

- Function `updateWidgetData(summary, goal)` that writes JSON to App Groups shared `UserDefaults`
- Call this function after every `addEntry`/`deleteEntry`

- [ ] **Step 4: Create widget Swift code**

Create `targets/widget/Widget.swift`:

- Small widget: calorie ring + kcal text
- Medium widget: ring + 3 macro bars
- Read data from `UserDefaults(suiteName: "group.com.kalorapp.shared")`
- Timeline: single entry, updated via app

- [ ] **Step 5: Build and test on device**

```bash
eas build --platform ios --profile development
```

Install, add widget to home screen, verify data updates.

- [ ] **Step 6: Commit**

```bash
git add targets src/lib/widget-bridge.ts app.json && git commit -m "feat: add iOS widget with calorie ring and macro bars"
```

---

## Task 16: Siri Shortcuts

**Files:**

- Create: `targets/shortcuts/` (App Intent extension)

- [ ] **Step 1: Create App Intent extension**

Using @bacons/apple-targets, create an App Intent target.
Write Swift code for a `QuickAddIntent` that opens `kalorapp://quick-add`.

- [ ] **Step 2: Configure in app.json**

Add the intent extension target to `app.json`.

- [ ] **Step 3: Build and test**

```bash
eas build --platform ios --profile development
```

Open iOS Shortcuts app → verify "Quick Add" action appears → test the flow.

- [ ] **Step 4: Commit**

```bash
git add targets app.json && git commit -m "feat: add Siri Shortcuts integration with Quick Add intent"
```

---

## Task 17: Final Polish & Cleanup

- [ ] **Step 1: Run full typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Run all tests**

```bash
npx jest
```

- [ ] **Step 3: Test full flow on device**

Complete flow: scan product → add entry → check dashboard → check history → export CSV → widget → shortcut.

- [ ] **Step 4: Add .gitignore for iOS/Android build artifacts if needed**

- [ ] **Step 5: Final commit**

```bash
git add -A && git commit -m "chore: final polish and cleanup"
```
