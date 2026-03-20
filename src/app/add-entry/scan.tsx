import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";

import { useDb } from "@/app/_layout";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { getProduct, upsertProduct } from "@/db/queries/products";
import { fetchProduct } from "@/lib/open-food-facts";
import { flattenProductForDb } from "@/lib/product-utils";

export default function ScanScreen() {
  const router = useRouter();
  const db = useDb();
  const colors = useThemeColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanLock = useRef(false);
  const [torch, setTorch] = useState(false);
  const [autoFocus, setAutoFocus] = useState<"on" | "off">("on");
  const cameraRef = useRef<CameraView>(null);

  const lookupEan = useCallback(
    async (ean: string) => {
      const localProduct = await getProduct(db, ean);
      const hasNutrition =
        localProduct &&
        localProduct.source === "openfoodfacts" &&
        (localProduct.calories > 0 ||
          localProduct.proteins > 0 ||
          localProduct.carbs > 0 ||
          localProduct.fats > 0);

      if (localProduct && hasNutrition) {
        router.push(`/add-entry/confirm?productId=${ean}`);
        return;
      }

      try {
        const offProduct = await fetchProduct(ean);
        if (offProduct) {
          await upsertProduct(db, flattenProductForDb(offProduct));
          router.push(`/add-entry/confirm?productId=${ean}`);
        } else if (localProduct) {
          router.push(`/add-entry/confirm?productId=${ean}`);
        } else {
          router.push(`/add-entry/manual?ean=${ean}`);
        }
      } catch {
        if (localProduct) {
          router.push(`/add-entry/confirm?productId=${ean}`);
        } else {
          Alert.alert(
            "Erreur réseau",
            "Impossible de rechercher le produit. Vérifiez votre connexion.",
            [
              {
                text: "Réessayer",
                onPress: () => {
                  setScanned(true);
                  lookupEan(ean);
                },
              },
              {
                text: "Saisie manuelle",
                onPress: () => router.push(`/add-entry/manual?ean=${ean}`),
              },
              {
                text: "Annuler",
                onPress: () => {
                  scanLock.current = false;
                  setScanned(false);
                },
                style: "cancel",
              },
            ],
          );
        }
      }
    },
    [db, router],
  );

  const handleBarCodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (scanLock.current) return;
      scanLock.current = true;
      setScanned(true);
      lookupEan(data);
    },
    [lookupEan],
  );

  const handleManualEan = useCallback(() => {
    Alert.prompt(
      "Saisir un code-barres",
      "Entrez le code EAN du produit",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Rechercher",
          onPress: (ean?: string) => {
            if (ean && ean.trim().length > 0) {
              setScanned(true);
              lookupEan(ean.trim());
            }
          },
        },
      ],
      "plain-text",
      "",
      "number-pad",
    );
  }, [lookupEan]);

  if (!permission) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Chargement...
        </Text>
      </View>
    );
  }

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
            ? "L'accès à la caméra est nécessaire pour scanner les codes-barres."
            : "L'accès à la caméra a été refusé. Ouvrez les réglages pour l'autoriser."}
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
            <Text style={styles.buttonText}>Ouvrir les réglages</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torch}
        autofocus={autoFocus}
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Overlay — tap to refocus */}
      <Pressable
        style={styles.overlay}
        onPress={() => {
          setAutoFocus("off");
          setTimeout(() => setAutoFocus("on"), 50);
        }}
      >
        <View style={styles.scanArea} />
      </Pressable>

      {/* Top bar — back + flash */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(0,0,0,0.4)",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <SymbolView name="chevron.left" size={18} tintColor="#fff" />
        </Pressable>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
            onPress={() => setAutoFocus((f) => (f === "on" ? "off" : "on"))}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor:
                autoFocus === "on"
                  ? "rgba(255,255,255,0.6)"
                  : "rgba(0,0,0,0.4)",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <SymbolView
              name="camera.macro"
              size={18}
              tintColor={autoFocus === "on" ? "#000" : "#fff"}
            />
          </Pressable>

          <Pressable
            onPress={() => setTorch((t) => !t)}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: torch
                ? "rgba(255,204,0,0.8)"
                : "rgba(0,0,0,0.4)",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <SymbolView
              name={torch ? "flashlight.on.fill" : "flashlight.off.fill"}
              size={18}
              tintColor="#fff"
            />
          </Pressable>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        {scanned ? (
          <Pressable
            onPress={() => {
              scanLock.current = false;
              setScanned(false);
            }}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: "rgba(255,255,255,0.2)",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={styles.buttonText}>Scanner à nouveau</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleManualEan}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: "rgba(255,255,255,0.2)",
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={styles.buttonText}>Saisir le code-barres</Text>
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
  topBar: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
