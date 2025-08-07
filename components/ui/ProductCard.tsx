import React from "react";
import { View, Text, Image, ImageSourcePropType, TouchableOpacity } from "react-native";

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
  cardWidth,
  onPress,
}) => {
  // Calculate image height based on card width (maintaining aspect ratio)
  const imageHeight = cardWidth ? cardWidth * 0.75 : 100; // 3:4 aspect ratio

  return (
    <TouchableOpacity 
      onPress={onPress}
      disabled={outOfStock}
      className="bg-white rounded-lg overflow-hidden shadow-sm mb-3"
      activeOpacity={0.7}
    >
      {image ? (
        <Image
          source={image}
          resizeMode="cover"
          style={{
            width: '100%',
            height: imageHeight,
          }}
        />
      ) : (
        <View 
          className="bg-gray-100 justify-center items-center"
          style={{
            width: '100%',
            height: imageHeight,
          }}
        >
          <Text 
            className="font-bold text-red-800"
            style={{
              fontSize: cardWidth ? cardWidth * 0.2 : 24, // Font size relative to card width
            }}
          >
            {initials}
          </Text>
        </View>
      )}

      {outOfStock && (
        <View className="absolute inset-0 bg-black/40 justify-center items-center">
          <Text 
            className="text-white font-semibold"
            style={{
              fontSize: cardWidth ? cardWidth * 0.1 : 12,
            }}
          >
            Stok Habis
          </Text>
        </View>
      )}

      <View className="p-4">
        <Text 
          className="text-center font-semibold text-gray-800"
          style={{
            fontSize: cardWidth ? Math.max(cardWidth * 0.11, 12) : 14,
          }}
          numberOfLines={2}
        >
          {name}
        </Text>
        <Text 
          className="text-center text-gray-500 mt-1"
          style={{
            fontSize: cardWidth ? Math.max(cardWidth * 0.09, 10) : 12,
          }}
        >
          Rp {price}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default ProductCard;