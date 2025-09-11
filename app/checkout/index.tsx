// app/checkout/index.tsx
import React, { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import Constants from "expo-constants";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import Header from "@/components/ui/Header";
import BottomBar from "@/components/ui/BottomBar";
import { useCartStore } from "@/lib/store/useCartStore";
import { createResource } from "@/lib/api/fetch";

const formatCurrency = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

// Komponen untuk menampilkan badge
const Badge = ({
  label,
  type = "default",
}: {
  label: string;
  type?: "takeaway" | "dinein" | "default";
}) => {
  const getBadgeStyle = () => {
    switch (type) {
      case "takeaway":
        return { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" };
      case "dinein":
        return { backgroundColor: "#DBEAFE", borderColor: "#3B82F6" };
      default:
        return { backgroundColor: "#FEE2E2", borderColor: "#F87171" };
    }
  };

  const getBadgeTextStyle = () => {
    switch (type) {
      case "takeaway":
        return { color: "#D97706" };
      case "dinein":
        return { color: "#1D4ED8" };
      default:
        return { color: "#DC2626" };
    }
  };

  return (
    <View style={[styles.badge, getBadgeStyle()]}>
      <Text style={[styles.badgeText, getBadgeTextStyle()]}>{label}</Text>
    </View>
  );
};

// Komponen untuk item detail
const ItemDetail = ({ item }: { item: any }) => {
  const unitTotal = item.unitBasePrice + item.unitAddonsPrice;
  const lineTotal = unitTotal * item.quantity;
  const orderType = item.note?.takeaway ? "takeaway" : "dinein";
  const orderTypeLabel = item.note?.takeaway ? "Takeaway" : "Dine In";

  return (
    <View style={styles.itemContainer}>
      {/* Header with name and badges */}
      <View style={styles.itemHeader}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.badgesContainer}>
          <Badge label={orderTypeLabel} type={orderType} />
          {item.note?.toppings?.length > 0 && (
            <Badge label={`+${item.note.toppings.length} Topping`} />
          )}
        </View>
      </View>

      {/* Quantity and price */}
      <View style={styles.itemMeta}>
        <Text style={styles.itemQuantity}>
          {item.quantity}x @ {formatCurrency(unitTotal)}
        </Text>
        <Text style={styles.itemTotal}>{formatCurrency(lineTotal)}</Text>
      </View>

      {/* Details row */}
      <View style={styles.itemDetailsRow}>
        {item.note?.size && (
          <Text style={styles.itemDetail}>
            <Text style={styles.detailLabel}>Ukuran: </Text>
            <Text style={styles.detailValue}>{item.note.size}</Text>
          </Text>
        )}
        {item.note?.sugar && (
          <Text style={[styles.itemDetail, { marginLeft: 12 }]}>
            <Text style={styles.detailLabel}>Gula: </Text>
            <Text style={styles.detailValue}>{item.note.sugar}</Text>
          </Text>
        )}
      </View>

      {/* Toppings */}
      {item.note?.toppings?.length > 0 && (
        <View style={styles.toppingsSection}>
          <Text style={styles.detailLabel}>Topping: </Text>
          <View style={styles.toppingsContainer}>
            {item.note.toppings.map((topping: string, index: number) => (
              <View key={index} style={styles.toppingChip}>
                <Text style={styles.toppingText}>{topping}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Notes */}
      {item.note?.message && (
        <View style={styles.noteContainer}>
          <Text style={styles.noteLabel}>Catatan:</Text>
          <Text style={styles.noteText}>"{item.note.message}"</Text>
        </View>
      )}
    </View>
  );
};

const Checkout = () => {
  const router = useRouter();
  const items = useCartStore((s) => s.items);

  const { subtotal, itemCount } = useMemo(() => {
    let sub = 0,
      count = 0;
    for (const it of items) {
      const unit = it.unitBasePrice + it.unitAddonsPrice;
      sub += unit * it.quantity;
      count += it.quantity;
    }
    return { subtotal: sub, itemCount: count };
  }, [items]);

  const servicePercent = 10;
  const service = Math.round((subtotal * servicePercent) / 100);
  const adminFee = 0;
  const totalBayar = subtotal + service + adminFee;

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  // Hitung opsi uang sekali (depend on totalBayar)
  const moneyOptions = useMemo(() => {
    const pecahan = [1000, 2000, 5000, 10000, 20000, 50000, 100000];
    const list: number[] = [totalBayar + 1000]; // "uang pas" default
    pecahan.forEach((p) => {
      const kelipatan = Math.ceil(totalBayar / p) * p;
      if (!list.includes(kelipatan)) list.push(kelipatan);
    });
    return list.sort((a, b) => a - b);
  }, [totalBayar]);

  const onSubmit = async () => {
    try {
      if (!items.length) {
        Alert.alert("Keranjang kosong", "Tambahkan item terlebih dulu.");
        return;
      }

      if (!selectedAmount || selectedAmount < totalBayar) {
        Alert.alert(
          "Nominal kurang",
          "Masukkan nominal yang cukup untuk membayar."
        );
        return;
      }

      const [rawUser, rawLoc, rawToken] = await Promise.all([
        AsyncStorage.getItem("auth_user"),
        AsyncStorage.getItem("selected_location"),
        AsyncStorage.getItem("auth_token"),
      ]);

      const user = rawUser ? JSON.parse(rawUser) : null;
      const loc = rawLoc ? JSON.parse(rawLoc) : null;
      const token = rawToken ?? "";

      const appid: string = user?.appid;
      const location_id: number = loc?.loc_id ?? 3365;
      const location_code: string = loc?.loc_code ?? "C05";
      const created_by: number = user?.userid ?? 2018;
      const today = new Date().toISOString().slice(0, 10);

      const product_list = items.map((it, idx) => {
        const unit = it.unitBasePrice + it.unitAddonsPrice;

        // Compile note dengan semua informasi
        let noteDetails = [];
        if (it.note?.size) noteDetails.push(`Ukuran: ${it.note.size}`);
        if (it.note?.sugar) noteDetails.push(`Gula: ${it.note.sugar}`);
        if (it.note?.toppings?.length) {
          noteDetails.push(`Topping: ${it.note.toppings.join(", ")}`);
        }
        if (it.note?.message) noteDetails.push(`Catatan: ${it.note.message}`);

        const compiledNote = noteDetails.join(" | ");

        return {
          indx: idx + 1,
          prod_id: String(it.prodId),
          prod_name: it.name,
          prod_price: it.unitBasePrice,
          prod_disc: "",
          prod_qty: it.quantity,
          prod_total: unit * it.quantity,
          prod_note: compiledNote,
          modifiers: [],
          is_takeaway: !!it.note?.takeaway,
          discount_tag: 0,
          discount_tag_value: 0,
          package_modifier: [],
          product_package_content: null,
        };
      });

      const payAmount = selectedAmount;
      const changeAmount = Math.max(payAmount - totalBayar, 0);

      const payload = {
        appid,
        nota: [],
        location_id,
        location_code,
        created_by,
        description: "",
        hl_eta_time: "now",
        qren_merchant_id: "125193375",
        hl_takeaway: 0,
        customer_details: {
          cust_id: 17102593463615356,
          cust_name: "Guest",
          cust_phone: "",
          cust_email: "",
        },
        payment_details: {
          stotal: subtotal,
          gtotal: totalBayar,
          rounding_nominal: 0,
          discount_amount: 0,
          discount_name: "",
          tax: 0,
          tax_id: 0,
          tax_name: null,
          tax_percent: null,
          tax_type: null,
          tax_setting: null,
          service,
          service_id: 262899,
          service_name: "Service Charger (%)",
          service_percent: servicePercent,
          service_type: "%",
          service_setting: "(subtotal-disc)",
          is_show_admin_fee: "0",
          admin_fee_type: "idr",
          admin_fee: adminFee,
          admin_fee_percentage: 0,
          revenue_share_cust: "50.00",
          pay_amount: payAmount,
          change_amount: changeAmount,
          payment_date: today,
          payment_id: 19,
          payment_method: "cash",
          void_by: "",
          void_note: "",
        },
        product_list,
        loc_print_checker: "1",
        loc_printer_bill_ipaddress: "192.168.103.100",
        loc_printer_bill_type: "bluetooth",
        loc_printer_bluetooth_paper_size: 58,
        device_info: {
          device: "android",
          device_android_version: "11",
          device_mac_address: "-",
          device_model: "Nokia 5.3",
          device_name: "HMD Global",
          device_os_name: "R",
          devicenewdate: today,
          email: user?.email ?? "",
          is_logout: false,
          key: "anb72794778AHAS2907f44",
          location_id,
          version_code: "mp lite 1.0.0",
        },
      };

      const resp = await createResource<any>(
        "transaction/create",
        payload,
        token
      );

      await AsyncStorage.setItem("tx:last_response", JSON.stringify(resp));
      router.replace({
        pathname: "/receipt",
        params: { ts: String(Date.now()) },
      });
    } catch (e: any) {
      console.log("Create transaction error:", e);
      Alert.alert("Gagal", e?.message ?? "Gagal membuat transaksi.");
    }
  };

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
        <Header
          title="Struk Transaksi"
          showBackButton
          textColor="text-white"
          backIconColor="#fff"
        />

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={[styles.card, { marginTop: 16 }]}>
            <Text style={styles.sectionTitle}>PILIH METODE PEMBAYARAN</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="card-outline" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="Masukkan nominal"
                value={selectedAmount ? String(selectedAmount) : ""}
                onChangeText={(val) => {
                  const digits = val.replace(/[^\d]/g, "");
                  setSelectedAmount(digits ? Number(digits) : null);
                }}
              />
            </View>

            <View style={styles.moneyButtons}>
              {moneyOptions.map((amount, i) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.moneyButton,
                    selectedAmount === amount && styles.moneyButtonActive,
                  ]}
                  onPress={() => setSelectedAmount(amount)}>
                  <Text
                    style={[
                      styles.moneyButtonText,
                      selectedAmount === amount && styles.moneyButtonTextActive,
                    ]}>
                    {i === 0 ? "Uang Pas" : amount.toLocaleString("id-ID")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.card, {marginTop: 16, marginBottom: 150}]}>
            <Text style={styles.sectionTitle}>RINGKASAN BELANJA</Text>

            {items.map((it) => (
              <ItemDetail key={it.id} item={it} />
            ))}

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text>Subtotal</Text>
              <Text>{formatCurrency(subtotal)}</Text>
            </View>

            <View style={styles.row}>
              <Text>Service (10%)</Text>
              <Text style={{ color: "red" }}>+ {formatCurrency(service)}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.bold}>Total Bayar</Text>
              <Text style={styles.bold}>{formatCurrency(totalBayar)}</Text>
            </View>
          </View>
        </ScrollView>

        <BottomBar
          itemCount={itemCount}
          total={totalBayar}
          buttonText="Selesaikan Transaksi"
          onPress={onSubmit}
          formatCurrency={formatCurrency}
        />
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  bold: { fontWeight: "bold" },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },

  // Item styling
  itemContainer: {
    backgroundColor: "#fafafa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  badgesContainer: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  itemMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemQuantity: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  itemDetailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  itemDetail: {
    fontSize: 12,
    color: "#6b7280",
  },
  detailLabel: {
    color: "#9ca3af",
  },
  detailValue: {
    color: "#374151",
    fontWeight: "500",
  },

  // Toppings styling
  toppingsSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  toppingsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    flex: 1,
  },
  toppingChip: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  toppingText: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "500",
  },

  // Note styling
  noteContainer: {
    backgroundColor: "#f0f9ff",
    borderLeftWidth: 3,
    borderLeftColor: "#0ea5e9",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
  },
  noteLabel: {
    fontSize: 11,
    color: "#0369a1",
    fontWeight: "600",
    marginBottom: 2,
  },
  noteText: {
    fontSize: 12,
    color: "#0c4a6e",
    fontStyle: "italic",
    lineHeight: 16,
  },

  // Payment styling
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 40,
    marginTop: 8,
  },
  input: { flex: 1, marginLeft: 8 },
  moneyButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  moneyButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  moneyButtonActive: { backgroundColor: "#B71C1C", borderColor: "#B71C1C" },
  moneyButtonText: { fontSize: 14, color: "#374151" },
  moneyButtonTextActive: { color: "#fff" },
});

export default Checkout;
