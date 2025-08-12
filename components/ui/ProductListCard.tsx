import React from "react";
import { View, Text, Image, ActivityIndicator } from "react-native";
import { UiProduct } from "@/hooks/useFavouriteProducts";
import { formatIDR } from "@/lib/utils/format";
import { toImageSource } from "@/lib/utils/image";

type Props = {
  title?: string;
  loading?: boolean;
  error?: string | null;
  products: UiProduct[];
  emptyText?: string;
};

export default function ProductListCard({ title = "Produk Paling Laris Hari Ini", loading, error, products, emptyText = "Belum ada data produk favorit." }: Props) {
  return (
    <View
      className="bg-white rounded-2xl p-4"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      <Text className="text-gray-500 text-[13px] mb-3">{title}</Text>

      {loading ? (
        <View className="py-6 items-center">
          <ActivityIndicator />
          <Text className="text-gray-500 mt-2">Memuat produk...</Text>
        </View>
      ) : error ? (
        <Text className="text-red-600">{error}</Text>
      ) : products.length === 0 ? (
        <Text className="text-gray-500">{emptyText}</Text>
      ) : (
        products.map((p, idx) => {
          const isLast = idx === products.length - 1;
          const src = toImageSource(p.image);
          return (
            <View key={p.id}>
              <View className="flex-row items-center">
                {src ? (
                  <Image
                    source={src}
                    style={{ width: 56, height: 56, borderRadius: 10 }}
                    resizeMode="cover"
                    onError={(e) => console.log("image error:", p.image, e.nativeEvent)}
                  />
                ) : (
                  <Image
                    source={require("@/assets/images/produk.png")}
                    style={{ width: 56, height: 56, borderRadius: 10 }}
                    resizeMode="cover"
                  />
                )}

                <View className="flex-1 ml-3">
                  <Text className="text-[15px] text-gray-900" numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text className="text-[12px] text-gray-500 mt-0.5">Terjual {p.sold}</Text>
                </View>

                <View style={{ minWidth: 120, alignItems: "flex-end" }}>
                  <Text className="text-[13px] text-gray-900">{formatIDR(p.price)}</Text>
                </View>
              </View>

              {!isLast && <View className="h-[1px] bg-[#F2F2F2]" style={{ marginVertical: 12 }} />}
            </View>
          );
        })
      )}
    </View>
  );
}
