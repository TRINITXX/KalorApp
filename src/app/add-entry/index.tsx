import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

import { useDb } from "@/app/_layout";
import { ListeningStrip } from "@/components/nutrition/listening-strip";
import { VoiceBanner } from "@/components/nutrition/voice-banner";
import { QuantityStepper } from "@/components/nutrition/quantity-stepper";
import { QuickActions } from "@/components/nutrition/quick-actions";
import { Card } from "@/components/ui/card";
import { CheckCircle } from "@/components/ui/check-circle";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CATEGORIES } from "@/constants/categories";
import { MEALS, MEAL_WITH_ARTICLE } from "@/constants/meals";
import { getEntriesByDate } from "@/db/queries/entries";
import { defaultPortion, getCatalog, type CatalogProduct } from "@/db/queries/products";
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus";
import { useSingleNavigation } from "@/hooks/use-single-navigation";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useToday } from "@/hooks/use-today";
import { useVoiceAdd } from "@/hooks/use-voice-add";
import { addDays, formatDayTitle } from "@/lib/dates";
import { logFoods } from "@/lib/log-foods";
import { guessMeal } from "@/lib/meal-rule";
import { formatNumber } from "@/lib/nutrition-utils";
import { matchesQuery } from "@/lib/search";
import type { VoiceDraft } from "@/lib/voice/run-voice";
import { useCheckedProductsStore } from "@/stores/checked-products-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { MealType } from "@/types/nutrition";

const MEAL_VALUES: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

export default function AddEntryScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const db = useDb();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const enabledMeals = useSettingsStore((s) => s.enabledMeals);
  const today = useToday();

  const params = useLocalSearchParams<{ date?: string; meal?: string; listen?: string }>();
  // "Hier" said in a dictation moves the add to yesterday.
  const [dateOverride, setDateOverride] = useState<string | null>(null);
  const date = dateOverride ?? params.date ?? today;
  const forcedMeal = MEAL_VALUES.find((m) => m === params.meal);

  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  // Selected products and their grams, in the order they were picked.
  const [selection, setSelection] = useState<Record<string, number>>({});
  const [meal, setMeal] = useState<MealType>(forcedMeal ?? "lunch");
  const mealTouched = useRef(!!forcedMeal);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [voiceInfo, setVoiceInfo] = useState<VoiceDraft | null>(null);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const navigate = useSingleNavigation();

  const applyVoiceDraft = useCallback(
    async (draft: VoiceDraft) => {
      // Reload first: Claude's estimates were just saved as new products.
      setCatalog(await getCatalog(db));
      setSelection((prev) => ({ ...prev, ...draft.selection }));
      if (draft.meal) {
        mealTouched.current = true;
        setMeal(draft.meal);
      }
      if (draft.dayOffset === -1 && (params.date ?? today) === today) {
        setDateOverride(addDays(today, -1));
      }
      setVoiceInfo(draft);
      setQuery("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [db, params.date, today],
  );
  const voice = useVoiceAdd(db, catalog, applyVoiceDraft);

  useRefreshOnFocus(
    useCallback(() => {
      let active = true;
      (async () => {
        const [products, dayEntries] = await Promise.all([
          getCatalog(db),
          getEntriesByDate(db, date),
        ]);
        if (!active) return;
        setCatalog(products);
        setCatalogLoaded(true);
        if (!mealTouched.current) {
          setMeal(guessMeal(dayEntries, { isToday: date === today }));
        }
        // Products scanned, found online or created on a screen above this one.
        const picked = useCheckedProductsStore.getState().take();
        if (picked.length > 0) {
          setSelection((prev) => {
            const next = { ...prev };
            for (const id of picked) {
              const p = products.find((x) => x.id === id);
              if (p && !(id in next)) next[id] = defaultPortion(p);
            }
            return next;
          });
          setQuery("");
        }
      })();
      return () => {
        active = false;
      };
    }, [db, date, today]),
  );

  // The day screen's microphone opens this screen with ?listen=1.
  const autoListened = useRef(false);
  useEffect(() => {
    if (params.listen !== "1" || !catalogLoaded || autoListened.current || !voice.available) return;
    autoListened.current = true;
    void voice.start();
  }, [catalogLoaded, params.listen, voice]);

  const byId = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);

  const toggle = useCallback(
    (product: CatalogProduct) => {
      Haptics.selectionAsync();
      setSelection((prev) => {
        const next = { ...prev };
        if (product.id in next) delete next[product.id];
        else next[product.id] = defaultPortion(product);
        return next;
      });
    },
    [],
  );

  const setQuantity = useCallback((id: string, grams: number) => {
    setSelection((prev) => (id in prev ? { ...prev, [id]: grams } : prev));
  }, []);

  const selectedIds = Object.keys(selection);
  const totalCalories = selectedIds.reduce((sum, id) => {
    const p = byId.get(id);
    return p ? sum + (p.calories * selection[id]) / 100 : sum;
  }, 0);

  const searching = query.trim().length > 0;
  const searchResults = useMemo(() => {
    if (!searching) return [];
    // Favorites first, then the other known products.
    return catalog
      .filter((p) => matchesQuery(query, p.name, p.brand))
      .sort((a, b) => b.is_favorite - a.is_favorite);
  }, [catalog, query, searching]);

  // Picked products that are not favorites have no category section: list them on top.
  const pickedOthers = selectedIds
    .map((id) => byId.get(id))
    .filter((p): p is CatalogProduct => !!p && !p.is_favorite);
  const favorites = catalog.filter((p) => p.is_favorite);

  const mealOptions = MEALS.filter((m) => enabledMeals[m.type] || m.type === meal).map((m) => ({
    value: m.type,
    label: m.label,
  }));

  const handleSubmit = useCallback(async () => {
    if (submitting || selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      const foods = selectedIds
        .map((id) => ({ product: byId.get(id), quantity: selection[id] }))
        .filter((f): f is { product: CatalogProduct; quantity: number } => !!f.product);
      await logFoods(db, foods, date, meal);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (navigation.canGoBack()) router.back();
      else router.replace("/");
    } catch {
      setSubmitting(false);
      Alert.alert("Ajout impossible", "Les aliments n'ont pas été enregistrés. Réessaie.");
    }
  }, [byId, date, db, meal, navigation, router, selectedIds, selection, submitting]);

  const renderRows = (products: CatalogProduct[]) => (
    <Card>
      {products.map((p, i) => (
        <ProductLine
          key={p.id}
          product={p}
          first={i === 0}
          grams={selection[p.id]}
          onToggle={toggle}
          onQuantity={setQuantity}
        />
      ))}
    </Card>
  );

  const dayLabel = date === today ? null : formatDayTitle(date, today);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        {dayLabel && (
          <Text style={{ fontSize: 13, color: colors.accent.warning, fontWeight: "600", textAlign: "center" }}>
            Ajout pour {dayLabel.toLowerCase()}
          </Text>
        )}
        {voiceInfo && <VoiceBanner draft={voiceInfo} onClose={() => setVoiceInfo(null)} />}
        <SegmentedControl
          options={mealOptions}
          value={meal}
          onChange={(m) => {
            mealTouched.current = true;
            setMeal(m);
          }}
        />

        {voice.phase ? (
          <ListeningStrip
            phase={voice.phase}
            transcript={voice.transcript}
            level={voice.level}
            onFinish={() => void voice.finish()}
            onCancel={voice.cancel}
          />
        ) : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: colors.card,
              borderRadius: 10,
              borderCurve: "continuous",
              paddingHorizontal: 10,
            }}
          >
            <SymbolView name="magnifyingglass" size={16} tintColor={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Chercher un produit"
              placeholderTextColor={colors.textSecondary}
              clearButtonMode="while-editing"
              autoCorrect={false}
              returnKeyType="search"
              style={{ flex: 1, paddingVertical: 10, fontSize: 17, color: colors.textPrimary }}
            />
            {voice.available && (
              <Pressable
                onPress={() => void voice.start()}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Dicter ce que tu as mangé"
              >
                <SymbolView name="mic.fill" size={18} tintColor={colors.accent.caloriesText} />
              </Pressable>
            )}
          </View>
        )}
        {voice.error && (
          <Pressable onPress={voice.clearError} accessibilityRole="button">
            <Text style={{ fontSize: 14, color: colors.accent.warning, marginHorizontal: 4 }}>{voice.error}</Text>
          </Pressable>
        )}

        {/* Leaving for another screen mid-dictation would leave the microphone open. */}
        {!searching && !voice.phase && <QuickActions query="mode=pick" />}

        {searching ? (
          searchResults.length > 0 ? (
            renderRows(searchResults)
          ) : (
            <View style={{ alignItems: "center", gap: 10, marginTop: 16 }}>
              <Text style={{ fontSize: 15, color: colors.textSecondary }}>
                Aucun produit ne correspond à « {query.trim()} »
              </Text>
              <PrimaryButton
                variant="tinted"
                label="Chercher en ligne"
                onPress={() =>
                  navigate(() =>
                    router.push(`/add-entry/search?mode=pick&q=${encodeURIComponent(query.trim())}`),
                  )
                }
              />
            </View>
          )
        ) : (
          <>
            {pickedOthers.length > 0 && (
              <View style={{ gap: 6 }}>
                <SectionLabel>Sélection</SectionLabel>
                {renderRows(pickedOthers)}
              </View>
            )}
            {CATEGORIES.map((cat) => {
              const items = favorites.filter((p) => p.category === cat.type);
              if (items.length === 0) return null;
              return (
                <View key={cat.type} style={{ gap: 6 }}>
                  <SectionLabel>{cat.label}</SectionLabel>
                  {renderRows(items)}
                </View>
              );
            })}
            {catalog.length > 0 && favorites.length === 0 && pickedOthers.length === 0 && (
              <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: "center", marginTop: 16, lineHeight: 21 }}>
                Pas encore de favoris. Cherche un produit ci-dessus, ou mets-en en favori depuis sa fiche.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: insets.bottom + 8,
          backgroundColor: colors.background,
          borderTopWidth: 0.5,
          borderTopColor: colors.separator,
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>
            {selectedIds.length === 0
              ? "Aucun aliment choisi"
              : `${selectedIds.length} aliment${selectedIds.length > 1 ? "s" : ""}`}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary, fontVariant: ["tabular-nums"] }}>
            {formatNumber(totalCalories)} kcal
          </Text>
        </View>
        <PrimaryButton
          label={`Ajouter ${MEAL_WITH_ARTICLE[meal]}`}
          onPress={handleSubmit}
          loading={submitting}
          disabled={selectedIds.length === 0}
        />
      </View>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  const colors = useThemeColors();
  return (
    <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 16, textTransform: "uppercase" }}>
      {children}
    </Text>
  );
}

interface ProductLineProps {
  product: CatalogProduct;
  first: boolean;
  /** Grams when selected, undefined otherwise. */
  grams: number | undefined;
  onToggle: (product: CatalogProduct) => void;
  onQuantity: (id: string, grams: number) => void;
}

function ProductLine({ product, first, grams, onToggle, onQuantity }: ProductLineProps) {
  const colors = useThemeColors();
  const selected = grams !== undefined;
  const portion = defaultPortion(product);
  const shownGrams = grams ?? portion;
  const tint = colors.isDark ? "rgba(48,209,88,0.09)" : "rgba(52,199,89,0.08)";

  return (
    <Animated.View layout={LinearTransition.duration(180)} style={{ backgroundColor: selected ? tint : "transparent" }}>
      {!first && (
        <View style={{ position: "absolute", top: 0, left: 52, right: 0, height: 0.5, backgroundColor: colors.separator }} />
      )}
      <Pressable
        onPress={() => onToggle(product)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 11,
          paddingHorizontal: 14,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <CheckCircle checked={selected} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 16, color: colors.textPrimary }}>
            {product.name}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 13, color: colors.textSecondary, marginTop: 1, fontVariant: ["tabular-nums"] }}>
            {formatNumber(shownGrams)} g · {formatNumber((product.calories * shownGrams) / 100)} kcal
            {product.brand ? ` · ${product.brand}` : ""}
          </Text>
        </View>
        {product.source === "estimated" && (
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.accent.warning }}>estimé</Text>
        )}
      </Pressable>
      {selected && (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(100)} style={{ paddingLeft: 50, paddingRight: 14, paddingBottom: 12 }}>
          <QuantityStepper value={grams} portion={portion} onChange={(g) => onQuantity(product.id, g)} />
        </Animated.View>
      )}
    </Animated.View>
  );
}
