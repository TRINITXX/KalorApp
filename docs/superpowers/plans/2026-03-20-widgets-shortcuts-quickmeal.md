# Widgets, Shortcuts & Quick Meal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add iOS widgets (calorie ring + macros), a Shortcuts "quick meal from favorites" action, and an in-app Quick Meal screen.

**Architecture:** Three layers — (1) React Native Quick Meal screen + widget sync logic, (2) Expo native module bridging UserDefaults/WidgetCenter, (3) SwiftUI widget extension hosting widgets + App Intent. Data shared via App Groups (SQLite in shared container + UserDefaults JSON for widgets).

**Tech Stack:** Expo SDK 55, expo-apple-targets, SwiftUI, App Intents (iOS 16+), expo-sqlite, Zustand/MMKV

**Spec:** `docs/superpowers/specs/2026-03-20-widgets-shortcuts-quickmeal-design.md`

---

## File Structure

### New files

| File                                                     | Responsibility                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/app/add-entry/quick-meal.tsx`                       | Multi-step Quick Meal screen (select favorites → edit quantities → submit)    |
| `src/lib/widget-sync.ts`                                 | Compute daily summary JSON + write to shared UserDefaults via native bridge   |
| `src/modules/widget-bridge/index.ts`                     | JS interface for the Expo native module                                       |
| `src/modules/widget-bridge/ios/WidgetBridgeModule.swift` | Native module: UserDefaults write, WidgetCenter reload, shared container path |
| `src/modules/widget-bridge/expo-module.config.json`      | Expo module config                                                            |
| `targets/widget/KalorWidget.swift`                       | Widget entry point + TimelineProvider                                         |
| `targets/widget/SmallWidgetView.swift`                   | Small widget UI (calorie ring)                                                |
| `targets/widget/MediumWidgetView.swift`                  | Medium widget UI (ring + macro bars)                                          |
| `targets/widget/SharedData.swift`                        | Decode UserDefaults JSON into Swift struct                                    |
| `targets/widget/QuickMealIntent.swift`                   | App Intent: select favorites, quantity dialogs, insert entries                |
| `targets/widget/SQLiteHelper.swift`                      | Read/write shared SQLite from Swift (favorites, entries, products)            |
| `targets/widget/Info.plist`                              | Widget extension plist                                                        |
| `targets/widget/expo-target.config.js`                   | expo-apple-targets config for this target                                     |

### Modified files

| File                            | Change                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `app.json`                      | Add expo-apple-targets plugin, App Group entitlement                         |
| `src/db/client.ts`              | Export shared container path, use `openDatabaseAsync` with absolute path     |
| `src/app/_layout.tsx`           | Switch from `SQLiteProvider databaseName` to manual DB open with shared path |
| `src/app/add-entry/_layout.tsx` | Add quick-meal Stack.Screen                                                  |
| `src/app/add-entry/index.tsx`   | Add "Repas rapide" ActionButton                                              |
| `src/db/queries/entries.ts`     | Call widget sync after add/delete                                            |
| `src/stores/settings-store.ts`  | Call widget sync after setGoals                                              |

---

## Task 1: Quick Meal Screen

**Files:**

- Create: `src/app/add-entry/quick-meal.tsx`
- Modify: `src/app/add-entry/_layout.tsx`
- Modify: `src/app/add-entry/index.tsx`

- [ ] **Step 1: Add route to layout**

In `src/app/add-entry/_layout.tsx`, add the screen:

```tsx
<Stack.Screen name="quick-meal" options={{ title: "Repas rapide" }} />
```

Add it after the `confirm` screen.

- [ ] **Step 2: Add ActionButton on index**

In `src/app/add-entry/index.tsx`, add a new button between "Rechercher" and "Saisie manuelle":

```tsx
<ActionButton
  icon="bolt.fill"
  label="Repas rapide"
  onPress={() => router.push("/add-entry/quick-meal")}
  colors={colors}
/>
```

- [ ] **Step 3: Create the Quick Meal screen — step 1 (favorites selection)**

Create `src/app/add-entry/quick-meal.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Image, type ImageStyle } from "expo-image";
import * as Haptics from "expo-haptics";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { getFavorites } from "@/db/queries/favorites";
import { addEntry } from "@/db/queries/entries";
import { updateLastQuantity } from "@/db/queries/products";
import { calculateForQuantity, getMealForTime } from "@/lib/nutrition-utils";
import { productRowToNutrition, formatDateISO } from "@/lib/product-utils";
import { QuantityInput } from "@/components/nutrition/quantity-input";
import type { FavoriteWithProduct } from "@/db/queries/favorites";

type Step = "select" | "recap";

interface SelectedItem {
  product: FavoriteWithProduct;
  quantity: number;
}

export default function QuickMealScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const colors = useThemeColors();

  const [favorites, setFavorites] = useState<FavoriteWithProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<Step>("select");
  const [items, setItems] = useState<SelectedItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getFavorites(db).then(setFavorites);
  }, [db]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const goToRecap = useCallback(() => {
    const selected = favorites
      .filter((f) => selectedIds.has(f.id))
      .map((product) => ({
        product,
        quantity: product.last_quantity,
      }));
    setItems(selected);
    setStep("recap");
  }, [favorites, selectedIds]);

  const updateQuantity = useCallback((index: number, quantity: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity } : item)),
    );
  }, []);

  const totalCalories = useMemo(
    () =>
      items.reduce((sum, item) => {
        const nutrition = productRowToNutrition(item.product);
        const calc = calculateForQuantity(nutrition, item.quantity);
        return sum + calc.calories;
      }, 0),
    [items],
  );

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const meal = getMealForTime(new Date().getHours());
      const date = formatDateISO();

      await db.withTransactionAsync(async () => {
        for (const item of items) {
          const nutrition = productRowToNutrition(item.product);
          const calc = calculateForQuantity(nutrition, item.quantity);

          await addEntry(db, {
            product_id: item.product.id,
            product_name: item.product.name,
            meal,
            quantity: item.quantity,
            date,
            calories: calc.calories,
            proteins: calc.proteins,
            carbs: calc.carbs,
            fats: calc.fats,
            fiber: calc.fiber,
            sugars: calc.sugars,
            saturated_fat: calc.saturated_fat,
            salt: calc.salt,
          });

          await updateLastQuantity(db, item.product.id, item.quantity);
        }
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
    } catch {
      Alert.alert("Erreur", "Impossible d'ajouter les entrees.");
      setSubmitting(false);
    }
  }, [db, items, router, submitting]);

  if (step === "select") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
          {favorites.length === 0 && (
            <Text
              style={{
                textAlign: "center",
                color: colors.textMuted,
                fontSize: 15,
                marginTop: 32,
              }}
            >
              Aucun favori. Ajoutez des produits en favoris pour utiliser cette
              fonctionnalite.
            </Text>
          )}

          {favorites.map((fav) => {
            const isSelected = selectedIds.has(fav.id);
            return (
              <Pressable
                key={fav.id}
                onPress={() => toggleSelection(fav.id)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 12,
                  borderCurve: "continuous",
                  backgroundColor: colors.card,
                  borderWidth: 1.5,
                  borderColor: isSelected
                    ? colors.accent.calories
                    : colors.separator,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                {/* Checkbox */}
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: isSelected
                      ? colors.accent.calories
                      : colors.textMuted,
                    backgroundColor: isSelected
                      ? colors.accent.calories
                      : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  {isSelected && (
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: "700",
                        lineHeight: 16,
                      }}
                    >
                      ✓
                    </Text>
                  )}
                </View>

                {/* Image */}
                {fav.image_url ? (
                  <Image
                    source={{ uri: fav.image_url }}
                    style={
                      {
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        borderCurve: "continuous",
                      } as unknown as ImageStyle
                    }
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      borderCurve: "continuous",
                      backgroundColor: colors.isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.05)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 18, color: colors.textMuted }}>
                      ?
                    </Text>
                  </View>
                )}

                {/* Info */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "500",
                      color: colors.textPrimary,
                    }}
                    numberOfLines={1}
                  >
                    {fav.name}
                  </Text>
                  {fav.brand ? (
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.textSecondary,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {fav.brand}
                    </Text>
                  ) : null}
                </View>

                {/* Quantity hint */}
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textMuted,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {fav.last_quantity}g
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Bottom button */}
        {selectedIds.size > 0 && (
          <View style={{ padding: 16, paddingBottom: 32 }}>
            <Pressable
              onPress={goToRecap}
              style={({ pressed }) => ({
                backgroundColor: colors.accent.calories,
                paddingVertical: 14,
                borderRadius: 12,
                borderCurve: "continuous",
                alignItems: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                Suivant ({selectedIds.size})
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  // Step: recap
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {items.map((item, index) => {
          const nutrition = productRowToNutrition(item.product);
          const calc = calculateForQuantity(nutrition, item.quantity);

          return (
            <View
              key={item.product.id}
              style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                borderCurve: "continuous",
                padding: 14,
                gap: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: colors.textPrimary,
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {item.product.name}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: colors.textSecondary,
                    fontVariant: ["tabular-nums"],
                    marginLeft: 8,
                  }}
                >
                  {Math.round(calc.calories)} kcal
                </Text>
              </View>
              <QuantityInput
                value={item.quantity}
                onChange={(v) => updateQuantity(index, v)}
              />
            </View>
          );
        })}

        {/* Total */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 4,
            paddingVertical: 8,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.textPrimary,
            }}
          >
            Total
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.accent.calories,
              fontVariant: ["tabular-nums"],
            }}
          >
            {Math.round(totalCalories)} kcal
          </Text>
        </View>
      </ScrollView>

      {/* Submit button */}
      <View style={{ padding: 16, paddingBottom: 32 }}>
        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={({ pressed }) => ({
            backgroundColor: colors.accent.calories,
            paddingVertical: 14,
            borderRadius: 12,
            borderCurve: "continuous",
            alignItems: "center",
            opacity: pressed || submitting ? 0.5 : 1,
          })}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
            Ajouter tout
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Verify Quick Meal screen works**

Run: `npx expo start --clear`

Test flow:

1. Tap "+" FAB → "Repas rapide"
2. Select 2+ favorites → "Suivant"
3. Edit quantities → "Ajouter tout"
4. Verify entries appear on dashboard

- [ ] **Step 5: Commit**

```bash
git add src/app/add-entry/quick-meal.tsx src/app/add-entry/_layout.tsx src/app/add-entry/index.tsx
git commit -m "feat(quick-meal): add quick meal screen with favorites selection and batch entry"
```

---

## Task 2: Widget Bridge — Expo Native Module

**Files:**

- Create: `src/modules/widget-bridge/index.ts`
- Create: `src/modules/widget-bridge/ios/WidgetBridgeModule.swift`
- Create: `src/modules/widget-bridge/expo-module.config.json`

- [ ] **Step 1: Create module config**

Create `src/modules/widget-bridge/expo-module.config.json`:

```json
{
  "platforms": ["ios"],
  "ios": {
    "modules": ["WidgetBridgeModule"]
  }
}
```

- [ ] **Step 2: Create Swift native module**

Create `src/modules/widget-bridge/ios/WidgetBridgeModule.swift`:

```swift
import ExpoModulesCore
import WidgetKit

private let appGroupId = "group.com.kalorapp.app"

public class WidgetBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WidgetBridge")

    Function("getSharedContainerPath") { () -> String? in
      return FileManager.default
        .containerURL(forSecurityApplicationGroupIdentifier: appGroupId)?
        .appendingPathComponent("kalor.db")
        .path
    }

    Function("setWidgetData") { (jsonString: String) in
      guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
      defaults.set(jsonString, forKey: "dailySummary")
    }

    Function("reloadWidgets") {
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }
}
```

- [ ] **Step 3: Create JS interface**

Create `src/modules/widget-bridge/index.ts`:

```typescript
import { requireNativeModule, Platform } from "expo-modules-core";

interface WidgetBridgeModule {
  getSharedContainerPath(): string | null;
  setWidgetData(jsonString: string): void;
  reloadWidgets(): void;
}

const isIOS = Platform.OS === "ios";

const NativeModule: WidgetBridgeModule | null = isIOS
  ? requireNativeModule("WidgetBridge")
  : null;

export function getSharedContainerPath(): string | null {
  return NativeModule?.getSharedContainerPath() ?? null;
}

export function setWidgetData(jsonString: string): void {
  NativeModule?.setWidgetData(jsonString);
}

export function reloadWidgets(): void {
  NativeModule?.reloadWidgets();
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/modules/widget-bridge/
git commit -m "feat(widget-bridge): add Expo native module for UserDefaults and WidgetCenter"
```

---

## Task 3: Widget Sync Logic

**Files:**

- Create: `src/lib/widget-sync.ts`
- Modify: `src/db/queries/entries.ts`
- Modify: `src/stores/settings-store.ts`

- [ ] **Step 1: Create widget sync helper**

Create `src/lib/widget-sync.ts`:

```typescript
import type { SQLiteDatabase } from "expo-sqlite";

import { getDailySummary } from "@/db/queries/entries";
import { formatDateISO } from "@/lib/product-utils";
import { useSettingsStore } from "@/stores/settings-store";
import { setWidgetData, reloadWidgets } from "@/modules/widget-bridge";

export async function syncWidgetData(db: SQLiteDatabase): Promise<void> {
  const date = formatDateISO();
  const summary = await getDailySummary(db, date);
  const goals = useSettingsStore.getState().goals;

  const payload = JSON.stringify({
    date,
    calories: summary.calories,
    proteins: summary.proteins,
    carbs: summary.carbs,
    fats: summary.fats,
    fiber: summary.fiber,
    sugars: summary.sugars,
    saturated_fat: summary.saturated_fat,
    salt: summary.salt,
    caloriesGoal: goals.calories,
    proteinsGoal: goals.proteins,
    carbsGoal: goals.carbs,
    fatsGoal: goals.fats,
    fiberGoal: goals.fiber,
    sugarsGoal: goals.sugars,
    saturatedFatGoal: goals.saturated_fat,
    saltGoal: goals.salt,
  });

  setWidgetData(payload);
  reloadWidgets();
}
```

- [ ] **Step 2: Wire sync into addEntry and deleteEntry**

In `src/db/queries/entries.ts`, add import at top:

```typescript
import { syncWidgetData } from "@/lib/widget-sync";
```

Modify `addEntry` — after the INSERT, before returning:

```typescript
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
  syncWidgetData(db).catch(() => {});
  return result.lastInsertRowId;
}
```

Modify `deleteEntry` similarly:

```typescript
export async function deleteEntry(
  db: SQLiteDatabase,
  id: number,
): Promise<void> {
  await db.runAsync("DELETE FROM entries WHERE id = ?", id);
  syncWidgetData(db).catch(() => {});
}
```

- [ ] **Step 3: Wire sync into setGoals**

In `src/stores/settings-store.ts`, this requires the DB reference which isn't available in the store. Instead, add a subscription in `src/app/_layout.tsx` or call sync from the settings screen. The simplest approach: export a standalone sync trigger.

Add to `src/lib/widget-sync.ts`:

```typescript
export function syncWidgetGoals(): void {
  const goals = useSettingsStore.getState().goals;
  // We don't have db here, so just update the goals portion
  // Full sync happens on next entry add/delete or app launch
  // This is acceptable since goal changes are infrequent
}
```

Actually, the cleanest approach is to subscribe in the root layout. Add to `src/app/_layout.tsx` inside `RootLayout`:

```typescript
// Sync widget on app launch
useEffect(() => {
  // Will be connected once DB migration is done (Task 4)
}, []);
```

This will be fully connected in Task 4.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/lib/widget-sync.ts src/db/queries/entries.ts
git commit -m "feat(widget-sync): sync daily summary to shared UserDefaults after entry changes"
```

---

## Task 4: SQLite Migration to App Group Container

**Files:**

- Modify: `src/db/client.ts`
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: Update DB client for shared container**

Replace `src/db/client.ts`:

```typescript
import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";

import { migrateDbIfNeeded } from "./migrations";
import { getSharedContainerPath } from "@/modules/widget-bridge";
import { mmkv } from "@/lib/storage/app-storage";

export const DATABASE_NAME = "kalor.db";

const MIGRATION_KEY = "db_migrated_to_appgroup";

export async function openSharedDatabase(): Promise<SQLiteDatabase> {
  const sharedPath = Platform.OS === "ios" ? getSharedContainerPath() : null;

  if (!sharedPath) {
    // Android or no App Group — use default path
    const db = await openDatabaseAsync(DATABASE_NAME);
    await migrateDbIfNeeded(db);
    return db;
  }

  const alreadyMigrated = mmkv.getBoolean(MIGRATION_KEY) ?? false;

  if (!alreadyMigrated) {
    // Try to migrate existing DB to shared container
    try {
      const oldDb = await openDatabaseAsync(DATABASE_NAME);
      // Check if old DB has data
      const result = await oldDb.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='products'",
      );

      if (result && result.count > 0) {
        // Flush WAL
        await oldDb.execAsync("PRAGMA wal_checkpoint(TRUNCATE)");
        // Close old DB before copying
        await oldDb.closeAsync();

        // Copy via native file system
        const FileSystem = await import("expo-file-system");
        const oldPath = FileSystem.documentDirectory + DATABASE_NAME;

        if (
          await FileSystem.getInfoAsync(oldPath).then(
            (i: { exists: boolean }) => i.exists,
          )
        ) {
          await FileSystem.copyAsync({ from: oldPath, to: sharedPath });

          // Verify copy
          const newDb = await openDatabaseAsync(sharedPath);
          const verify = await newDb.getFirstAsync<{ count: number }>(
            "SELECT COUNT(*) as count FROM products",
          );

          if (verify && verify.count >= 0) {
            mmkv.set(MIGRATION_KEY, true);
            await migrateDbIfNeeded(newDb);
            return newDb;
          }

          // Verification failed — close and fall through
          await newDb.closeAsync();
        }
      } else {
        await oldDb.closeAsync();
      }
    } catch {
      // Migration failed — continue with shared path (fresh DB)
    }
  }

  // Open shared path (migrated or fresh)
  const db = await openDatabaseAsync(sharedPath);
  await migrateDbIfNeeded(db);

  if (!alreadyMigrated) {
    mmkv.set(MIGRATION_KEY, true);
  }

  return db;
}
```

- [ ] **Step 2: Update root layout to use openSharedDatabase**

Replace `src/app/_layout.tsx`:

```tsx
import { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router/stack";
import type { SQLiteDatabase } from "expo-sqlite";

import { openSharedDatabase } from "@/db/client";
import { useSettingsStore } from "@/stores/settings-store";
import { syncWidgetData } from "@/lib/widget-sync";

// Custom context since SQLiteProvider doesn't support pre-opened DBs with custom paths
const DbContext = createContext<SQLiteDatabase | null>(null);

export function useDb(): SQLiteDatabase {
  const db = useContext(DbContext);
  if (!db) throw new Error("Database not initialized");
  return db;
}

export default function RootLayout() {
  const theme = useSettingsStore((s) => s.theme);
  const [db, setDb] = useState<SQLiteDatabase | null>(null);

  useEffect(() => {
    openSharedDatabase().then((database) => {
      setDb(database);
      syncWidgetData(database).catch(() => {});
    });
  }, []);

  // Sync widget when goals change
  useEffect(() => {
    if (!db) return;
    const unsub = useSettingsStore.subscribe(
      (s) => s.goals,
      () => syncWidgetData(db).catch(() => {}),
    );
    return unsub;
  }, [db]);

  if (!db) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme === "dark" ? "#000" : "#fff",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <DbContext.Provider value={db}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme === "dark" ? "#000" : "#fff",
          },
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
    </DbContext.Provider>
  );
}
```

**Important:** This replaces `SQLiteProvider` + `useSQLiteContext()` with a custom `DbContext` + `useDb()`. All existing screens that call `useSQLiteContext()` must be updated to use `useDb()` from `@/app/_layout`. To minimize churn, re-export `useDb` as `useSQLiteContext` from `src/db/client.ts`:

```typescript
// Add to src/db/client.ts:
export { useDb as useSQLiteContext } from "@/app/_layout";
```

This way existing screens keep working without import changes. Alternatively, do a find-and-replace of `useSQLiteContext` → `useDb` across all files. Choose whichever approach is cleaner during implementation.

- [ ] **Step 3: Verify app loads with shared DB**

Run: `npx expo start --clear`

Test: App should load normally. Existing data should persist (migrated from old path).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/db/client.ts src/app/_layout.tsx
git commit -m "feat(db): migrate SQLite to App Group shared container for widget/intent access"
```

---

## Task 5: expo-apple-targets Setup & Widget Extension

**Files:**

- Modify: `app.json`
- Create: `targets/widget/expo-target.config.js`
- Create: `targets/widget/Info.plist`
- Create: `targets/widget/SharedData.swift`
- Create: `targets/widget/KalorWidget.swift`
- Create: `targets/widget/SmallWidgetView.swift`
- Create: `targets/widget/MediumWidgetView.swift`

- [ ] **Step 1: Install expo-apple-targets**

```bash
npx expo install expo-apple-targets
```

Consult @context7 for `expo-apple-targets` to verify the correct plugin config format for SDK 55. The config below may need adjustment based on the current API.

- [ ] **Step 2: Configure app.json**

Add to the `plugins` array in `app.json`:

```json
[
  "expo-apple-targets",
  {
    "appleTeamId": "<TEAM_ID>"
  }
]
```

Add App Group entitlement to `ios` section:

```json
"entitlements": {
  "com.apple.security.application-groups": ["group.com.kalorapp.app"]
}
```

- [ ] **Step 3: Create target config**

Create `targets/widget/expo-target.config.js`:

```js
/** @type {import('expo-apple-targets').Config} */
module.exports = {
  type: "widget",
  name: "KalorWidget",
  bundleIdentifier: "com.kalorapp.app.widget",
  deploymentTarget: "16.0",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.kalorapp.app"],
  },
  frameworks: ["SwiftUI", "WidgetKit", "AppIntents"],
};
```

- [ ] **Step 4: Create SharedData.swift**

Create `targets/widget/SharedData.swift`:

```swift
import Foundation

struct DailySummary: Codable {
    let date: String
    let calories: Double
    let proteins: Double
    let carbs: Double
    let fats: Double
    let fiber: Double
    let sugars: Double
    let saturated_fat: Double
    let salt: Double
    let caloriesGoal: Double?
    let proteinsGoal: Double?
    let carbsGoal: Double?
    let fatsGoal: Double?
    let fiberGoal: Double?
    let sugarsGoal: Double?
    let saturatedFatGoal: Double?
    let saltGoal: Double?

    static let empty = DailySummary(
        date: "", calories: 0, proteins: 0, carbs: 0, fats: 0,
        fiber: 0, sugars: 0, saturated_fat: 0, salt: 0,
        caloriesGoal: 2100, proteinsGoal: 120, carbsGoal: 260, fatsGoal: 70,
        fiberGoal: nil, sugarsGoal: nil, saturatedFatGoal: nil, saltGoal: nil
    )

    static func load() -> DailySummary {
        guard let defaults = UserDefaults(suiteName: "group.com.kalorapp.app"),
              let jsonString = defaults.string(forKey: "dailySummary"),
              let data = jsonString.data(using: .utf8),
              let summary = try? JSONDecoder().decode(DailySummary.self, from: data)
        else {
            return .empty
        }

        // Only return if data is for today
        let today = ISO8601DateFormatter.string(from: Date(), timeZone: .current, formatOptions: [.withFullDate])
        let todayFormatted = String(today.prefix(10))
        return summary.date == todayFormatted ? summary : .empty
    }
}
```

- [ ] **Step 5: Create SmallWidgetView.swift**

Create `targets/widget/SmallWidgetView.swift`:

```swift
import SwiftUI
import WidgetKit

struct SmallWidgetView: View {
    let summary: DailySummary

    private var progress: Double {
        guard let goal = summary.caloriesGoal, goal > 0 else { return 0 }
        return min(summary.calories / goal, 1.0)
    }

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.green.opacity(0.2), lineWidth: 10)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(Color.green, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: 2) {
                Text("\(Int(summary.calories))")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .monospacedDigit()
                Text("/ \(Int(summary.caloriesGoal ?? 2100))")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.secondary)
                Text("kcal")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(12)
    }
}
```

- [ ] **Step 6: Create MediumWidgetView.swift**

Create `targets/widget/MediumWidgetView.swift`:

```swift
import SwiftUI
import WidgetKit

struct MacroBar: View {
    let label: String
    let current: Double
    let goal: Double?
    let color: Color

    private var progress: Double {
        guard let goal, goal > 0 else { return 0 }
        return min(current / goal, 1.0)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(Int(current))/\(Int(goal ?? 0))g")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .monospacedDigit()
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(color.opacity(0.2))
                    Capsule()
                        .fill(color)
                        .frame(width: max(geo.size.width * progress, 4))
                }
            }
            .frame(height: 6)
        }
    }
}

struct MediumWidgetView: View {
    let summary: DailySummary

    private var progress: Double {
        guard let goal = summary.caloriesGoal, goal > 0 else { return 0 }
        return min(summary.calories / goal, 1.0)
    }

    var body: some View {
        HStack(spacing: 16) {
            // Ring
            ZStack {
                Circle()
                    .stroke(Color.green.opacity(0.2), lineWidth: 8)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(Color.green, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                VStack(spacing: 1) {
                    Text("\(Int(summary.calories))")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .monospacedDigit()
                    Text("kcal")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(.tertiary)
                }
            }
            .frame(width: 90, height: 90)

            // Macros
            VStack(spacing: 8) {
                MacroBar(label: "Prot.", current: summary.proteins, goal: summary.proteinsGoal, color: .blue)
                MacroBar(label: "Gluc.", current: summary.carbs, goal: summary.carbsGoal, color: .orange)
                MacroBar(label: "Lip.", current: summary.fats, goal: summary.fatsGoal, color: .purple)
            }
        }
        .padding(12)
    }
}
```

- [ ] **Step 7: Create KalorWidget.swift (entry point)**

Create `targets/widget/KalorWidget.swift`:

```swift
import WidgetKit
import SwiftUI

struct KalorWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> KalorEntry {
        KalorEntry(date: Date(), summary: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (KalorEntry) -> Void) {
        completion(KalorEntry(date: Date(), summary: DailySummary.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<KalorEntry>) -> Void) {
        let entry = KalorEntry(date: Date(), summary: DailySummary.load())
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }
}

struct KalorEntry: TimelineEntry {
    let date: Date
    let summary: DailySummary
}

struct KalorWidgetEntryView: View {
    var entry: KalorEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(summary: entry.summary)
        case .systemMedium:
            MediumWidgetView(summary: entry.summary)
        default:
            SmallWidgetView(summary: entry.summary)
        }
    }
}

@main
struct KalorWidget: Widget {
    let kind = "KalorWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: KalorWidgetProvider()) { entry in
            KalorWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("KalorApp")
        .description("Suivi calorique du jour")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
```

- [ ] **Step 8: Create Info.plist**

Create `targets/widget/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.widgetkit-extension</string>
    </dict>
</dict>
</plist>
```

- [ ] **Step 9: Build to verify widget compiles**

```bash
npx expo prebuild --platform ios --clean
cd ios && xcodebuild -workspace KalorApp.xcworkspace -scheme KalorApp -configuration Debug -sdk iphonesimulator build 2>&1 | tail -5
```

If build errors, check Swift file syntax and target config.

- [ ] **Step 10: Commit**

```bash
git add targets/widget/ app.json
git commit -m "feat(widget): add iOS home screen widgets (small calorie ring + medium macros)"
```

---

## Task 6: App Intent (iOS Shortcuts)

**Files:**

- Create: `targets/widget/SQLiteHelper.swift`
- Create: `targets/widget/QuickMealIntent.swift`

- [ ] **Step 1: Create SQLiteHelper.swift**

Create `targets/widget/SQLiteHelper.swift`:

```swift
import Foundation
import SQLite3

class SQLiteHelper {
    private var db: OpaquePointer?

    init?() {
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: "group.com.kalorapp.app"
        ) else { return nil }

        let dbPath = containerURL.appendingPathComponent("kalor.db").path

        guard sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READWRITE, nil) == SQLITE_OK else {
            return nil
        }

        sqlite3_busy_timeout(db, 3000)
        sqlite3_exec(db, "PRAGMA journal_mode = 'wal'", nil, nil, nil)
        sqlite3_exec(db, "PRAGMA foreign_keys = ON", nil, nil, nil)
    }

    deinit {
        sqlite3_close(db)
    }

    struct FavoriteProduct {
        let id: String
        let name: String
        let brand: String?
        let calories: Double
        let proteins: Double
        let carbs: Double
        let fats: Double
        let fiber: Double?
        let sugars: Double?
        let saturatedFat: Double?
        let salt: Double?
        let lastQuantity: Double
    }

    func getFavorites() -> [FavoriteProduct] {
        var result: [FavoriteProduct] = []
        var stmt: OpaquePointer?

        let sql = """
            SELECT p.id, p.name, p.brand, p.calories, p.proteins, p.carbs, p.fats,
                   p.fiber, p.sugars, p.saturated_fat, p.salt, p.last_quantity
            FROM favorites f INNER JOIN products p ON p.id = f.product_id
            ORDER BY f.sort_order ASC
            """

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return [] }

        while sqlite3_step(stmt) == SQLITE_ROW {
            let id = String(cString: sqlite3_column_text(stmt, 0))
            let name = String(cString: sqlite3_column_text(stmt, 1))
            let brand = sqlite3_column_type(stmt, 2) != SQLITE_NULL
                ? String(cString: sqlite3_column_text(stmt, 2)) : nil

            result.append(FavoriteProduct(
                id: id, name: name, brand: brand,
                calories: sqlite3_column_double(stmt, 3),
                proteins: sqlite3_column_double(stmt, 4),
                carbs: sqlite3_column_double(stmt, 5),
                fats: sqlite3_column_double(stmt, 6),
                fiber: sqlite3_column_type(stmt, 7) != SQLITE_NULL ? sqlite3_column_double(stmt, 7) : nil,
                sugars: sqlite3_column_type(stmt, 8) != SQLITE_NULL ? sqlite3_column_double(stmt, 8) : nil,
                saturatedFat: sqlite3_column_type(stmt, 9) != SQLITE_NULL ? sqlite3_column_double(stmt, 9) : nil,
                salt: sqlite3_column_type(stmt, 10) != SQLITE_NULL ? sqlite3_column_double(stmt, 10) : nil,
                lastQuantity: sqlite3_column_double(stmt, 11)
            ))
        }

        sqlite3_finalize(stmt)
        return result
    }

    func insertEntry(productId: String, productName: String, meal: String,
                     quantity: Double, date: String,
                     calories: Double, proteins: Double, carbs: Double, fats: Double,
                     fiber: Double?, sugars: Double?, saturatedFat: Double?, salt: Double?) {
        var stmt: OpaquePointer?
        let sql = """
            INSERT INTO entries (product_id, product_name, meal, quantity, date,
                                 calories, proteins, carbs, fats, fiber, sugars, saturated_fat, salt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return }

        sqlite3_bind_text(stmt, 1, (productId as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 2, (productName as NSString).utf8String, -1, nil)
        sqlite3_bind_text(stmt, 3, (meal as NSString).utf8String, -1, nil)
        sqlite3_bind_double(stmt, 4, quantity)
        sqlite3_bind_text(stmt, 5, (date as NSString).utf8String, -1, nil)
        sqlite3_bind_double(stmt, 6, calories)
        sqlite3_bind_double(stmt, 7, proteins)
        sqlite3_bind_double(stmt, 8, carbs)
        sqlite3_bind_double(stmt, 9, fats)

        if let fiber { sqlite3_bind_double(stmt, 10, fiber) } else { sqlite3_bind_null(stmt, 10) }
        if let sugars { sqlite3_bind_double(stmt, 11, sugars) } else { sqlite3_bind_null(stmt, 11) }
        if let saturatedFat { sqlite3_bind_double(stmt, 12, saturatedFat) } else { sqlite3_bind_null(stmt, 12) }
        if let salt { sqlite3_bind_double(stmt, 13, salt) } else { sqlite3_bind_null(stmt, 13) }

        sqlite3_step(stmt)
        sqlite3_finalize(stmt)
    }

    func updateLastQuantity(productId: String, quantity: Double) {
        var stmt: OpaquePointer?
        let sql = "UPDATE products SET last_quantity = ? WHERE id = ?"

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return }
        sqlite3_bind_double(stmt, 1, quantity)
        sqlite3_bind_text(stmt, 2, (productId as NSString).utf8String, -1, nil)
        sqlite3_step(stmt)
        sqlite3_finalize(stmt)
    }

    func getDailySummary(date: String) -> DailySummary {
        var stmt: OpaquePointer?
        let sql = """
            SELECT COALESCE(SUM(calories),0), COALESCE(SUM(proteins),0),
                   COALESCE(SUM(carbs),0), COALESCE(SUM(fats),0),
                   COALESCE(SUM(fiber),0), COALESCE(SUM(sugars),0),
                   COALESCE(SUM(saturated_fat),0), COALESCE(SUM(salt),0)
            FROM entries WHERE date = ?
            """

        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else { return .empty }
        sqlite3_bind_text(stmt, 1, (date as NSString).utf8String, -1, nil)

        guard sqlite3_step(stmt) == SQLITE_ROW else {
            sqlite3_finalize(stmt)
            return .empty
        }

        let summary = DailySummary(
            date: date,
            calories: sqlite3_column_double(stmt, 0),
            proteins: sqlite3_column_double(stmt, 1),
            carbs: sqlite3_column_double(stmt, 2),
            fats: sqlite3_column_double(stmt, 3),
            fiber: sqlite3_column_double(stmt, 4),
            sugars: sqlite3_column_double(stmt, 5),
            saturated_fat: sqlite3_column_double(stmt, 6),
            salt: sqlite3_column_double(stmt, 7),
            caloriesGoal: nil, proteinsGoal: nil, carbsGoal: nil, fatsGoal: nil,
            fiberGoal: nil, sugarsGoal: nil, saturatedFatGoal: nil, saltGoal: nil
        )

        sqlite3_finalize(stmt)
        return summary
    }
}
```

- [ ] **Step 2: Create QuickMealIntent.swift**

Create `targets/widget/QuickMealIntent.swift`:

```swift
import AppIntents
import WidgetKit

struct FavoriteEntity: AppEntity {
    static var defaultQuery = FavoriteEntityQuery()
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Aliment favori")

    var id: String
    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)", subtitle: brand.map { "\($0)" })
    }

    let name: String
    let brand: String?
    let lastQuantity: Double
}

struct FavoriteEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [FavoriteEntity] {
        guard let helper = SQLiteHelper() else { return [] }
        let all = helper.getFavorites()
        return identifiers.compactMap { id in
            guard let fav = all.first(where: { $0.id == id }) else { return nil }
            return FavoriteEntity(id: fav.id, name: fav.name, brand: fav.brand, lastQuantity: fav.lastQuantity)
        }
    }

    func suggestedEntities() async throws -> [FavoriteEntity] {
        guard let helper = SQLiteHelper() else { return [] }
        return helper.getFavorites().map {
            FavoriteEntity(id: $0.id, name: $0.name, brand: $0.brand, lastQuantity: $0.lastQuantity)
        }
    }
}

struct QuickMealIntent: AppIntent {
    static var title: LocalizedStringResource = "Ajouter un repas rapide"
    static var description: IntentDescription = "Ajoute plusieurs aliments favoris en un seul repas"
    static var openAppWhenRun = false

    @Parameter(title: "Aliments")
    var selectedFavorites: [FavoriteEntity]

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let helper = SQLiteHelper() else {
            return .result(dialog: "Erreur: impossible d'acceder aux donnees")
        }

        let allFavorites = helper.getFavorites()
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let today = dateFormatter.string(from: Date())
        let hour = Calendar.current.component(.hour, from: Date())
        let meal = hour < 17 ? "lunch" : "dinner"

        var totalCalories: Double = 0

        for entity in selectedFavorites {
            guard let product = allFavorites.first(where: { $0.id == entity.id }) else { continue }

            // Use last_quantity as default (per-item dialogs not supported in App Intents)
            let qty = product.lastQuantity
            let factor = qty / 100.0

            let cal = product.calories * factor
            let prot = product.proteins * factor
            let carb = product.carbs * factor
            let fat = product.fats * factor
            let fib = product.fiber.map { $0 * factor }
            let sug = product.sugars.map { $0 * factor }
            let sat = product.saturatedFat.map { $0 * factor }
            let slt = product.salt.map { $0 * factor }

            helper.insertEntry(
                productId: product.id, productName: product.name, meal: meal,
                quantity: qty, date: today,
                calories: cal, proteins: prot, carbs: carb, fats: fat,
                fiber: fib, sugars: sug, saturatedFat: sat, salt: slt
            )

            totalCalories += cal
        }

        // Update widget — preserve existing goals from UserDefaults
        var summary = helper.getDailySummary(date: today)
        if let defaults = UserDefaults(suiteName: "group.com.kalorapp.app"),
           let existingJson = defaults.string(forKey: "dailySummary"),
           let existingData = existingJson.data(using: .utf8),
           let existing = try? JSONDecoder().decode(DailySummary.self, from: existingData) {
            // Merge: keep goals from existing data, update nutrition from DB
            summary = DailySummary(
                date: summary.date,
                calories: summary.calories, proteins: summary.proteins,
                carbs: summary.carbs, fats: summary.fats,
                fiber: summary.fiber, sugars: summary.sugars,
                saturated_fat: summary.saturated_fat, salt: summary.salt,
                caloriesGoal: existing.caloriesGoal, proteinsGoal: existing.proteinsGoal,
                carbsGoal: existing.carbsGoal, fatsGoal: existing.fatsGoal,
                fiberGoal: existing.fiberGoal, sugarsGoal: existing.sugarsGoal,
                saturatedFatGoal: existing.saturatedFatGoal, saltGoal: existing.saltGoal
            )
        }
        if let jsonData = try? JSONEncoder().encode(summary) {
            UserDefaults(suiteName: "group.com.kalorapp.app")?
                .set(String(data: jsonData, encoding: .utf8), forKey: "dailySummary")
        }
        WidgetCenter.shared.reloadAllTimelines()

        let count = selectedFavorites.count
        return .result(dialog: "\(count) aliment\(count > 1 ? "s" : "") ajouté\(count > 1 ? "s" : "") — \(Int(totalCalories)) kcal")
    }
}
```

**Important note on per-item quantity dialogs:** App Intents doesn't natively support a loop of `requestValue` calls per selected entity. The implementation above uses `last_quantity` defaults. To add per-item quantity dialogs, you would need to restructure the intent to use a custom `@Parameter` for each quantity, which requires knowing the count upfront. This is a known App Intents limitation. The spec's "option B" (sequential dialogs) requires a workaround — either accept defaults, or restructure as multiple sequential intents. The pragmatic choice is to use `last_quantity` defaults and let the user edit quantities in-app if needed.

- [ ] **Step 3: Build and test**

```bash
npx expo prebuild --platform ios --clean
cd ios && xcodebuild -workspace KalorApp.xcworkspace -scheme KalorApp -configuration Debug -sdk iphonesimulator build 2>&1 | tail -5
```

Test on device:

1. Open Shortcuts app → search "KalorApp"
2. "Ajouter un repas rapide" should appear
3. Select favorites → entries should be added

- [ ] **Step 4: Commit**

```bash
git add targets/widget/SQLiteHelper.swift targets/widget/QuickMealIntent.swift
git commit -m "feat(shortcuts): add App Intent for quick meal from favorites in iOS Shortcuts"
```

---

## Task 7: Integration Testing & Polish

- [ ] **Step 1: Full flow test — Quick Meal screen**

1. Add 3+ products to favorites
2. Tap "+" → "Repas rapide"
3. Select 2 favorites → "Suivant"
4. Edit quantities → "Ajouter tout"
5. Verify dashboard shows entries with correct meal (lunch/dinner based on time)
6. Verify CalorieRing and MacroBars updated

- [ ] **Step 2: Widget test**

1. Long press home screen → add widget
2. Search "KalorApp"
3. Add small widget → verify calorie ring shows
4. Add medium widget → verify macros bars show
5. Add an entry in app → verify widgets update

- [ ] **Step 3: Shortcuts test**

1. Open Shortcuts app
2. Create shortcut with "Ajouter un repas rapide"
3. Run it → select favorites
4. Verify entries added in app
5. Verify widget updated

- [ ] **Step 4: Edge cases**

- No favorites → empty state message on Quick Meal screen
- Network offline → should work (all local)
- App killed while Shortcut runs → should complete (extension process)
- Fresh install → no migration needed, shared path used directly

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete widgets, shortcuts, and quick meal implementation"
```
