import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { useDb } from "@/app/_layout";
import { parseNumericInput } from "@/components/nutrition/numeric-field";
import { Card } from "@/components/ui/card";
import { MEALS } from "@/constants/meals";
import { getAllEntriesForExport } from "@/db/queries/entries";
import { useThemeColors, type ThemeColors } from "@/hooks/use-theme-colors";
import { exportEntriesCsv } from "@/lib/nutrition-utils";
import { useSettingsStore } from "@/stores/settings-store";
import type { Goals } from "@/types/nutrition";

function Section({ title, footer, children }: { title: string; footer?: string; children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, color: colors.textSecondary, marginLeft: 16, textTransform: "uppercase" }}>
        {title}
      </Text>
      <Card>{children}</Card>
      {footer ? (
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginHorizontal: 16, lineHeight: 18 }}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

function Row({ first, children }: { first?: boolean; children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={{ minHeight: 48, justifyContent: "center" }}>
      {!first && (
        <View style={{ position: "absolute", top: 0, left: 16, right: 0, height: 0.5, backgroundColor: colors.separator }} />
      )}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, gap: 12 }}>
        {children}
      </View>
    </View>
  );
}

function greenSwitch(colors: ThemeColors) {
  return { trackColor: { false: colors.fill, true: colors.accent.calories }, thumbColor: "#ffffff" };
}

// ---------- Goals ----------

const MAIN_GOALS: { key: keyof Goals; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "proteins", label: "Protéines", unit: "g" },
  { key: "carbs", label: "Glucides", unit: "g" },
  { key: "fats", label: "Lipides", unit: "g" },
];

const OPTIONAL_GOALS: { key: keyof Goals; label: string; unit: string }[] = [
  { key: "fiber", label: "Fibres", unit: "g" },
  { key: "sugars", label: "Sucres", unit: "g" },
  { key: "saturated_fat", label: "Graisses saturées", unit: "g" },
  { key: "salt", label: "Sel", unit: "g" },
];

function GoalInput({ goalKey, unit }: { goalKey: keyof Goals; unit: string }) {
  const colors = useThemeColors();
  const value = useSettingsStore((s) => s.goals[goalKey]);
  const setGoals = useSettingsStore((s) => s.setGoals);
  const [text, setText] = useState(value != null ? String(value).replace(".", ",") : "");

  const commit = () => {
    const parsed = parseNumericInput(text);
    if (text.trim() === "") setGoals({ [goalKey]: null });
    else if (parsed != null && parsed >= 0) setGoals({ [goalKey]: parsed });
    else setText(value != null ? String(value).replace(".", ",") : "");
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={commit}
        onSubmitEditing={commit}
        keyboardType="decimal-pad"
        selectTextOnFocus
        placeholder="–"
        placeholderTextColor={colors.textMuted}
        style={{ minWidth: 64, textAlign: "right", fontSize: 17, color: colors.textPrimary, fontVariant: ["tabular-nums"] }}
      />
      <Text style={{ width: 30, fontSize: 15, color: colors.textSecondary }}>{unit}</Text>
    </View>
  );
}

function GoalsSection() {
  const colors = useThemeColors();
  const goals = useSettingsStore((s) => s.goals);
  const setGoals = useSettingsStore((s) => s.setGoals);
  // An optional goal is shown once switched on, even before a value is typed.
  const [shown, setShown] = useState<Partial<Record<keyof Goals, boolean>>>(() =>
    Object.fromEntries(OPTIONAL_GOALS.map((g) => [g.key, goals[g.key] != null])),
  );

  return (
    <Section
      title="Objectifs par jour"
      footer="Fibres, sucres, graisses saturées et sel s'affichent sur l'écran du jour dès qu'ils ont un objectif."
    >
      {MAIN_GOALS.map((g, i) => (
        <Row key={g.key} first={i === 0}>
          <Text style={{ flex: 1, fontSize: 17, color: colors.textPrimary }}>{g.label}</Text>
          <GoalInput goalKey={g.key} unit={g.unit} />
        </Row>
      ))}
      {OPTIONAL_GOALS.map((g) => (
        <Row key={g.key}>
          <Text style={{ flex: 1, fontSize: 17, color: shown[g.key] ? colors.textPrimary : colors.textSecondary }}>
            {g.label}
          </Text>
          {shown[g.key] && <GoalInput goalKey={g.key} unit={g.unit} />}
          <Switch
            value={!!shown[g.key]}
            onValueChange={(on) => {
              setShown((prev) => ({ ...prev, [g.key]: on }));
              if (!on) setGoals({ [g.key]: null });
            }}
            {...greenSwitch(colors)}
          />
        </Row>
      ))}
    </Section>
  );
}

// ---------- Meals ----------

function MealsSection() {
  const colors = useThemeColors();
  const enabledMeals = useSettingsStore((s) => s.enabledMeals);
  const toggleMeal = useSettingsStore((s) => s.toggleMeal);

  return (
    <Section
      title="Repas affichés"
      footer="Le premier ajout du jour va au déjeuner, les suivants au dîner."
    >
      {MEALS.map((meal, i) => (
        <Row key={meal.type} first={i === 0}>
          <Text style={{ flex: 1, fontSize: 17, color: colors.textPrimary }}>{meal.label}</Text>
          <Switch value={enabledMeals[meal.type]} onValueChange={() => toggleMeal(meal.type)} {...greenSwitch(colors)} />
        </Row>
      ))}
    </Section>
  );
}

// ---------- Appearance ----------

function AppearanceSection() {
  const colors = useThemeColors();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  return (
    <Section title="Apparence">
      <Row first>
        <Text style={{ flex: 1, fontSize: 17, color: colors.textPrimary }}>Mode sombre</Text>
        <Switch
          value={theme === "dark"}
          onValueChange={(v) => setTheme(v ? "dark" : "light")}
          {...greenSwitch(colors)}
        />
      </Row>
    </Section>
  );
}

// ---------- Export ----------

function ExportSection() {
  const colors = useThemeColors();
  const db = useDb();
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const entries = await getAllEntriesForExport(db);
      if (entries.length === 0) {
        Alert.alert("Aucune donnée", "Aucun aliment à exporter.");
        return;
      }
      const file = new File(Paths.cache, `kalorapp_export_${Date.now()}.csv`);
      file.write(exportEntriesCsv(entries));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "text/csv",
          dialogTitle: "Exporter le journal",
          UTI: "public.comma-separated-values-text",
        });
      } else {
        Alert.alert("Partage indisponible", "Le partage de fichiers n'est pas disponible sur cet appareil.");
      }
    } catch {
      Alert.alert("Erreur", "L'export a échoué. Réessaie.");
    } finally {
      setExporting(false);
    }
  }, [db, exporting]);

  return (
    <Section title="Données">
      <Pressable
        onPress={() => void handleExport()}
        disabled={exporting}
        style={({ pressed }) => ({ backgroundColor: pressed ? colors.fill : "transparent" })}
      >
        <Row first>
          <Text style={{ flex: 1, fontSize: 17, color: colors.accent.caloriesText }}>
            {exporting ? "Export en cours…" : "Exporter le journal (CSV)"}
          </Text>
        </Row>
      </Pressable>
    </Section>
  );
}

export default function SettingsScreen() {
  const colors = useThemeColors();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 24 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
    >
      <GoalsSection />
      <MealsSection />
      <AppearanceSection />
      <ExportSection />
    </ScrollView>
  );
}
