# KalorApp - Design Spec

## Overview

Personal iOS calorie tracking app built with Expo SDK 55 / React Native. Tracks daily and weekly nutritional intake with EAN barcode scanning via Open Food Facts (free, open source, best French product coverage). 100% local storage, no backend.

## Core Requirements

- **Platform**: iOS only
- **Storage**: 100% local — expo-sqlite (nutritional data, entries, favorites) + MMKV via Zustand persist (preferences: theme, enabled meals, goals)
- **Nutrition data**: Open Food Facts API (free, 4.4M+ products, best French coverage)
- **Barcode scanning**: expo-camera (CameraView, onBarcodeScanned, EAN-13)
- **Tracked nutrients**: calories, proteins, carbs, fats, fiber, sugars, saturated fat, salt (no Nutri-Score)
- **Meals**: 4 default (breakfast, lunch, snack, dinner), individually toggleable
- **Quantity input**: grams, with last-used quantity saved per product
- **Favorites + recent products** for quick access
- **Goals**: daily per-macro objectives. Weekly goals = daily x 7 (derived, not stored separately)
- **Theme**: dark/light with manual toggle (no system follow)
- **Widget**: iOS widget showing daily calorie total, refreshed on each data update
- **Siri Shortcuts**: quick-add screen with multi-select favorites

## Styling Exception: NativeWind

This project deviates from the global NativeWind v5 stack. We use **inline styles** instead, following Apple Human Interface Guidelines and Expo UI best practices. Rationale: the app targets iOS only with a native Apple aesthetic — inline styles with `borderCurve: 'continuous'`, `boxShadow`, and `fontVariant: 'tabular-nums'` map directly to the platform conventions without a CSS abstraction layer.

## Architecture

### Tech Stack

| Concern     | Solution                                                                 |
| ----------- | ------------------------------------------------------------------------ |
| Framework   | Expo SDK 55, Expo Router                                                 |
| UI          | React Native Reusables                                                   |
| Icons       | expo-symbols (SF Symbols)                                                |
| Styling     | Inline styles (Apple HIG)                                                |
| State       | Zustand + MMKV persist (settings, goals, UI)                             |
| Database    | expo-sqlite                                                              |
| Preferences | Zustand persisted via zustandMMKVStorage                                 |
| Lists       | @shopify/flash-list                                                      |
| Forms       | React Hook Form + Zod                                                    |
| Animations  | Reanimated + Moti                                                        |
| Charts      | victory-native                                                           |
| Camera      | expo-camera                                                              |
| Haptics     | expo-haptics (iOS)                                                       |
| Images      | expo-image (with built-in disk cache for OFF product images)             |
| Widget      | @bacons/apple-targets (WidgetKit)                                        |
| Shortcuts   | @bacons/apple-targets (App Intents — requires native Swift in extension) |

### Project Structure

```
src/
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx               # Root layout (providers, theme)
│   ├── (tabs)/                   # Tab navigation
│   │   ├── _layout.tsx           # Tab bar config (3 tabs)
│   │   ├── index.tsx             # Dashboard (today)
│   │   ├── history.tsx           # History / charts
│   │   └── settings.tsx          # Settings
│   ├── add-entry/                # Add entry flow (formSheet)
│   │   ├── _layout.tsx           # Stack for add flow
│   │   ├── index.tsx             # Choose: scan / search / manual
│   │   ├── scan.tsx              # EAN scanner (camera)
│   │   ├── search.tsx            # Search Open Food Facts
│   │   ├── manual.tsx            # Manual entry
│   │   └── confirm.tsx           # Quantity + meal selection + confirm
│   ├── product/
│   │   └── [id].tsx              # Product detail / edit
│   └── quick-add.tsx             # Shortcuts screen (multi-select favorites)
├── components/
│   ├── ui/                       # Primitives (React Native Reusables)
│   └── nutrition/                # Domain components (calorie-ring, meal-card, macro-bar)
├── db/
│   ├── schema.ts                 # Table definitions
│   ├── migrations.ts             # SQLite migrations
│   ├── client.ts                 # SQLite instance (PRAGMA foreign_keys = ON at init)
│   └── queries/                  # Query functions by domain
│       ├── entries.ts
│       ├── products.ts
│       └── favorites.ts
├── hooks/
│   ├── use-database.ts           # DB init hook
│   ├── use-daily-summary.ts      # Daily totals
│   └── use-weekly-stats.ts       # Weekly stats
├── lib/
│   ├── open-food-facts.ts        # OFF API client
│   ├── storage/
│   │   └── app-storage.ts        # MMKV instance + zustandMMKVStorage
│   └── nutrition-utils.ts        # Calculations, formatting
├── stores/
│   ├── settings-store.ts         # Theme, enabled meals, goals (persisted via MMKV)
│   └── ui-store.ts               # Transient UI state
├── types/
│   ├── nutrition.ts
│   └── database.ts
└── constants/
    ├── meals.ts                  # Meal enum (breakfast, lunch, snack, dinner)
    └── theme.ts                  # Colors, spacing
```

### Source of Truth

| Data                         | Where                      | Why                                       |
| ---------------------------- | -------------------------- | ----------------------------------------- |
| Products, entries, favorites | expo-sqlite                | Relational data, needs SQL aggregations   |
| Goals, enabled meals, theme  | Zustand persisted via MMKV | Preferences/settings, no relational needs |
| Transient UI state           | Zustand (not persisted)    | Ephemeral, lost on restart                |

## Database Schema (SQLite)

```sql
-- Enable foreign keys (MUST be run on every connection open)
PRAGMA foreign_keys = ON;

-- Products cached locally (from OFF or manual entry)
CREATE TABLE products (
  id              TEXT PRIMARY KEY,    -- EAN if scanned, UUID if manual
  name            TEXT NOT NULL,
  brand           TEXT,
  image_url       TEXT,                -- OFF URL (expo-image handles disk cache)
  source          TEXT NOT NULL,       -- 'openfoodfacts' | 'manual'
  -- Nutritional values per 100g
  calories        REAL NOT NULL,       -- kcal
  proteins        REAL NOT NULL,       -- g
  carbs           REAL NOT NULL,       -- g
  fats            REAL NOT NULL,       -- g
  fiber           REAL,
  sugars          REAL,
  saturated_fat   REAL,
  salt            REAL,                -- If OFF only has sodium, convert: salt = sodium * 2.5
  last_quantity   REAL DEFAULT 100,    -- Last used quantity (g)
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Meal entries
CREATE TABLE entries (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name    TEXT NOT NULL,       -- Denormalized for display (avoids JOIN on entry lists)
  meal            TEXT NOT NULL,       -- 'breakfast' | 'lunch' | 'snack' | 'dinner'
  quantity        REAL NOT NULL,       -- grams
  date            TEXT NOT NULL,       -- 'YYYY-MM-DD'
  -- Snapshot: CALCULATED values for the quantity entered (not per 100g)
  -- e.g. if product has 200 kcal/100g and quantity is 150g, calories = 300
  calories        REAL NOT NULL,
  proteins        REAL NOT NULL,
  carbs           REAL NOT NULL,
  fats            REAL NOT NULL,
  fiber           REAL,
  sugars          REAL,
  saturated_fat   REAL,
  salt            REAL,
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Favorites
CREATE TABLE favorites (
  product_id      TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  sort_order      INTEGER DEFAULT 0,   -- For reordering (drag & drop in settings)
  created_at      TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_entries_date ON entries(date);
CREATE INDEX idx_entries_date_meal ON entries(date, meal);
CREATE INDEX idx_entries_product ON entries(product_id);
```

**Note:** No `goals` table. Goals are stored in Zustand (settings-store) persisted via MMKV. They represent daily targets. Weekly comparisons use daily goal x 7.

**Note:** Products are never deleted by the user (no delete UI). The products table acts as a local cache. ON DELETE CASCADE is a safety net only, not a feature path.

## Data Flow

### Barcode Scan Flow

```
expo-camera onBarcodeScanned (EAN-13)
  -> Check local cache: SELECT FROM products WHERE id = EAN
    -> Found: go to confirm screen (quantity + meal)
    -> Not found: fetch OFF API
      -> GET https://world.openfoodfacts.org/api/v2/product/{EAN}
        -> Found (status: 1): save to products cache, go to confirm screen
        -> Not found (status: 0): redirect to manual entry (pre-filled EAN)
        -> Network error: show error + "Manual entry" button
```

### Open Food Facts API

- **Product lookup**: `GET https://world.openfoodfacts.org/api/v2/product/{barcode}`
- **Text search**: `GET https://world.openfoodfacts.org/cgi/search.pl?search_terms={query}&json=true&page_size=20`
- **User-Agent**: `KalorApp/1.0 (personal project)`
- **Timeout**: 5s, 1 retry
- **Fields extracted**: product_name, brands, image_front_url, nutriments.\*\_100g
- **Salt fallback**: if `salt_100g` is missing but `sodium_100g` exists, compute `salt = sodium * 2.5`
- **Search pagination**: limited to first 20 results (no infinite scroll — sufficient for personal use)

### Entry Creation Flow

When confirming an entry:

1. Save/update product in `products` table (with `last_quantity` updated)
2. Calculate nutritional values: `value = (product_value_per_100g * quantity) / 100`
3. Insert into `entries` with calculated snapshot values + `product_name` copy
4. Trigger widget refresh: write updated daily totals to App Groups shared JSON → `WidgetCenter.shared.reloadAllTimelines()`

## Screens

### Dashboard (tabs/index.tsx)

Main screen. Shows today's nutritional summary.

- **Header**: date (today)
- **Calorie ring**: animated SVG ring showing consumed/goal with kcal count centered
- **Macro bars**: 3 horizontal progress bars (proteins blue #60a5fa, carbs yellow #fbbf24, fats red #f87171)
- **Micro-nutrients row**: compact chips for fiber, sugars, saturated fat, salt
- **Meal sections**: list of enabled meals, each with:
  - Meal name + subtotal kcal
  - List of entries (product name, quantity in g, kcal)
  - Swipe to delete entry
- **FAB button** (+): opens add-entry flow as formSheet
- ScrollView with contentInsetAdjustmentBehavior="automatic"

### History (tabs/history.tsx)

Two sub-views via segmented control:

**Week tab (default):**

- Week navigator (< Mon 17 - Sun 23 Mar >)
- Weekly total: calories + each macro
- Bar chart: calories per day of the week
- Day-by-day detail below

**Trends tab:**

- Week-vs-week bar chart: total calories per week (last 4/8/12 weeks)
- Weekly average over period
- Current week vs previous weeks average (trend arrow)

### Settings (tabs/settings.tsx)

- **Goals**: kcal + each macro target (daily values)
- **Enabled meals**: toggles for breakfast/lunch/snack/dinner
- **Theme**: dark/light toggle
- **Manage favorites**: drag & drop reorder (updates `sort_order`), swipe to delete
- **Export CSV**: exports all entries as CSV (date, meal, product_name, quantity, calories, proteins, carbs, fats, fiber, sugars, saturated_fat, salt). Shared via iOS ShareSheet (`expo-sharing`).

### Add Entry Flow (add-entry/, formSheet)

1. **Choice screen**: 3 options (scan, search, manual) + recent products list (last 10 distinct products from entries, ordered by most recent)
2. **Scan**: full-screen camera, detects EAN -> confirm
3. **Search**: text input with debounce 300ms, live results from OFF (name, brand, thumbnail)
4. **Manual**: form (name, calories, proteins, carbs, fats, optional: fiber/sugars/sat fat/salt)
5. **Confirm**: product info (name, brand, image), gram input (pre-filled with last_quantity), meal selector, confirm button

### Product Detail (product/[id].tsx)

Accessed from favorites list, recent products, or by tapping an entry.

- Product name, brand, image
- Full nutritional table per 100g (all tracked nutrients)
- "Add to favorites" / "Remove from favorites" toggle
- "Edit" button (for manual products only — OFF products are read-only)
- Edit mode: same form as manual entry, pre-filled with current values
- "Add entry" button -> go to confirm screen

### Quick Add (quick-add.tsx, for Shortcuts)

- FlashList of favorites with checkboxes (multi-select)
- Each item shows: name + last quantity (editable inline)
- Meal selector at bottom (default: next logical meal based on current time — before 11h: breakfast, 11-14h: lunch, 14-17h: snack, after 17h: dinner)
- "Add X products" button -> inserts all entries at once -> closes

## UI Design

### Color Palette

| Token           | Dark             | Light                    |
| --------------- | ---------------- | ------------------------ |
| Background      | #000 / #111      | #fff / #f5f5f5           |
| Card            | #1a1a1a          | #ffffff (with boxShadow) |
| Text primary    | #ffffff          | #0f172a                  |
| Text secondary  | #888888          | #475569                  |
| Text muted      | #666666          | #94a3b8                  |
| Calories accent | #4ade80 (green)  | #16a34a                  |
| Proteins        | #60a5fa (blue)   | #2563eb                  |
| Carbs           | #fbbf24 (yellow) | #d97706                  |
| Fats            | #f87171 (red)    | #dc2626                  |
| Separator       | #222222          | #e5e7eb                  |

### Layout: Ring-centered dashboard

- Calorie ring dominant at top center (Reanimated animated)
- Macro bars below ring
- Micro-nutrient chips row
- Vertical meal list with entries
- FAB (+) bottom-right (green accent, boxShadow)

### Style Guidelines (from Expo UI / Apple HIG)

- `borderCurve: 'continuous'` on all rounded corners
- `fontVariant: 'tabular-nums'` on all numeric displays
- `boxShadow` for shadows (no legacy shadow props)
- `contentInsetAdjustmentBehavior="automatic"` on all ScrollViews/FlashLists
- `expo-haptics` feedback on add/delete actions
- `presentation: "formSheet"` for add-entry flow
- `expo-symbols` (SF Symbols) for tab icons and UI icons
- `selectable` prop on Text displaying nutritional data
- Minimum 44x44 touch targets
- Animations: 150-300ms for micro-interactions (Reanimated)

## Widget (iOS)

- **Small widget**: calorie ring + total kcal / goal
- **Medium widget**: calorie ring + macro bars (P/C/F)
- Built with `@bacons/apple-targets` (WidgetKit extension)
- Data sharing via App Groups:
  - App writes JSON to shared container: `{ calories: number, goal: number, proteins: number, carbs: number, fats: number }`
  - Container path: `group.com.kalorapp.shared` (configured in app.json and widget target)
  - Written via a native module or expo-apple-targets helper that writes to `UserDefaults(suiteName: "group.com.kalorapp.shared")`
- Refresh: triggered by app on each data update (`WidgetCenter.shared.reloadAllTimelines()`)

## Siri Shortcuts (iOS)

- **Quick Add action**: exposed via App Intents
- Built with `@bacons/apple-targets` — the App Intent itself is written in **native Swift** inside the extension target (no React Native bridge for intents)
- The intent opens the app to `quick-add.tsx` screen via deep link (`kalorapp://quick-add`)
- User selects products, picks meal, confirms -> entries added
- Action visible in iOS Shortcuts app for custom automations

**Complexity note**: App Intents require native Swift code. The intent is minimal (just opens the app to the quick-add deep link). The actual UI and logic remain in React Native.

## Error Handling

- **OFF unavailable / timeout**: "Cannot reach Open Food Facts. Check your connection." + "Manual entry" button
- **Product not found in OFF**: "Product not found" + redirect to manual entry (pre-filled EAN)
- **Camera permission denied**: message explaining how to re-enable in iOS Settings
- **SQLite errors**: graceful crash with clear message (extremely rare for local)
- **Quantity validation**: Zod — positive number, max 5000g
- **Offline product images**: expo-image handles disk caching automatically. Previously viewed product images remain available offline.

## Testing

- **Unit (Jest)**: utility functions (nutrition-utils), aggregation calculations, OFF response parsing, Zod validation, salt/sodium conversion
- **Components (RNTL)**: key components rendering (calorie ring, meal card, confirm screen), interactions (add/delete entry)
- **DB (Jest)**: SQLite queries with in-memory DB (insert, select, aggregations, migrations, ON DELETE CASCADE behavior)
- **No E2E**: overkill for a personal app
