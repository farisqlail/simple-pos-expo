// app/(tabs)/_layout.tsx
import React, { useCallback, useMemo } from "react";
import { View, useWindowDimensions } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";

import BottomNav, { NavItem } from "@/components/ui/BottomNav";

const ROUTES = {
  beranda: "/(tabs)" as const,
  transaksi: "/(tabs)/transactions" as const,
  riwayat: "/(tabs)/history" as const,
};

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // tentukan tab aktif dari segmen URL kedua (setelah "(tabs)")
  const activeTab = useMemo(() => {
    const current = segments?.[1];
    if (current === "transactions") return "transaksi";
    if (current === "history") return "riwayat";
    return "beranda";
  }, [segments]);

  const navItems = useMemo<Omit<NavItem, "onPress">[]>(
    () => [
      { id: "beranda", label: "Beranda", icon: "home-outline" },
      { id: "transaksi", label: "Transaksi", icon: "card-outline" },
      { id: "riwayat", label: "Riwayat", icon: "time-outline" },
    ],
    []
  );

  const handleNavigation = useCallback(
    (id: string) => {
      if (id === activeTab) return;

      if (id === "beranda") router.replace(ROUTES.beranda);
      else if (id === "transaksi") router.replace(ROUTES.transaksi);
      else if (id === "riwayat") router.replace(ROUTES.riwayat);
    },
    [router, activeTab]
  );

  const navItemsWithCallbacks = useMemo(
    () => navItems.map((item) => ({ ...item, onPress: () => handleNavigation(item.id) })),
    [navItems, handleNavigation]
  );

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
            animationDuration: 200,
          }}
        />
        <BottomNav
          items={navItemsWithCallbacks}
          activeId={activeTab}
          activeColor="#ef4444"
          inactiveColor="#6b7280"
        />
      </View>
    </SafeAreaProvider>
  );
}
