import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  StatusBar,
  Switch,
  StyleSheet,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import QuantitySelector from "./QuantitySelector";

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
  sizeOptions?: Option[];
  sugarOptions?: Option[];
  toppingOptions?: Option[];
  isVisible: boolean;
  onClose: () => void;
  onSave?: (modifications: any) => void;
}

const OptionSection = ({
  title,
  note,
  options,
  selected,
  setSelected,
  multiple = false,
  toggleMultiple,
}: {
  title: string;
  note: string;
  options: Option[];
  selected: string | string[];
  setSelected?: (val: string) => void;
  multiple?: boolean;
  toggleMultiple?: (val: string) => void;
}) => {
  if (!options.length) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text
          style={
            note.includes("Wajib")
              ? styles.sectionRequired
              : styles.sectionOptional
          }>
          {note}
        </Text>
      </View>
      {options.map((opt, idx) => {
        const isSelected = multiple
          ? (selected as string[]).includes(opt.name)
          : selected === opt.name;
        return (
          <TouchableOpacity
            key={opt.name}
            onPress={() =>
              multiple
                ? toggleMultiple && toggleMultiple(opt.name)
                : setSelected && setSelected(opt.name)
            }
            style={[
              styles.optionRow,
              idx < options.length - 1 && styles.optionBorder,
            ]}>
            <View style={styles.optionLeft}>
              {multiple ? (
                <View
                  style={[
                    styles.checkbox,
                    isSelected && styles.checkboxSelected,
                  ]}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={12} color="white" />
                  )}
                </View>
              ) : (
                <View
                  style={[
                    styles.radioOuter,
                    isSelected && styles.radioOuterSelected,
                  ]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              )}
              <Text style={styles.optionLabel}>{opt.name}</Text>
            </View>
            <Text style={styles.optionPrice}>
              {opt.price === 0 ? "+0" : `+${opt.price.toLocaleString()}`}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const ProductModification: React.FC<ProductModificationProps> = ({
  productName,
  productPrice,
  originalPrice,
  discount,
  productImage,
  sizeOptions = [],
  sugarOptions = [],
  toppingOptions = [],
  isVisible,
  onClose,
  onSave,
}) => {
  const insets = useSafeAreaInsets();

  const [selectedSize, setSelectedSize] = useState(sizeOptions[0]?.name || "");
  const [selectedSugar, setSelectedSugar] = useState(
    sugarOptions[0]?.name || ""
  );
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isTakeaway, setIsTakeaway] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotesInput, setShowNotesInput] = useState(false);

  const toggleTopping = (topping: string) => {
    setSelectedToppings((prev) =>
      prev.includes(topping)
        ? prev.filter((t) => t !== topping)
        : prev.length < 3
        ? [...prev, topping]
        : prev
    );
  };

  const calculateTotal = () => {
    let total = parseInt(productPrice.replace(/\./g, "")) || 0;
    const findPrice = (opts: Option[], name: string) =>
      opts.find((o) => o.name === name)?.price || 0;

    total += findPrice(sizeOptions, selectedSize);
    total += findPrice(sugarOptions, selectedSugar);
    total += selectedToppings.reduce(
      (sum, t) => sum + findPrice(toppingOptions, t),
      0
    );

    return total * quantity;
  };

  const handleSave = () => {
    const modifications = {
      size: selectedSize,
      sugar: selectedSugar,
      toppings: selectedToppings,
      quantity,
      total: calculateTotal(),
      takeaway: isTakeaway,
      notes: notes.trim(),
    };

    onSave?.(modifications);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <SafeAreaProvider>
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerBack}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Modifikasi Item</Text>
          </View>

          <ScrollView style={styles.scrollArea}>
            {/* Product Info */}
            <View style={styles.productCard}>
              <View style={styles.productRow}>
                <Image
                  source={productImage}
                  style={styles.productImage}
                  resizeMode="cover"
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{productName}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.productPrice}>Rp {productPrice}</Text>
                    {originalPrice && (
                      <Text style={styles.originalPrice}>{originalPrice}</Text>
                    )}
                    {discount && (
                      <Text style={styles.discount}>{discount}</Text>
                    )}
                  </View>

                  {/* Enhanced Takeaway/Dine In Section */}
                  <View style={styles.serviceTypeContainer}>
                    <Text style={styles.serviceTypeTitle}>Jenis Pesanan</Text>
                    <View style={styles.serviceTypeOptions}>
                      <TouchableOpacity
                        style={[
                          styles.serviceTypeButton,
                          !isTakeaway && styles.serviceTypeButtonActive,
                        ]}
                        onPress={() => setIsTakeaway(false)}>
                        <Ionicons
                          name="restaurant-outline"
                          size={16}
                          color={!isTakeaway ? "#DC2626" : "#6B7280"}
                        />
                        <Text
                          style={[
                            styles.serviceTypeText,
                            !isTakeaway && styles.serviceTypeTextActive,
                          ]}>
                          Dine In
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.serviceTypeButton,
                          isTakeaway && styles.serviceTypeButtonActive,
                        ]}
                        onPress={() => setIsTakeaway(true)}>
                        <Ionicons
                          name="bag-outline"
                          size={16}
                          color={isTakeaway ? "#DC2626" : "#6B7280"}
                        />
                        <Text
                          style={[
                            styles.serviceTypeText,
                            isTakeaway && styles.serviceTypeTextActive,
                          ]}>
                          Takeaway
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {/* Notes Section */}
              <TouchableOpacity
                style={styles.notesBox}
                onPress={() => setShowNotesInput(!showNotesInput)}>
                <Ionicons name="create-outline" size={16} color="#9CA3AF" />
                <Text style={styles.notesText}>
                  {notes ? notes : "Tambahkan catatan khusus"}
                </Text>
                <Ionicons
                  name={showNotesInput ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#9CA3AF"
                />
              </TouchableOpacity>

              {showNotesInput && (
                <View style={styles.notesInputContainer}>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Contoh: Pedas level 3, tanpa bawang, dll."
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  <View style={styles.notesActions}>
                    <TouchableOpacity
                      style={styles.notesClearButton}
                      onPress={() => setNotes("")}>
                      <Text style={styles.notesClearText}>Hapus</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.notesOkButton}
                      onPress={() => setShowNotesInput(false)}>
                      <Text style={styles.notesOkText}>OK</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Sections */}
            <OptionSection
              title="Ukuran Cup"
              note="- Wajib (Pilih 1)"
              options={sizeOptions}
              selected={selectedSize}
              setSelected={setSelectedSize}
            />
            <OptionSection
              title="Takaran Gula"
              note="- Wajib (Pilih 1)"
              options={sugarOptions}
              selected={selectedSugar}
              setSelected={setSelectedSugar}
            />
            <OptionSection
              title="Topping"
              note="- Opsional (Max 3)"
              options={toppingOptions}
              selected={selectedToppings}
              multiple
              toggleMultiple={toggleTopping}
            />
          </ScrollView>

          {/* Footer */}
          <View
            style={[
              styles.footerContainer,
            ]}>
            <View style={styles.flexItem}>
              <QuantitySelector value={quantity} onChange={setQuantity} />
            </View>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveButton, styles.flexItem]}
              activeOpacity={0.8}>
              <Ionicons name="bag" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? 50 : 12,
  },
  headerBack: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  scrollArea: { flex: 1 },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  productRow: { flexDirection: "row", alignItems: "flex-start" },
  productImage: { width: 80, height: 80, borderRadius: 6 },
  productInfo: { flex: 1, marginLeft: 12 },
  productName: { fontSize: 18, fontWeight: "600", color: "#1F2937" },
  priceRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  productPrice: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  originalPrice: {
    fontSize: 14,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    marginLeft: 8,
  },
  discount: { fontSize: 14, color: "#DC2626", marginLeft: 8 },

  // Service Type Section
  serviceTypeContainer: { marginTop: 12 },
  serviceTypeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  serviceTypeOptions: {
    flexDirection: "row",
    gap: 8,
  },
  serviceTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    flex: 1,
    justifyContent: "center",
  },
  serviceTypeButtonActive: {
    borderColor: "#DC2626",
    backgroundColor: "#FEE2E2",
  },
  serviceTypeText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  serviceTypeTextActive: {
    color: "#DC2626",
    fontWeight: "600",
  },

  // Notes Section
  notesBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 16,
  },
  notesText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
    color: "#6B7280",
  },
  notesInputContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F9FAFB",
  },
  notesInput: {
    fontSize: 14,
    color: "#374151",
    minHeight: 60,
    textAlignVertical: "top",
  },
  notesActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  notesClearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  notesClearText: {
    fontSize: 14,
    color: "#6B7280",
  },
  notesOkButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#DC2626",
  },
  notesOkText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  section: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sectionTitle: { fontSize: 16, fontWeight: "600" },
  sectionRequired: { color: "#DC2626", marginLeft: 8 },
  sectionOptional: { color: "#6B7280", marginLeft: 8 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  optionLeft: { flexDirection: "row", alignItems: "center" },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioOuterSelected: { borderColor: "#DC2626", backgroundColor: "#DC2626" },
  radioInner: {
    width: 8,
    height: 8,
    backgroundColor: "white",
    borderRadius: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkboxSelected: { borderColor: "#DC2626", backgroundColor: "#DC2626" },
  optionLabel: { color: "#1F2937" },
  optionPrice: { color: "#4B5563" },
  footerContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    gap: 16,
    paddingBottom: Platform.OS === "android" ? 50 : 12,
  },
  flexItem: { flex: 1 },
  saveButton: {
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
});

export default ProductModification;
