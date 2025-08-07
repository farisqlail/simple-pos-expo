import React, { useState } from "react";
import { Dimensions, ScrollView, View } from "react-native";

import Header from "@/components/ui/Header";
import Input from "@/components/ui/Input";
import ProductCard from "@/components/ui/ProductCard";
import ProductModification from "@/components/ui/ProductModification";
import productImg from "@/assets/images/produk.png";

import { Ionicons } from "@expo/vector-icons";

const TransactionScreen = () => {
  const [showModification, setShowModification] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const screenWidth = Dimensions.get("window").width;
  const numColumns = 3;
  const horizontalPadding = 16; // padding on left and right
  const gap = 8; // gap between items
  const itemWidth = (screenWidth - horizontalPadding * 2 - gap * (numColumns - 1)) / numColumns;

  const productData = [
    { name: "Coffee Latte", price: "25.000", originalPrice: "30.000", discount: "-5%", image: productImg },
    { name: "Matcha Latte", price: "25.000", image: productImg },
    { name: "Red Velvet Latte", price: "30.000", image: productImg },
    { name: "Cappuccino", price: "30.000", image: null, initials: "CL" },
    { name: "Espresso", price: "20.000", image: productImg },
    { name: "Mocha", price: "35.000", image: productImg },
    { name: "Cappuccino", price: "35.000", image: productImg },
    { name: "Latte", price: "32.000", image: null, initials: "L" },
    { name: "Americano", price: "25.000", image: productImg, outOfStock: true },
  ];

  const handleProductPress = (product) => {
    if (!product.outOfStock) {
      setSelectedProduct(product);
      setShowModification(true);
    }
  };

  const handleSaveModification = (modifications) => {
    console.log("Product modifications:", modifications);
    // Here you can handle saving the modifications to your cart/order
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
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: gap,
            }}
          >
            {productData.map((item, index) => (
              <View
                key={index}
                style={{
                  width: itemWidth,
                }}
              >
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
        isVisible={showModification}
        onClose={() => setShowModification(false)}
        onSave={handleSaveModification}
      />
    </>
  );
};

export default TransactionScreen;