import { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";

import { useThemeColors } from "@/hooks/use-theme-colors";
import { getProduct, upsertProduct } from "@/db/queries/products";
import { fetchProduct } from "@/lib/open-food-facts";
import type { ProductRow } from "@/types/database";

function flattenProductForDb(product: {
  id: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  source: string;
  nutrition_per_100g: {
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    fiber: number | null;
    sugars: number | null;
    saturated_fat: number | null;
    salt: number | null;
  };
  last_quantity: number;
}): Omit<ProductRow, "created_at"> {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    image_url: product.image_url,
    source: product.source,
    calories: product.nutrition_per_100g.calories,
    proteins: product.nutrition_per_100g.proteins,
    carbs: product.nutrition_per_100g.carbs,
    fats: product.nutrition_per_100g.fats,
    fiber: product.nutrition_per_100g.fiber,
    sugars: product.nutrition_per_100g.sugars,
    saturated_fat: product.nutrition_per_100g.saturated_fat,
    salt: product.nutrition_per_100g.salt,
    last_quantity: product.last_quantity,
  };
}

export default function ScanScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const colors = useThemeColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);

    // Check local DB first
    const localProduct = await getProduct(db, data);
    if (localProduct) {
      router.replace(`/add-entry/confirm?productId=${data}`);
      return;
    }

    // Fetch from OpenFoodFacts
    try {
      const offProduct = await fetchProduct(data);
      if (offProduct) {
        await upsertProduct(db, flattenProductForDb(offProduct));
        router.replace(`/add-entry/confirm?productId=${data}`);
      } else {
        router.replace(`/add-entry/manual?ean=${data}`);
      }
    } catch {
      Alert.alert(
        "Erreur reseau",
        "Impossible de rechercher le produit. Verifiez votre connexion.",
        [
          { text: "Reessayer", onPress: () => setScanned(false) },
          {
            text: "Saisie manuelle",
            onPress: () => router.replace(`/add-entry/manual?ean=${data}`),
          },
        ],
      );
    }
  };

  // Permission not yet determined
  if (!permission) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Chargement...
        </Text>
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text
          style={[
            styles.message,
            { color: colors.textPrimary, marginBottom: 16 },
          ]}
        >
          {permission.canAskAgain
            ? "L'acces a la camera est necessaire pour scanner les codes-barres."
            : "L'acces a la camera a ete refuse. Ouvrez les reglages pour l'autoriser."}
        </Text>
        {permission.canAskAgain ? (
          <Pressable
            onPress={requestPermission}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: colors.accent.calories,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={styles.buttonText}>Autoriser</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => Linking.openSettings()}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: colors.accent.calories,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={styles.buttonText}>Ouvrir les reglages</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.scanArea} />
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        {scanned && (
          <Pressable
            onPress={() => setScanned(false)}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: "rgba(255,255,255,0.2)",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={styles.buttonText}>Scanner a nouveau</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scanArea: {
    width: 260,
    height: 160,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    borderRadius: 16,
    borderCurve: "continuous",
  },
  bottomBar: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderCurve: "continuous",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
