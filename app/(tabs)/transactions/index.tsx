import React, { useState } from "react";
import { Dimensions, ScrollView, View } from "react-native";

import Header from "@/components/ui/Header";
import Input from "@/components/ui/Input";
import ProductCard from "@/components/ui/ProductCard";
import ProductModification from "@/components/ui/ProductModification";
import productImg from "@/assets/images/produk.png";

import { Ionicons } from "@expo/vector-icons";
import FloatingCartSummary from "@/components/ui/FloatingCartSummary";
interface Option {
  name: string;
  price: number;
}

interface ProductModificationProps {
  productName: string;
  productPrice: string;
  originalPrice?: string;
  discount?: string;
  productImage: any;
  sizeOptions: Option[];
  sugarOptions: Option[];
  toppingOptions: Option[];
  isVisible: boolean;
  onClose: () => void;
  onSave?: (modifications: {
    size: string;
    sugar: string;
    toppings: string[];
    quantity: number;
    total: number;
  }) => void;
}

interface Modification {
  name: string;
  value: string | number;
}

const TransactionScreen = () => {
  const [showModification, setShowModification] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const screenWidth = Dimensions.get("window").width;
  const numColumns = 3;
  const horizontalPadding = 16; // padding on left and right
  const gap = 8; // gap between items
  const itemWidth =
    (screenWidth - horizontalPadding * 2 - gap * (numColumns - 1)) / numColumns;

  const productData: Product[] = [
    {
      name: "Coffee Latte",
      price: "25.000",
      originalPrice: "30.000",
      discount: "-5%",
      image: productImg,
      sizeOptions: [
        { name: "Small", price: 0 },
        { name: "Medium", price: 3000 },
        { name: "Large", price: 5000 },
      ],
      sugarOptions: [
        { name: "Less", price: 0 },
        { name: "Normal", price: 0 },
        { name: "Extra", price: 5000 },
      ],
      toppingOptions: [
        { name: "Boba", price: 5000 },
        { name: "Coffee Jelly", price: 4500 },
        { name: "Grass Jelly", price: 6000 },
        { name: "Cheese Cream", price: 2000 },
        { name: "Fruit smoothie", price: 4750 },
      ],
    },
    {
      name: "Matcha Latte",
      price: "25.000",
      originalPrice: "28.000",
      discount: "-10%",
      image: productImg,
      sizeOptions: [
        { name: "Small", price: 0 },
        { name: "Medium", price: 3000 },
        { name: "Large", price: 5000 },
      ],
      sugarOptions: [
        { name: "Less", price: 0 },
        { name: "Normal", price: 0 },
        { name: "Extra", price: 5000 },
      ],
      toppingOptions: [
        { name: "Boba", price: 5000 },
        { name: "Coffee Jelly", price: 4500 },
        { name: "Grass Jelly", price: 6000 },
        { name: "Cheese Cream", price: 2000 },
        { name: "Fruit smoothie", price: 4750 },
      ],
    },
    {
      name: "Red Velvet Latte",
      price: "30.000",
      image: productImg,
      sizeOptions: [
        { name: "Small", price: 0 },
        { name: "Medium", price: 3000 },
        { name: "Large", price: 5000 },
      ],
      sugarOptions: [
        { name: "Less", price: 0 },
        { name: "Normal", price: 0 },
        { name: "Extra", price: 5000 },
      ],
      toppingOptions: [
        { name: "Boba", price: 5000 },
        { name: "Coffee Jelly", price: 4500 },
        { name: "Grass Jelly", price: 6000 },
        { name: "Cheese Cream", price: 2000 },
        { name: "Fruit smoothie", price: 4750 },
      ],
    },
    {
      name: "Cappuccino",
      price: "30.000",
      image: null,
      initials: "CL",
    },
    {
      name: "Espresso",
      price: "20.000",
      originalPrice: "22.000",
      discount: "-9%",
      image: productImg,
    },
    {
      name: "Mocha",
      price: "35.000",
      image: productImg,
    },
    {
      name: "Cappuccino",
      price: "35.000",
      image: productImg,
    },
    {
      name: "Latte",
      price: "32.000",
      image: null,
      initials: "L",
    },
    {
      name: "Americano",
      price: "25.000",
      image: productImg,
      outOfStock: true,
    },
  ];

  const handleProductPress = (product: Product) => {
    if (!product.outOfStock) {
      setSelectedProduct(product);
      setShowModification(true);
    }
  };

  const handleSaveModification = (modifications: Modification[]) => {
    console.log("Product modifications:", modifications);
  };

  return (
    <>
      <ScrollView className="bg-gray-100 flex-1">
        <Header title="Transaksi Baru" showBackButton={false} />

        <View className="p-4">
          <Input
            placeholder="Cari Produk...."
            icon={<Ionicons name="search" size={20} color="#6b7280" />}
          />

          <View
            className="mt-4"
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: gap,
            }}>
            {productData.map((item, index) => (
              <View
                key={index}
                style={{
                  width: itemWidth,
                }}>
                <ProductCard
                  name={item.name}
                  price={item.price}
                  image={item.image}
                  initials={item.initials}
                  outOfStock={item.outOfStock}
                  cardWidth={itemWidth}
                  onPress={() => handleProductPress(item)}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Product Modification Modal */}
      <ProductModification
        productName={selectedProduct?.name || ""}
        productPrice={selectedProduct?.price || ""}
        originalPrice={selectedProduct?.originalPrice}
        discount={selectedProduct?.discount}
        productImage={selectedProduct?.image || productImg}
        sizeOptions={selectedProduct?.sizeOptions || []}
        sugarOptions={selectedProduct?.sugarOptions || []}
        toppingOptions={selectedProduct?.toppingOptions || []}
        isVisible={showModification}
        onClose={() => setShowModification(false)}
        onSave={handleSaveModification}
      />

      <FloatingCartSummary
        itemCount={8}
        totalPrice={400000}
        onCancel={() => console.log("Batalkan pressed")}
        onPay={() => console.log("Bayar pressed")}
      />
    </>
  );
};

export default TransactionScreen;
