// app/checkout/index.tsx
import React, { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "@/components/ui/Header";
import BottomBar from "@/components/ui/BottomBar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCartStore } from "@/lib/store/useCartStore";
import { createResource } from "@/lib/api/fetch";

const formatCurrency = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

const Checkout = () => {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);

  const { subtotal, itemCount } = useMemo(() => {
    let sub = 0, count = 0;
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
        Alert.alert("Nominal kurang", "Masukkan nominal yang cukup untuk membayar.");
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
        return {
          indx: idx + 1,
          prod_id: String(it.prodId),
          prod_name: it.name,
          prod_price: it.unitBasePrice,
          prod_disc: "",
          prod_qty: it.quantity,
          prod_total: unit * it.quantity,
          prod_note: it.note?.message ?? "",
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

      const resp = await createResource<any>("transaction/create", payload, token);

      Alert.alert("Sukses", "Transaksi berhasil dibuat.");
      clearCart();
      await AsyncStorage.setItem("tx:last_response", JSON.stringify(resp));
      router.replace({ pathname: "/receipt", params: { ts: String(Date.now()) } });
    } catch (e: any) {
      console.log("Create transaction error:", e);
      Alert.alert("Gagal", e?.message ?? "Gagal membuat transaksi.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <Header title="Struk Transaksi" showBackButton textColor="text-white" backIconColor="#fff" />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>RINGKASAN BELANJA</Text>

          {items.map((it) => {
            const line = (it.unitBasePrice + it.unitAddonsPrice) * it.quantity;
            return (
              <View key={it.id} style={{ marginBottom: 6 }}>
                <Text style={{ fontWeight: "600", color: "#111827" }}>
                  {it.name} × {it.quantity}
                </Text>
                <Text style={{ color: "#6b7280", fontSize: 12 }}>
                  {formatCurrency(line)}
                </Text>
              </View>
            );
          })}

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
                onPress={() => setSelectedAmount(amount)}
              >
                <Text
                  style={[
                    styles.moneyButtonText,
                    selectedAmount === amount && styles.moneyButtonTextActive,
                  ]}
                >
                  {i === 0 ? "Uang Pas" : amount.toLocaleString("id-ID")}
                </Text>
              </TouchableOpacity>
            ))}
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
  sectionTitle: { fontSize: 12, color: "#6b7280", marginBottom: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  bold: { fontWeight: "bold" },
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
