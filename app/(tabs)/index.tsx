import { useRouter } from "expo-router";
import React, { useState } from "react";
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
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const LOGIN_ROUTE = "/(auth)";

  const { auth, location, ready } = useStoredAuth();
  const firstName = auth.user?.first_name ?? "";
  const appid = auth.user?.appid;
  const locId = location?.loc_id ?? 3365;
  const locationName = location?.loc_name ?? "";
  const { visible, steps, start, hide } = useBootstrapCatalog();
  const [lastSynced, setLastSynced] = useState<number | null>(null);

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
    } catch (e) {
      // error sudah ditampilkan per-step dalam modal
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
    } catch (e) {
      console.log("Logout error:", e);
    }
  };

  const statusBarH =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

  return (
    <>
      <SafeAreaView style={{ flex: 0, backgroundColor: "#B81D1D" }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: "#B81D1D",
            paddingTop: 20,
            position: "relative",
            paddingBottom: 48,
          }}>
          <View className="px-4 py-3 flex-row items-center justify-between">
            <Image
              source={require("@/assets/images/logo.png")}
              style={{ width: 150, height: 90 }}
              resizeMode="contain"
            />
            <TouchableOpacity
              className="p-2 bg-red-500/95 rounded-xl"
              onPress={() => setMenuOpen(true)}
              activeOpacity={0.85}>
              <MenuIcon width={20} height={20} color="white" />
            </TouchableOpacity>
          </View>

          <FloatingProfileCard
            initials={
              locationName ? locationName.slice(0, 2).toUpperCase() : "??"
            }
            title={locationName || "Nama Location"}
            subtitle={firstName || ""}
            top={140}
            horizontal={16}
          />
        </View>

        <ScrollView
          className="bg-[#F3F4F6]"
          contentContainerStyle={{ paddingBottom: 28 }}
          showsVerticalScrollIndicator={false}>
          {/* Ringkasan Hari Ini (dummy) */}
          <View className="px-4 mt-10">
            <Text className="text-[16px] font-semibold text-gray-900 mb-3">
              Ringkasan Hari Ini
            </Text>
            <View className="flex-row">
              <View
                className="flex-1 bg-white rounded-xl px-4 py-3 mr-3 justify-center"
                style={{
                  minHeight: 82,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}>
                <Text className="text-gray-500 text-[12px] mb-1">
                  Total Penjualan
                </Text>
                <Text className="text-[18px] font-semibold text-gray-900">
                  Rp 12.000
                </Text>
              </View>
              <View
                className="flex-1 bg-white rounded-xl px-4 py-3 justify-center"
                style={{
                  minHeight: 82,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}>
                <Text className="text-gray-500 text-[12px] mb-1">
                  Total Transaksi
                </Text>
                <Text className="text-[18px] font-semibold text-gray-900">
                  Rp 12.000
                </Text>
              </View>
            </View>
          </View>

          {/* Produk Paling Laris */}
          <View className="px-4 mt-4">
            <ProductListCard
              loading={!ready || loading}
              error={error}
              products={items}
            />
          </View>

          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>

      {/* Dropdown */}
      <Modal
        transparent
        visible={menuOpen}
        onRequestClose={() => setMenuOpen(false)}
        animationType="fade">
        <Pressable
          onPress={() => setMenuOpen(false)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
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
            className="px-4 py-3"
            onPress={onSync}
            disabled={!canRun}>
            <Text style={{ color: "black", fontWeight: "600" }}>Sync Data</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onLogout}
            className="px-4 py-3"
            activeOpacity={0.85}>
            <Text className="text-red-600 font-medium">Logout</Text>
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
    </>
  );
}
