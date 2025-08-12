// app/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  Platform,
  StatusBar,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MenuIcon } from "@/components/icons";
import FloatingProfileCard from "@/components/ui/FloatingProfileCard";

type AuthUser = {
  first_name: string;
};

type SelectedLocation = {
  loc_id: number;
  loc_name: string;
};

const STORAGE = {
  USER: "auth_user",
  SELECTED_LOCATION: "selected_location",
};

function formatIDR(n: number | string) {
  const num =
    typeof n === "string" ? Number(String(n).replace(/[^\d]/g, "")) : n;
  if (Number.isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num as number);
}

export default function Index() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const LOGIN_ROUTE = "/(auth)";
  const [firstName, setFirstName] = useState<string>("");
  const [locationName, setLocationName] = useState<string>("");
  const products = useMemo(
    () => [
      { id: 1, name: "Coffee Latte", sold: 20, price: 5000000 },
      { id: 2, name: "Cappuccino", sold: 15, price: 4500000 },
      { id: 3, name: "Americano", sold: 30, price: 3500000 },
    ],
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const rawUser = await AsyncStorage.getItem(STORAGE.USER);
        if (rawUser) {
          const user: AuthUser = JSON.parse(rawUser);
          setFirstName(user.first_name || "");
        }

        const rawLoc = await AsyncStorage.getItem(STORAGE.SELECTED_LOCATION);
        if (rawLoc) {
          const location: SelectedLocation = JSON.parse(rawLoc);
          setLocationName(location.loc_name || "");
        }
      } catch (e) {
        console.log("Error loading data:", e);
      }
    })();
  }, []);

  const onLogout = async () => {
    try {
      setMenuOpen(false);
      await AsyncStorage.multiRemove(["auth_token", "auth_user"]);
      router.replace(LOGIN_ROUTE);
    } catch (e) {
      console.log("Logout error:", e);
    }
  };

  const statusBarH =
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

  return (
    <>
      {/* Safe areas */}
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
            initials={locationName ? locationName.slice(0, 2).toUpperCase() : "??"}
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
          {/* Ringkasan Hari Ini */}
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
                  {formatIDR(12000)}
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
                  {formatIDR(12000)}
                </Text>
              </View>
            </View>
          </View>

          {/* Produk Paling Laris */}
          <View className="px-4 mt-4">
            <View
              className="bg-white rounded-2xl p-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
                elevation: 3,
              }}>
              <Text className="text-gray-500 text-[13px] mb-3">
                Produk Paling Laris Hari Ini
              </Text>

              {products.map((p, idx) => {
                const isLast = idx === products.length - 1;
                return (
                  <View key={p.id}>
                    <View className="flex-row items-center">
                      {/* Thumbnail */}
                      <Image
                        source={require("@/assets/images/produk.png")}
                        style={{ width: 56, height: 56, borderRadius: 10 }}
                        resizeMode="cover"
                      />

                      {/* Info */}
                      <View className="flex-1 ml-3">
                        <Text className="text-[15px] text-gray-900">
                          {p.name}
                        </Text>
                        <Text className="text-[12px] text-gray-500 mt-0.5">
                          Terjual {p.sold}
                        </Text>
                      </View>

                      {/* Price right aligned & fixed width agar rata kanan konsisten */}
                      <View style={{ minWidth: 120, alignItems: "flex-end" }}>
                        <Text className="text-[13px] text-gray-900">
                          {formatIDR(p.price)}
                        </Text>
                      </View>
                    </View>

                    {!isLast && (
                      <View
                        className="h-[1px] bg-[#F2F2F2] my-12px"
                        style={{ marginVertical: 12 }}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <View className="h-8" />
        </ScrollView>
      </SafeAreaView>

      {/* Dropdown pakai Modal */}
      <Modal
        transparent
        visible={menuOpen}
        onRequestClose={() => setMenuOpen(false)}
        animationType="fade">
        {/* Backdrop */}
        <Pressable
          onPress={() => setMenuOpen(false)}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Menu kanan atas */}
        <View
          style={{
            position: "absolute",
            top: statusBarH + 52, // sejajarkan dgn header
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
            onPress={onLogout}
            className="px-4 py-3"
            activeOpacity={0.85}>
            <Text className="text-red-600 font-medium">Logout</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}
