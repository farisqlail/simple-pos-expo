import React from "react";
import {
  View,
  Text,
  Image,
  ImageSourcePropType,
  TouchableOpacity,
} from "react-native";

interface ProductCardProps {
  name: string;
  price: string;
  image?: ImageSourcePropType | null;
  initials?: string;
  outOfStock?: boolean;
  cardWidth?: number;
  onPress?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  name,
  price,
  image,
  initials,
  outOfStock = false,
  cardWidth = 110, // default lebar
  onPress,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={outOfStock}
      style={{
        width: cardWidth,
        height: 180, // tinggi fix semua card
        backgroundColor: "#fff",
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
      }}
      activeOpacity={0.7}>
      {/* Bagian Gambar */}
      <View style={{ flex: 1, position: "relative" }}>
        {image ? (
          <Image
            source={image}
            resizeMode="cover"
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        ) : (
          <View
            style={{
              flex: 1,
              backgroundColor: "#f3f3f3",
              alignItems: "center",
              justifyContent: "center",
            }}>
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 20,
                color: "#7f1d1d",
              }}>
              {initials}
            </Text>
          </View>
        )}

        {outOfStock && (
          <View
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
              alignItems: "center",
              justifyContent: "center",
            }}>
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 12 }}>
              Stok Habis
            </Text>
          </View>
        )}
      </View>

      {/* Bagian Teks */}
      <View style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
        <Text
          style={{
            fontWeight: "600",
            fontSize: 12,
            textAlign: "center",
            color: "#1f2937",
          }}
          numberOfLines={1}>
          {name}
        </Text>
        <Text
          style={{
            fontSize: 11,
            textAlign: "center",
            color: "#6b7280",
            marginTop: 2,
          }}>
          Rp {price}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default ProductCard;
