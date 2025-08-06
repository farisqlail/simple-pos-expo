import React from "react";
import { View, Text, Image, ScrollView } from "react-native";
import { MenuIcon } from "@/components/icons";

export default function Index() {
  const products = [
    {
      id: 1,
      name: "Coffee Latte",
      sold: 20,
      price: "Rp.5.000.000",
    },
    {
      id: 2,
      name: "Cappuccino",
      sold: 15,
      price: "Rp.4.500.000",
    },
    {
      id: 3,
      name: "Americano",
      sold: 30,
      price: "Rp.3.500.000",
    },
  ];

  return (
    <ScrollView className="bg-gray-200 pt-10">
      <View className="flex-1">
        <View className="bg-red-700 px-4 py-6 flex-row justify-between items-center">
          <Image
            source={require("@/assets/images/logo.png")}
            className="w-[136px] mr-2"
            resizeMode="contain"
          />
          <View className="p-1 bg-red-500 rounded-lg">
            <MenuIcon width={24} height={24} color="white" />
          </View>
        </View>

        <View className="-mt-6 px-4">
          <View className="p-4 rounded-lg bg-white flex-row gap-4 shadow-md">
            <View className="w-12 h-12 bg-orange-200 rounded-full items-center justify-center">
              <Text className="text-orange-700 text-xl font-bold">N7</Text>
            </View>
            <View className="flex-col justify-center">
              <Text className="text-xl font-semibold">N7 Coffee</Text>
              <Text className="font-normal text-gray-500">Staff Teguh</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="p-4">
        <View className="flex-col gap-3">
          <Text className="text-xl font-semibold">Ringkasan Hari Ini</Text>

          <View className="flex-row gap-4">
            <View className="flex-1 bg-white p-4 rounded-lg flex-col gap-2">
              <Text className="text-gray-500">Total Penjualan</Text>
              <Text className="text-xl font-semibold">Rp. 12.000</Text>
            </View>

            <View className="flex-1 bg-white p-4 rounded-lg flex-col gap-2">
              <Text className="text-gray-500">Total Transaksi</Text>
              <Text className="text-xl font-semibold">Rp. 12.000</Text>
            </View>
          </View>
        </View>

        <View className="bg-white rounded-lg p-4 flex-col gap-4 mt-4">
          <Text className="text-gray-500">Produk Paling Laris Hari Ini</Text>
          {products.map((product) => (
            <View
              key={product.id}
              className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center gap-4">
                <Image
                  source={require("@/assets/images/produk.png")}
                  className="w-20 h-20 rounded-md"
                  resizeMode="cover"
                />
                <View className="flex-col gap-1">
                  <Text className="text-xl">{product.name}</Text>
                  <Text className="text-gray-500 text-sm">
                    Terjual {product.sold}
                  </Text>
                </View>
              </View>
              <Text className="">{product.price}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
