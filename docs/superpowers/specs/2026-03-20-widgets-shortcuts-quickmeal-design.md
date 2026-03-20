# Widgets, Shortcuts & Quick Meal - Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Overview

Add iOS home screen widgets (small + medium), an iOS Shortcuts action for quick meal logging from favorites, and an in-app Quick Meal screen. All native features use `expo-apple-targets` with SwiftUI/App Intents. Data is shared between the React Native app and native extensions via App Groups.

## 1. In-App Quick Meal Screen

### Route

`/add-entry/quick-meal` — Single multi-step screen with internal state (step 1: selection, step 2: recap). This differs from the existing multi-route pattern (search → confirm) because both steps share selected items state and keeping it in one component avoids prop drilling or global state.

### Flow

1. **Favorites selection** — List of all favorited products with checkboxes (multi-select). Each row shows: product image, name, brand, `last_quantity` hint. Empty state if no favorites. Button "Suivant" enabled when >= 1 item selected.

2. **Quantity recap** — List of selected items, each with a `QuantityInput` pre-filled with `last_quantity`. Meal auto-assigned via `getMealForTime()` (lunch < 17h, dinner >= 17h). Shows per-item calories and total at bottom. Button "Ajouter tout".

3. **Submission** — Batch insert all entries wrapped in `db.withTransactionAsync()` for atomicity. Update `last_quantity` for each product. Sync widget data. Haptic feedback (success). `router.dismissAll()`.

### Data Source

Use existing `getFavoritesWithProducts()` from `src/db/queries/favorites.ts` which returns `FavoriteWithProduct[]` (ProductRow + sort_order), ordered by `sort_order ASC`.

### Navigation

- Accessible from the add-entry index screen (new ActionButton: "Repas rapide")
- Accessible via deep link: `kalorapp:///add-entry/quick-meal` (matches Expo Router file-based routing)
- Accessible via iOS Shortcuts App Intent

## 2. iOS Widgets (SwiftUI via expo-apple-targets)

### App Group

- Identifier: `group.com.kalorapp.app`
- Shared UserDefaults for widget data (JSON)
- Shared SQLite DB path for App Intent (Shortcuts)

### Shared Widget Data Format (UserDefaults)

Key: `"dailySummary"`

```json
{
  "date": "2026-03-20",
  "calories": 1450,
  "proteins": 82.5,
  "carbs": 180.0,
  "fats": 55.2,
  "fiber": 12.0,
  "sugars": 45.0,
  "saturated_fat": 18.0,
  "salt": 3.2,
  "caloriesGoal": 2100,
  "proteinsGoal": 120,
  "carbsGoal": 250,
  "fatsGoal": 70,
  "fiberGoal": null,
  "sugarsGoal": null,
  "saturatedFatGoal": null,
  "saltGoal": null
}
```

All 8 nutrient fields + goals included for future-proofing, even though current widgets only display the 4 main macros.

### When to Update

- After every `addEntry()` call
- After every `deleteEntry()` call
- After `setGoals()` in settings store (goals change independently of entries)
- On app launch (sync on mount)

Update mechanism: React Native bridge module that reads goals from `useSettingsStore.getState().goals`, computes daily summary from SQLite, writes to `UserDefaults(suiteName: "group.com.kalorapp.app")`, and calls `WidgetCenter.shared.reloadAllTimelines()`.

### Small Widget (systemSmall)

- Circular progress ring showing calories consumed vs goal
- Center text: consumed / goal (e.g., "1450 / 2100")
- Label: "kcal"
- Color: accent calories color
- Tap: opens app (deep link to dashboard)

### Medium Widget (systemMedium)

- Left side: calorie ring (same as small)
- Right side: 3 horizontal progress bars
  - Proteins: current / goal
  - Carbs: current / goal
  - Fats: current / goal
- Each bar shows label + "82 / 120g" format
- Tap: opens app (deep link to dashboard)

### Widget Timeline Strategy

Use `TimelineProvider` with `.atEnd` policy and a single entry. Data only changes via explicit user action (add/delete entry, change goals), at which point `reloadAllTimelines()` is called. No periodic refresh needed.

### Widget Configuration

No user configuration needed. Widgets read from shared UserDefaults automatically.

## 3. iOS Shortcuts Integration (App Intent)

### Intent: "Ajouter un repas rapide"

Runs entirely within Shortcuts, no app launch.

### Meal Auto-Assignment

The user explicitly requested a simple binary rule: hour < 17 → "lunch", hour >= 17 → "dinner". This applies identically in the in-app Quick Meal screen and the App Intent. Breakfast and snack remain available as manual selections in other flows (confirm screen) but are not auto-assigned.

#### Parameters

1. **selectedFavorites** — Multi-select parameter with `DynamicOptionsProvider`. Reads favorites from shared SQLite DB in App Group container. Displays product name + brand.

2. **quantities** — For each selected favorite, a sequential dialog: "{product name} — Quantité (g) ?" with numeric input, default value = `last_quantity`.

#### Execution

1. Read selected products from shared SQLite
2. Calculate nutrition for each item: `nutrition_per_100g * quantity / 100`
3. Determine meal: hour < 17 → "lunch", hour >= 17 → "dinner"
4. Insert entries into shared SQLite `entries` table (within a transaction)
5. Update `last_quantity` for each product
6. Update UserDefaults widget data (recalculate daily summary)
7. Trigger widget timeline reload

#### Result

Confirmation view: "{n} aliments ajoutés — {total} kcal"

### Shared SQLite Access

The App Intent extension reads/writes the same SQLite database as the React Native app. The DB must be located in the App Group shared container.

#### Concurrent Access Strategy

SQLite WAL mode is already enabled (`PRAGMA journal_mode = 'wal'` in `src/db/migrations.ts`). WAL supports concurrent readers with one writer. The Swift side must:

- Open the DB with WAL mode enabled
- Set `sqlite3_busy_timeout(db, 3000)` (3s busy timeout) to handle contention if the RN app is writing simultaneously
- Use transactions for multi-statement writes (entry inserts + last_quantity updates)

## 4. Infrastructure: App Groups & Shared Data

### Setup

1. **expo-apple-targets** config plugin in `app.json`:
   - Widget extension target (hosts both SwiftUI widgets and App Intent)
   - App Group entitlement: `group.com.kalorapp.app` (on both main app and extension)

2. **React Native bridge module** (Expo Module):
   - Write daily summary JSON to shared UserDefaults
   - Trigger widget timeline reload via native call
   - Expose shared container path for SQLite

3. **SQLite migration to shared container:**

#### Migration Algorithm

On app launch, before opening the database:

```
1. Get shared container path:
   containerURL = FileManager.containerURL(forSecurityApplicationGroupIdentifier: "group.com.kalorapp.app")
   sharedDBPath = containerURL + "/kalor.db"

2. Get old DB path:
   oldDBPath = (app documents directory) + "/kalor.db"

3. Check migration state via MMKV key "db_migrated_to_appgroup":
   - If true → open sharedDBPath, done
   - If false/missing → continue

4. If oldDBPath exists:
   a. Run PRAGMA wal_checkpoint(TRUNCATE) on old DB (flush WAL to main file)
   b. Copy kalor.db to sharedDBPath
   c. Copy kalor.db-wal and kalor.db-shm if they exist (safety)
   d. Verify copy: open sharedDBPath, run "SELECT count(*) FROM products"
   e. If verify succeeds:
      - Set MMKV "db_migrated_to_appgroup" = true
      - Keep old DB as backup (do NOT delete)
   f. If verify fails:
      - Delete sharedDBPath (corrupted copy)
      - Continue using oldDBPath
      - Log error for debugging

5. If oldDBPath does not exist (fresh install):
   - Open sharedDBPath (expo-sqlite creates it)
   - Set MMKV "db_migrated_to_appgroup" = true
```

#### Rollback

The old DB is never deleted. If migration fails, the app continues using the old path. The MMKV flag ensures migration is only attempted once on success. In case of data corruption post-migration, a future app update could add a "restore from backup" option.

#### expo-sqlite Configuration

Replace `SQLiteProvider databaseName="kalor.db"` with `openDatabaseAsync` using the absolute shared container path. The path is provided by the native bridge module.

### Data Flow

```
[React Native App]
    |
    |-- addEntry() / deleteEntry() / setGoals()
    |       |
    |       |-- Write to SQLite (shared container)
    |       |-- Update UserDefaults (daily summary JSON)
    |       |-- WidgetCenter.reloadAllTimelines()
    |
    v
[Widget Extension (SwiftUI)]
    |-- Reads UserDefaults → renders widget UI
    |
[App Intent (same extension target)]
    |-- Reads SQLite → DynamicOptionsProvider (favorites list)
    |-- Writes SQLite → new entries (with busy_timeout)
    |-- Updates UserDefaults → widget refresh
```

Note: App Intent and Widget share the same extension target to avoid duplicating App Group setup and data access code.

## 5. Files to Create / Modify

### New files (React Native)

- `src/app/add-entry/quick-meal.tsx` — Quick Meal screen (selection + recap, single multi-step component)
- `src/lib/shared-data.ts` — Bridge to write UserDefaults + reload widgets
- `src/modules/widget-bridge/` — Expo native module for UserDefaults + WidgetCenter + shared container path

### Modified files (React Native)

- `src/app/_layout.tsx` — Switch from `SQLiteProvider databaseName` to `openDatabaseAsync` with shared container path
- `src/app/add-entry/_layout.tsx` — Add quick-meal route
- `src/app/add-entry/index.tsx` — Add "Repas rapide" action button
- `src/db/queries/entries.ts` — After add/delete, call widget sync
- `src/stores/settings-store.ts` — After setGoals(), call widget sync
- `app.json` — Add expo-apple-targets plugin config, App Group entitlement

### New files (Native / expo-apple-targets)

- `targets/widget/` — Widget extension (SwiftUI + App Intent, single target)
  - `KalorWidget.swift` — Widget entry point + TimelineProvider (.atEnd policy)
  - `SmallWidgetView.swift` — Small widget UI (calorie ring)
  - `MediumWidgetView.swift` — Medium widget UI (ring + macro bars)
  - `SharedData.swift` — Read/decode UserDefaults JSON
  - `QuickMealIntent.swift` — App Intent definition + execution
  - `FavoritesProvider.swift` — DynamicOptionsProvider reading SQLite
  - `SQLiteHelper.swift` — Shared SQLite read/write with WAL + busy_timeout

### Dependencies

- `expo-apple-targets` (new) — verify compatibility with Expo SDK 55 before starting

## 6. Out of Scope

- Android widgets (future)
- Widget user configuration (theme, goal override)
- Multiple shortcut actions (only "quick meal" for now)
- Siri voice trigger (comes free with App Intents but not explicitly designed for)
- Entry editing (no `updateEntry` — only add/delete trigger widget sync)
