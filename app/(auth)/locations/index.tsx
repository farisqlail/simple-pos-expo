// app/(auth)/locations/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getResource } from "@/lib/api/fetch";

type User = {
  id?: number; 
  appid?: string; 
  first_name?: string;
  last_name?: string;
  email?: string;
};

type ApiLocation = {
  appid: string;
  loc_id: number;
  loc_name: string;
  loc_type: string;
  loc_addr: string;
  loc_business_type: string;
  loc_code: string;
  isusing_nota_logo: string;
  loc_logo: string;
  loc_logo_bw: string;
  loc_phone: string;
  loc_print_checker: string;
  loc_firsttodo: string;
  loc_flow_order: string;
  rounding: string;
  rounding_nominal: string;
  is_show_service_fee: string;
  service_fee: number;
  service_fee_type: string;
  tax_id: number;
  tax_name: string;
  tax_type: string;
  tax_percent: number;
  tax_setting: string;
};

type ApiResponse = {
  status: "success" | "error";
  message?: string;
  data: ApiLocation[];
};

type UiLocation = {
  id: number;
  name: string;
  address: string;
  raw: ApiLocation;
};

const STORAGE = {
  USER: "auth_user",
  TOKEN: "auth_token",
  SELECTED_LOCATION: "selected_location",
};

function getInitials(user?: User) {
  const full = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  if (full) {
    const [a, b] = full.split(/\s+/);
    return `${a?.[0] || ""}${b?.[0] || ""}`.toUpperCase() || "U";
  }
  return (user?.email?.[0] || "U").toUpperCase();
}

export default function LocationsScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<UiLocation[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [rawUser, rawToken] = await Promise.all([
          AsyncStorage.getItem(STORAGE.USER),
          AsyncStorage.getItem(STORAGE.TOKEN),
        ]);
        if (rawUser) setUser(JSON.parse(rawUser));
        if (rawToken) setToken(rawToken);
      } catch (e) {
        console.log("Load storage error:", e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [rawUser, rawToken] = await Promise.all([
          AsyncStorage.getItem("auth_user"),
          AsyncStorage.getItem("auth_token"),
        ]);
        if (rawUser) setUser(JSON.parse(rawUser));
        if (rawToken) setToken(rawToken); 
      } catch (e) {
        console.log("Load storage error:", e);
      }
    })();
  }, []);

  const tokenHeader = token || null;

  const fetchLocations = useCallback(async () => {
    if (!user?.appid || !user?.id || !tokenHeader) return;
    setError(null);

    const endpoint =
      `location/get-all-locations-by-user?appid=${encodeURIComponent(user.appid)}` +
      `&user_id=${encodeURIComponent(String(user.id))}`;

    try {
      const res = await getResource<ApiResponse>(endpoint, tokenHeader);
      if (res.status !== "success") {
        throw new Error(res.message || "Gagal memuat lokasi.");
      }
      const mapped: UiLocation[] = (res.data || []).map((l) => ({
        id: l.loc_id,
        name: l.loc_name,
        address: l.loc_addr,
        raw: l,
      }));
      setLocations(mapped);
    } catch (e: any) {
      console.log("Fetch locations error:", e);
      setError(e?.message ?? "Gagal memuat lokasi.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.appid, user?.id, tokenHeader]);

  useEffect(() => {
    if (user?.appid && user?.id && tokenHeader) {
      fetchLocations();
    }
  }, [user?.appid, user?.id, tokenHeader, fetchLocations]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLocations();
  }, [fetchLocations]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return locations;
    return locations.filter(
      (i) =>
        i.name.toLowerCase().includes(term) ||
        i.address.toLowerCase().includes(term)
    );
  }, [q, locations]);

  const initials = getInitials(user || undefined);

  const selectLocation = async (item: UiLocation) => {
    try {
      await AsyncStorage.setItem(
        STORAGE.SELECTED_LOCATION,
        JSON.stringify(item.raw)
      );
      router.replace("/(tabs)");
    } catch (e) {
      console.log("Save selected location error:", e);
      setError("Gagal menyimpan lokasi terpilih.");
    }
  };

  const renderItem = ({ item }: { item: UiLocation }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      className="bg-white rounded-2xl px-4 py-3 mb-3 flex-row items-center"
      style={{
        borderWidth: 1,
        borderColor: "#EEEEEE",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
      }}
      onPress={() => selectLocation(item)}>
      <View className="w-8 items-center mr-3">
        <Ionicons name="location-sharp" size={18} color="#F97316" />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] text-gray-900">{item.name}</Text>
        <Text className="text-[12px] text-gray-500 mt-0.5" numberOfLines={1}>
          {item.address || "-"}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color="#F97316" />
    </TouchableOpacity>
  );

  return (
    <>
      <SafeAreaView style={{ flex: 0, backgroundColor: "#B81D1D" }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
        {/* Header merah + kartu putih */}
        <View style={{ backgroundColor: "#B81D1D", paddingBottom: 22 }}>
          <View className="px-4 mt-3">
            <View
              className="bg-white rounded-3xl px-5 pt-6 pb-4"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
                elevation: 4,
              }}>
              <View className="items-center">
                <View className="w-12 h-12 rounded-full bg-orange-100 items-center justify-center">
                  <Text className="text-orange-700 font-bold">{initials}</Text>
                </View>
                <Text className="text-lg font-semibold text-gray-900 mt-3">
                  Halo,{" "}
                  {user?.first_name || user?.email?.split("@")[0] || "User"}
                </Text>
                {!!user?.email && (
                  <Text className="text-[12px] text-gray-500 mt-1">
                    {user.email}
                  </Text>
                )}
              </View>

              {/* Search */}
              <View className="mt-4 flex-row items-center bg-[#F6F7F9] rounded-2xl px-3 py-2">
                <Feather name="search" size={18} color="#9CA3AF" />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Cari Lokasi"
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 ml-2 text-gray-900"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Body */}
        <View className="px-4 pt-4 flex-1">
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator />
              <Text className="mt-2 text-gray-500">Memuat lokasi...</Text>
            </View>
          ) : error ? (
            <View className="items-center">
              <Text className="text-red-600">{error}</Text>
              <TouchableOpacity
                onPress={fetchLocations}
                className="mt-2 px-4 py-2 bg-red-600 rounded-lg">
                <Text className="text-white">Coba lagi</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(it) => String(it.id)}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <Text className="text-gray-500 text-center mt-6">
                  Lokasi tidak ditemukan.
                </Text>
              }
            />
          )}
        </View>
      </SafeAreaView>
    </>
  );
}
