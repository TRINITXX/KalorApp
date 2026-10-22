import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { useDb } from "@/app/_layout";
import { parseNumericInput } from "@/components/nutrition/numeric-field";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { MEALS } from "@/constants/meals";
import { getAllEntriesForExport } from "@/db/queries/entries";
import { useThemeColors, type ThemeColors } from "@/hooks/use-theme-colors";
import { exportEntriesCsv } from "@/lib/nutrition-utils";
import { getApiKey, saveApiKey } from "@/lib/voice/api-key";
import { checkApiKey } from "@/lib/voice/claude";
import { voiceAvailable } from "@/lib/voice/native";
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
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  return (
    <Section title="Apparence" footer="Auto suit le mode clair ou sombre de l'iPhone.">
      <View style={{ padding: 8 }}>
        <SegmentedControl
          options={[
            { value: "system", label: "Auto" },
            { value: "dark", label: "Sombre" },
            { value: "light", label: "Clair" },
          ]}
          value={theme}
          onChange={setTheme}
        />
      </View>
    </Section>
  );
}

// ---------- Dictation ----------

const maskKey = (key: string) => `${key.slice(0, 7)}…${key.slice(-4)}`;

const KEY_CHECK_ALERTS: Record<"bad-key" | "network" | "unavailable", [string, string]> = {
  "bad-key": ["Clé refusée", "Anthropic ne reconnaît pas cette clé. Vérifie-la sur console.anthropic.com."],
  network: ["Pas de réseau", "La clé n'a pas pu être vérifiée. Réessaie une fois connecté."],
  unavailable: ["Anthropic ne répond pas", "La clé n'a pas pu être vérifiée pour l'instant. Réessaie dans un moment."],
};

function DictationSection() {
  const colors = useThemeColors();
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (voiceAvailable) getApiKey().then(setSavedKey);
  }, []);

  const close = () => {
    setEditing(false);
    setDraft("");
  };

  const save = useCallback(async () => {
    const key = draft.trim();
    try {
      if (key === "") {
        await saveApiKey("");
        setSavedKey(null);
        close();
        return;
      }
      setChecking(true);
      const result = await checkApiKey(key);
      setChecking(false);
      if (result !== "ok") {
        Alert.alert(...KEY_CHECK_ALERTS[result]);
        return;
      }
      await saveApiKey(key);
      setSavedKey(key);
      close();
    } catch {
      setChecking(false);
      Alert.alert("Clé non enregistrée", "Le trousseau de l'iPhone a refusé la clé. Réessaie.");
    }
  }, [draft]);

  if (!voiceAvailable) {
    return (
      <Section title="Dictée">
        <Row first>
          <Text style={{ flex: 1, fontSize: 15, color: colors.textSecondary }}>
            La dictée arrive avec la prochaine installation de l'app.
          </Text>
        </Row>
      </Section>
    );
  }

  return (
    <Section
      title="Dictée"
      footer="Crée une clé sur console.anthropic.com et pose-lui un plafond de dépense mensuel. Elle reste dans le trousseau de l'iPhone. Claude Sonnet 5.5 trie tes dictées : environ 1 $ par mois."
    >
      {editing ? (
        <>
          <Row first>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="sk-ant-…"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              style={{ flex: 1, fontSize: 17, color: colors.textPrimary, paddingVertical: 4 }}
            />
          </Row>
          <Row>
            <Pressable onPress={close} disabled={checking} hitSlop={8} style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, color: checking ? colors.textMuted : colors.textSecondary }}>Annuler</Text>
            </Pressable>
            <Pressable onPress={() => void save()} disabled={checking} hitSlop={8}>
              <Text style={{ fontSize: 17, fontWeight: "600", color: colors.accent.caloriesText }}>
                {checking ? "Vérification…" : draft.trim() === "" && savedKey ? "Effacer la clé" : "Enregistrer"}
              </Text>
            </Pressable>
          </Row>
        </>
      ) : (
        <Pressable
          onPress={() => setEditing(true)}
          style={({ pressed }) => ({ backgroundColor: pressed ? colors.fill : "transparent" })}
        >
          <Row first>
            <Text style={{ flex: 1, fontSize: 17, color: colors.textPrimary }}>Clé Claude</Text>
            <Text style={{ fontSize: 15, color: savedKey ? colors.textSecondary : colors.accent.warning }}>
              {savedKey ? maskKey(savedKey) : "À ajouter"}
            </Text>
          </Row>
        </Pressable>
      )}
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
      <DictationSection />
      <AppearanceSection />
      <ExportSection />
    </ScrollView>
  );
}
