import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ImageSourcePropType,
  Modal,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QuantitySelector from "./QuantitySelector";

interface ProductModificationProps {
  productName: string;
  productPrice: string;
  originalPrice?: string;
  discount?: string;
  productImage: ImageSourcePropType;
  isVisible: boolean;
  onClose: () => void;
  onSave?: (modifications: any) => void;
}

const ProductModification: React.FC<ProductModificationProps> = ({
  productName,
  productPrice,
  originalPrice,
  discount,
  productImage,
  isVisible,
  onClose,
  onSave,
}) => {
  const [selectedSize, setSelectedSize] = useState("Small");
  const [selectedSugar, setSelectedSugar] = useState("Normal");
  const [selectedToppings, setSelectedToppings] = useState<string[]>(["Boba"]);
  const [quantity, setQuantity] = useState(1);
  const [isTakeaway, setIsTakeaway] = useState(true);

  const sizeOptions = [
    { name: "Small", price: 0 },
    { name: "Medium", price: 3000 },
    { name: "Large", price: 5000 },
  ];

  const sugarOptions = [
    { name: "Less", price: 0 },
    { name: "Normal", price: 0 },
    { name: "Extra", price: 5000 },
  ];

  const toppingOptions = [
    { name: "Boba", price: 5000 },
    { name: "Coffee Jelly", price: 4500 },
    { name: "Grass Jelly", price: 6000 },
    { name: "Cheese Cream", price: 2000 },
    { name: "Fruit smoothie", price: 4750 },
  ];

  const toggleTopping = (topping: string) => {
    if (selectedToppings.includes(topping)) {
      setSelectedToppings(selectedToppings.filter((t) => t !== topping));
    } else {
      if (selectedToppings.length < 3) {
        setSelectedToppings([...selectedToppings, topping]);
      }
    }
  };

  const calculateTotal = () => {
    let total = parseInt(productPrice.replace(/\./g, ""));

    const sizePrice =
      sizeOptions.find((s) => s.name === selectedSize)?.price || 0;
    const sugarPrice =
      sugarOptions.find((s) => s.name === selectedSugar)?.price || 0;
    const toppingsPrice = selectedToppings.reduce((sum, topping) => {
      return sum + (toppingOptions.find((t) => t.name === topping)?.price || 0);
    }, 0);

    total += sizePrice + sugarPrice + toppingsPrice;
    return total * quantity;
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center p-4 border-b border-gray-200">
          <TouchableOpacity onPress={onClose} className="mr-3">
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold">Modifikasi Item</Text>
        </View>

        <ScrollView className="flex-1">
          {/* Product Info */}
          <View className="flex-row p-4 border-b border-gray-100">
            <Image
              source={productImage}
              className="w-16 h-16 rounded-lg mr-4"
              resizeMode="cover"
            />
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-800">
                {productName}
              </Text>
              <View className="flex-row items-center mt-1">
                <Text className="text-lg font-bold text-gray-800">
                  Rp {productPrice}
                </Text>
                {originalPrice && (
                  <Text className="text-sm text-gray-400 line-through ml-2">
                    {originalPrice}
                  </Text>
                )}
                {discount && (
                  <Text className="text-sm text-red-500 ml-2">{discount}</Text>
                )}
              </View>
              <View className="flex-row items-center mt-2">
                <View
                  className={`w-4 h-4 rounded ${
                    isTakeaway
                      ? "bg-gray-300"
                      : "bg-transparent border border-gray-300"
                  } mr-2`}
                />
                <Text className="text-gray-600">Takeaway</Text>
              </View>
            </View>
          </View>

          {/* Notes */}
          <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
            <View className="mr-3">
              <Ionicons name="create-outline" size={20} color="#ccc" />
            </View>
            <Text className="text-gray-400">Catatan</Text>
          </TouchableOpacity>

          {/* Cup Size */}
          <View className="p-4 border-b border-gray-100">
            <View className="flex-row items-center mb-3">
              <Text className="text-base font-semibold">Ukuran Cup</Text>
              <Text className="text-red-500 ml-2">- Wajib (Pilih 1)</Text>
            </View>
            {sizeOptions.map((size) => (
              <TouchableOpacity
                key={size.name}
                onPress={() => setSelectedSize(size.name)}
                className="flex-row items-center justify-between py-3"
              >
                <View className="flex-row items-center">
                  <View
                    className={`w-5 h-5 rounded-full border-2 mr-3 ${
                      selectedSize === size.name
                        ? "border-red-500 bg-red-500"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedSize === size.name && (
                      <View className="w-2 h-2 bg-white rounded-full m-auto" />
                    )}
                  </View>
                  <Text className="text-gray-800">{size.name}</Text>
                </View>
                <Text className="text-gray-600">
                  {size.price === 0 ? "+0" : `+${size.price.toLocaleString()}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sugar Level */}
          <View className="p-4 border-b border-gray-100">
            <View className="flex-row items-center mb-3">
              <Text className="text-base font-semibold">Takaran Gula</Text>
              <Text className="text-red-500 ml-2">- Wajib (Pilih 1)</Text>
            </View>
            {sugarOptions.map((sugar) => (
              <TouchableOpacity
                key={sugar.name}
                onPress={() => setSelectedSugar(sugar.name)}
                className="flex-row items-center justify-between py-3"
              >
                <View className="flex-row items-center">
                  <View
                    className={`w-5 h-5 rounded-full border-2 mr-3 ${
                      selectedSugar === sugar.name
                        ? "border-red-500 bg-red-500"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedSugar === sugar.name && (
                      <View className="w-2 h-2 bg-white rounded-full m-auto" />
                    )}
                  </View>
                  <Text className="text-gray-800">{sugar.name}</Text>
                </View>
                <Text className="text-gray-600">
                  {sugar.price === 0
                    ? "+0"
                    : `+${sugar.price.toLocaleString()}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Toppings */}
          <View className="p-4 border-b border-gray-100">
            <View className="flex-row items-center mb-3">
              <Text className="text-base font-semibold">Topping</Text>
              <Text className="text-gray-500 ml-2">- Opsional (Max 3)</Text>
            </View>
            {toppingOptions.map((topping) => (
              <TouchableOpacity
                key={topping.name}
                onPress={() => toggleTopping(topping.name)}
                className="flex-row items-center justify-between py-3"
              >
                <View className="flex-row items-center">
                  <View
                    className={`w-5 h-5 border-2 mr-3 ${
                      selectedToppings.includes(topping.name)
                        ? "border-red-500 bg-red-500"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedToppings.includes(topping.name) && (
                      <Ionicons name="checkmark" size={12} color="white" />
                    )}
                  </View>
                  <Text className="text-gray-800">{topping.name}</Text>
                </View>
                <Text className="text-gray-600">
                  +{topping.price.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Action */}
        <View className="p-4 border-t border-gray-200 bg-white">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-2">
              <QuantitySelector value={quantity} onChange={setQuantity} />
            </View>

            <TouchableOpacity
              onPress={() => {
                onSave?.({
                  size: selectedSize,
                  sugar: selectedSugar,
                  toppings: selectedToppings,
                  quantity,
                  total: calculateTotal(),
                });
                onClose();
              }}
              className="bg-red-600 p-4 rounded-lg flex-1 flex-row gap-2 items-center justify-center"
            >
              <Ionicons name="bag" size={20} color="white" className="mr-2" />
              <Text className="text-white font-semibold text-lg">Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ProductModification;
