import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import Constants from "expo-constants";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ScreenOrientation from "expo-screen-orientation";

import { STORAGE_KEYS } from "@/lib/storage/keys";
import { useBootstrapCatalog } from "@/hooks/useBootstrapCatalog";
import { useFavouriteProducts } from "@/hooks/useFavouriteProducts";
import { useStoredAuth } from "@/hooks/useStoredAuth";

import { MenuIcon } from "@/components/icons";
import FloatingProfileCard from "@/components/ui/FloatingProfileCard";
import ProductListCard from "@/components/ui/ProductListCard";
import ProgressModal from "@/components/ui/ProgressModal";

export default function Index() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);

  const LOGIN_ROUTE = "/(auth)";

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // Lock orientasi default untuk screen ini
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
    return () => {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );
    };
  }, []);

  const { auth, location, ready } = useStoredAuth();
  const firstName = auth.user?.first_name ?? "";
  const appid = auth.user?.appid;
  const locId = location?.loc_id ?? 3365;
  const locationName = location?.loc_name ?? "";

  const { visible, steps, start, hide } = useBootstrapCatalog();

  const canRun =
    ready && !!auth.user?.appid && !!auth.token && !!(location?.loc_id ?? null);

  const { loading, error, items } = useFavouriteProducts({
    appid,
    locationId: locId,
    token: auth.token,
  });

  const onSync = async () => {
    if (!canRun) return;
    try {
      await start({
        appid: auth.user!.appid!,
        locationId: location?.loc_id ?? 3365,
        token: auth.token!,
      });
      setLastSynced(Date.now());
    } catch {
      // Error sudah ditampilkan per-step dalam modal
    }
  };

  const onLogout = async () => {
    try {
      setMenuOpen(false);
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.USER,
        STORAGE_KEYS.SELECTED_LOCATION,
      ]);
      router.replace(LOGIN_ROUTE);
    } catch (err) {
      console.log("Logout error:", err);
    }
  };

  const statusBarH =
    Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0;

  // Dimensi adaptif
  const horizontalPad = Math.max(16, Math.round(width * 0.04));
  const floatingTop = isLandscape ? 96 : 140;
  const headerPaddingBottom = isLandscape ? 28 : 48;

  return (
    <SafeAreaProvider>
      {/* Safe area top iOS merah */}
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header merah */}
        <View
          style={{
            backgroundColor: "#B81D1D",
            position: "relative",
            paddingBottom: headerPaddingBottom,
          }}>
          <View
            style={{
              paddingHorizontal: horizontalPad,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={{
                width: isLandscape ? 130 : 150,
                height: isLandscape ? 72 : 90,
              }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
              accessible
              accessibilityRole="image"
              accessibilityLabel="Logo"
            />
            <TouchableOpacity
              style={{
                padding: 8,
                backgroundColor: "rgba(239,68,68,0.95)",
                borderRadius: 12,
              }}
              onPress={() => setMenuOpen(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Buka menu">
              <MenuIcon width={20} height={20} color="white" />
            </TouchableOpacity>
          </View>

          <FloatingProfileCard
            initials={
              locationName ? locationName.slice(0, 2).toUpperCase() : "??"
            }
            title={locationName || "Nama Location"}
            subtitle={firstName || ""}
            top={floatingTop}
            horizontal={horizontalPad}
          />
        </View>

        {/* Konten scroll */}
        <ScrollView
          style={{ backgroundColor: "#F3F4F6" }}
          contentContainerStyle={{
            paddingBottom: 28,
          }}
          showsVerticalScrollIndicator={false}>
          <View
            style={{
              paddingHorizontal: horizontalPad,
              marginTop: isLandscape ? 64 : 60,
            }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
              }}>
              <Text
                style={{
                  fontSize: isLandscape ? 15 : 16,
                  fontWeight: "600",
                  color: "#111827",
                }}>
                Ringkasan Hari Ini
              </Text>
              {lastSynced ? (
                <Text style={{ fontSize: 11, color: "#6B7280" }}>
                  Terakhir sinkron: {new Date(lastSynced).toLocaleString()}
                </Text>
              ) : null}
            </View>

            {/* Kartu ringkasan */}
            <View
              style={{
                flexDirection: isLandscape ? "column" : "row",
                gap: 12,
              }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "white",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  justifyContent: "center",
                  minHeight: isLandscape ? 74 : 82,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}>
                <Text
                  style={{ color: "#6B7280", fontSize: 12, marginBottom: 4 }}>
                  Total Penjualan
                </Text>
                <Text
                  style={{
                    color: "#111827",
                    fontSize: isLandscape ? 17 : 18,
                    fontWeight: "600",
                  }}>
                  Rp 12.000
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: "white",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  justifyContent: "center",
                  minHeight: isLandscape ? 74 : 82,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}>
                <Text
                  style={{ color: "#6B7280", fontSize: 12, marginBottom: 4 }}>
                  Total Transaksi
                </Text>
                <Text
                  style={{
                    color: "#111827",
                    fontSize: isLandscape ? 17 : 18,
                    fontWeight: "600",
                  }}>
                  Rp 12.000
                </Text>
              </View>
            </View>
          </View>

          {/* Produk Paling Laris */}
          <View style={{ paddingHorizontal: horizontalPad, marginTop: 16 }}>
            <ProductListCard
              loading={!ready || loading}
              error={error}
              products={items}
            />
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>

      {/* Dropdown menu */}
      <Modal
        transparent
        visible={menuOpen}
        onRequestClose={() => setMenuOpen(false)}
        animationType="fade">
        <Pressable
          onPress={() => setMenuOpen(false)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          accessibilityRole="button"
          accessibilityLabel="Tutup menu"
        />
        <View
          style={{
            position: "absolute",
            top: statusBarH + 10,
            right: 12,
            minWidth: 172,
            backgroundColor: "white",
            borderRadius: 12,
            paddingVertical: 6,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 12,
          }}>
          <TouchableOpacity
            style={{ paddingHorizontal: 16, paddingVertical: 12 }}
            onPress={onSync}
            disabled={!canRun}
            accessibilityRole="button"
            accessibilityLabel="Sinkronkan data">
            <Text
              style={{
                color: canRun ? "black" : "#9CA3AF",
                fontWeight: "600",
              }}>
              Sync Data
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onLogout}
            style={{ paddingHorizontal: 16, paddingVertical: 12 }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Keluar akun">
            <Text style={{ color: "#DC2626", fontWeight: "600" }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <ProgressModal
        visible={visible}
        title="Mengambil Data"
        steps={steps}
        onRequestClose={hide}
        closable
      />
    </SafeAreaProvider>
  );
}
