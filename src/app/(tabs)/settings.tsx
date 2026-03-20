import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useDb } from "@/app/_layout";
import { MEALS } from "@/constants/meals";
import { SPACING } from "@/constants/theme";
import { getAllEntriesForExport } from "@/db/queries/entries";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { exportEntriesCsv } from "@/lib/nutrition-utils";
import { useSettingsStore } from "@/stores/settings-store";
import type { Goals } from "@/types/nutrition";

// ---------- Section card wrapper ----------

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  backgroundColor: string;
  titleColor: string;
  separatorColor: string;
}

function SectionCard({
  title,
  children,
  backgroundColor,
  titleColor,
  separatorColor,
}: SectionCardProps) {
  return (
    <View style={{ marginBottom: SPACING.lg }}>
      <Text
        style={{
          color: titleColor,
          fontSize: 13,
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: SPACING.xs,
          marginLeft: SPACING.xs,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor,
          borderRadius: 16,
          borderCurve: "continuous",
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
}

// ---------- Row wrappers ----------

interface RowProps {
  separatorColor: string;
  isLast?: boolean;
  children: React.ReactNode;
}

function Row({ separatorColor, isLast, children }: RowProps) {
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: SPACING.lg,
          paddingVertical: SPACING.md,
          minHeight: 48,
        }}
      >
        {children}
      </View>
      {!isLast && (
        <View
          style={{
            height: 1,
            backgroundColor: separatorColor,
            marginLeft: SPACING.lg,
          }}
        />
      )}
    </View>
  );
}

// ---------- Goals section ----------

const MAIN_GOALS: { key: keyof Goals; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "kcal" },
  { key: "proteins", label: "Protéines", unit: "g" },
  { key: "carbs", label: "Glucides", unit: "g" },
  { key: "fats", label: "Lipides", unit: "g" },
];

const OPTIONAL_GOALS: { key: keyof Goals; label: string; unit: string }[] = [
  { key: "fiber", label: "Fibres", unit: "g" },
  { key: "sugars", label: "Sucres", unit: "g" },
  { key: "saturated_fat", label: "Acides gras saturés", unit: "g" },
  { key: "salt", label: "Sel", unit: "g" },
];

interface GoalsSectionProps {
  colors: ReturnType<typeof useThemeColors>;
}

function GoalsSection({ colors }: GoalsSectionProps) {
  const goals = useSettingsStore((s) => s.goals);
  const setGoals = useSettingsStore((s) => s.setGoals);

  // Local state for text inputs (string representation)
  const [localValues, setLocalValues] = useState<Record<keyof Goals, string>>(
    () => ({
      calories: goals.calories !== null ? String(goals.calories) : "",
      proteins: goals.proteins !== null ? String(goals.proteins) : "",
      carbs: goals.carbs !== null ? String(goals.carbs) : "",
      fats: goals.fats !== null ? String(goals.fats) : "",
      fiber: goals.fiber !== null ? String(goals.fiber) : "",
      sugars: goals.sugars !== null ? String(goals.sugars) : "",
      saturated_fat:
        goals.saturated_fat !== null ? String(goals.saturated_fat) : "",
      salt: goals.salt !== null ? String(goals.salt) : "",
    }),
  );

  // Show/hide optional fields
  const [showOptional, setShowOptional] = useState<
    Partial<Record<keyof Goals, boolean>>
  >(() => ({
    fiber: goals.fiber !== null,
    sugars: goals.sugars !== null,
    saturated_fat: goals.saturated_fat !== null,
    salt: goals.salt !== null,
  }));

  const handleBlur = useCallback(
    (key: keyof Goals) => {
      const raw = localValues[key].trim();
      if (raw === "") {
        setGoals({ [key]: null });
      } else {
        const parsed = parseFloat(raw);
        if (!isNaN(parsed) && parsed >= 0) {
          setGoals({ [key]: parsed });
        }
      }
    },
    [localValues, setGoals],
  );

  const toggleOptional = useCallback(
    (key: keyof Goals, value: boolean) => {
      setShowOptional((prev) => ({ ...prev, [key]: value }));
      if (!value) {
        setLocalValues((prev) => ({ ...prev, [key]: "" }));
        setGoals({ [key]: null });
      }
    },
    [setGoals],
  );

  const allMainRows = MAIN_GOALS.length;
  const visibleOptional = OPTIONAL_GOALS.filter((g) => showOptional[g.key]);
  const hiddenOptional = OPTIONAL_GOALS.filter((g) => !showOptional[g.key]);
  const totalRows =
    allMainRows + visibleOptional.length + hiddenOptional.length;
  let rowIndex = 0;

  return (
    <SectionCard
      title="Objectifs quotidiens"
      backgroundColor={colors.card}
      titleColor={colors.textSecondary}
      separatorColor={colors.separator}
    >
      {MAIN_GOALS.map((goal, i) => {
        rowIndex++;
        return (
          <Row
            key={goal.key}
            separatorColor={colors.separator}
            isLast={rowIndex === totalRows}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 16, flex: 1 }}>
              {goal.label}
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <TextInput
                value={localValues[goal.key]}
                onChangeText={(v) =>
                  setLocalValues((prev) => ({ ...prev, [goal.key]: v }))
                }
                onBlur={() => handleBlur(goal.key)}
                keyboardType="numeric"
                placeholder="—"
                placeholderTextColor={colors.textMuted}
                style={{
                  color: colors.textPrimary,
                  fontSize: 16,
                  textAlign: "right",
                  minWidth: 60,
                }}
              />
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  minWidth: 28,
                }}
              >
                {goal.unit}
              </Text>
            </View>
          </Row>
        );
      })}

      {/* Visible optional goals */}
      {visibleOptional.map((goal) => {
        rowIndex++;
        return (
          <Row
            key={goal.key}
            separatorColor={colors.separator}
            isLast={rowIndex === totalRows}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 16, flex: 1 }}>
              {goal.label}
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <TextInput
                  value={localValues[goal.key]}
                  onChangeText={(v) =>
                    setLocalValues((prev) => ({ ...prev, [goal.key]: v }))
                  }
                  onBlur={() => handleBlur(goal.key)}
                  keyboardType="numeric"
                  placeholder="—"
                  placeholderTextColor={colors.textMuted}
                  style={{
                    color: colors.textPrimary,
                    fontSize: 16,
                    textAlign: "right",
                    minWidth: 60,
                  }}
                />
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 14,
                    minWidth: 28,
                  }}
                >
                  {goal.unit}
                </Text>
              </View>
              <Switch
                value={true}
                onValueChange={(v) => toggleOptional(goal.key, v)}
                trackColor={{
                  false: colors.separator,
                  true: colors.accent.calories,
                }}
                thumbColor="#ffffff"
              />
            </View>
          </Row>
        );
      })}

      {/* Hidden optional goals (toggle to enable) */}
      {hiddenOptional.map((goal) => {
        rowIndex++;
        return (
          <Row
            key={goal.key}
            separatorColor={colors.separator}
            isLast={rowIndex === totalRows}
          >
            <Text
              style={{ color: colors.textSecondary, fontSize: 16, flex: 1 }}
            >
              {goal.label}
            </Text>
            <Switch
              value={false}
              onValueChange={(v) => toggleOptional(goal.key, v)}
              trackColor={{
                false: colors.separator,
                true: colors.accent.calories,
              }}
              thumbColor="#ffffff"
            />
          </Row>
        );
      })}
    </SectionCard>
  );
}

// ---------- Meals section ----------

interface MealsSectionProps {
  colors: ReturnType<typeof useThemeColors>;
}

function MealsSection({ colors }: MealsSectionProps) {
  const enabledMeals = useSettingsStore((s) => s.enabledMeals);
  const toggleMeal = useSettingsStore((s) => s.toggleMeal);

  return (
    <SectionCard
      title="Repas actifs"
      backgroundColor={colors.card}
      titleColor={colors.textSecondary}
      separatorColor={colors.separator}
    >
      {MEALS.map((meal, i) => (
        <Row
          key={meal.type}
          separatorColor={colors.separator}
          isLast={i === MEALS.length - 1}
        >
          <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
            {meal.label}
          </Text>
          <Switch
            value={enabledMeals[meal.type]}
            onValueChange={() => toggleMeal(meal.type)}
            trackColor={{
              false: colors.separator,
              true: colors.accent.calories,
            }}
            thumbColor="#ffffff"
          />
        </Row>
      ))}
    </SectionCard>
  );
}

// ---------- Theme section ----------

interface ThemeSectionProps {
  colors: ReturnType<typeof useThemeColors>;
}

function ThemeSection({ colors }: ThemeSectionProps) {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  return (
    <SectionCard
      title="Thème"
      backgroundColor={colors.card}
      titleColor={colors.textSecondary}
      separatorColor={colors.separator}
    >
      <Row separatorColor={colors.separator} isLast>
        <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
          Mode sombre
        </Text>
        <Switch
          value={theme === "dark"}
          onValueChange={(v) => setTheme(v ? "dark" : "light")}
          trackColor={{
            false: colors.separator,
            true: colors.accent.calories,
          }}
          thumbColor="#ffffff"
        />
      </Row>
    </SectionCard>
  );
}

// ---------- Export section ----------

interface ExportSectionProps {
  colors: ReturnType<typeof useThemeColors>;
}

function ExportSection({ colors }: ExportSectionProps) {
  const db = useDb();
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const entries = await getAllEntriesForExport(db);
      if (entries.length === 0) {
        Alert.alert("Aucune donnée", "Aucune entrée à exporter.");
        return;
      }
      const csv = exportEntriesCsv(entries);
      const file = new File(Paths.cache, `kalor_export_${Date.now()}.csv`);
      file.write(csv);
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "text/csv",
          dialogTitle: "Exporter les donnees nutritionnelles",
          UTI: "public.comma-separated-values-text",
        });
      } else {
        Alert.alert(
          "Partage indisponible",
          "Le partage de fichiers n'est pas disponible sur cet appareil.",
        );
      }
    } catch (e) {
      Alert.alert("Erreur", "Une erreur est survenue lors de l'export.");
    } finally {
      setExporting(false);
    }
  }, [db, exporting]);

  return (
    <SectionCard
      title="Données"
      backgroundColor={colors.card}
      titleColor={colors.textSecondary}
      separatorColor={colors.separator}
    >
      <Row separatorColor={colors.separator} isLast>
        <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
          Exporter en CSV
        </Text>
        <Pressable
          onPress={() => void handleExport()}
          disabled={exporting}
          style={({ pressed }) => ({
            opacity: exporting ? 0.5 : pressed ? 0.7 : 1,
            backgroundColor: colors.accent.calories,
            paddingHorizontal: SPACING.md,
            paddingVertical: SPACING.xs + 2,
            borderRadius: 8,
            borderCurve: "continuous",
          })}
        >
          <Text style={{ color: "#000000", fontWeight: "600", fontSize: 14 }}>
            {exporting ? "Export..." : "Exporter"}
          </Text>
        </Pressable>
      </Row>
    </SectionCard>
  );
}

// ---------- Main screen ----------

export default function SettingsScreen() {
  const colors = useThemeColors();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}
      contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 48 }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <GoalsSection colors={colors} />
      <MealsSection colors={colors} />
      <ThemeSection colors={colors} />
      <ExportSection colors={colors} />
    </ScrollView>
  );
}
