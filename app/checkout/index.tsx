import React, { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "@/components/ui/Header";
import BottomBar from "@/components/ui/BottomBar";
import { useCartStore } from "@/lib/store/useCartStore"; // ⬅️ ambil data cart

const formatCurrency = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

const Row = ({ label, value, bold = false, valueColor }: any) => (
  <View style={styles.row}>
    <Text style={bold && styles.bold}>{label}</Text>
    <Text style={[bold && styles.bold, valueColor && { color: valueColor }]}>{value}</Text>
  </View>
);

const MoneyButton = ({ amount, isActive, onPress, isFirst }: any) => (
  <TouchableOpacity
    style={[styles.moneyButton, isActive && styles.moneyButtonActive]}
    onPress={onPress}>
    <Text style={[styles.moneyButtonText, isActive && styles.moneyButtonTextActive]}>
      {isFirst ? "Uang Pas" : amount.toLocaleString("id-ID")}
    </Text>
  </TouchableOpacity>
);

const Checkout = () => {
  const router = useRouter();

  // ===== Ambil items dari cart store
  const items = useCartStore((s) => s.items);

  // ===== Hitung subtotal & itemCount dari cart
  const { subtotal, itemCount } = useMemo(() => {
    let sub = 0;
    let count = 0;
    for (const it of items) {
      const unitTotal = (it.unitBasePrice + it.unitAddonsPrice);
      sub += unitTotal * it.quantity;
      count += it.quantity;
    }
    return { subtotal: sub, itemCount: count };
  }, [items]);

  // Biaya admin contoh (sesuaikan kebijakanmu)
  const biayaAdmin = items.length ? 1000 : 0;
  const totalBayar = subtotal + biayaAdmin;

  const [selectedAmount, setSelectedAmount] =
    useState<number | null>(null);

  // Rekomendasi nominal bayar dari total
  const moneyOptions = useMemo(() => {
    const pecahan = [1000, 2000, 5000, 10000, 20000, 50000, 100000];
    const list: number[] = [totalBayar + 1000];
    pecahan.forEach((p) => {
      const kelipatan = Math.ceil(totalBayar / p) * p;
      if (!list.includes(kelipatan)) list.push(kelipatan);
    });
    return list.sort((a, b) => a - b);
  }, [totalBayar]);

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <Header title="Struk Transaksi" showBackButton textColor="text-white" backIconColor="#fff" />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Ringkasan Belanja */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>RINGKASAN BELANJA</Text>

          {/* (Opsional) tampilkan ringkas item */}
          {items.map((it) => (
            <View key={it.id} style={{ marginBottom: 6 }}>
              <Text style={{ fontWeight: "600", color: "#111827" }}>
                {it.name} × {it.quantity}
              </Text>
              <Text style={{ color: "#6b7280", fontSize: 12 }}>
                {formatCurrency((it.unitBasePrice + it.unitAddonsPrice) * it.quantity)}
              </Text>
            </View>
          ))}

          <Row label="Subtotal" value={formatCurrency(subtotal)} />
          <Row
            label="Biaya Admin"
            value={`+ ${formatCurrency(biayaAdmin)}`}
            valueColor="red"
          />
          <Row label="Total Bayar" value={formatCurrency(totalBayar)} bold />
        </View>

        {/* Pilih Metode Pembayaran */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>PILIH METODE PEMBAYARAN</Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="card-outline" size={20} color="#6b7280" />
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Masukkan nominal"
              value={selectedAmount ? String(selectedAmount) : ""}
              onChangeText={(val) => setSelectedAmount(Number(val) || 0)}
            />
          </View>

          <View style={styles.moneyButtons}>
            {moneyOptions.map((amount, index) => (
              <MoneyButton
                key={amount}
                amount={amount}
                isActive={selectedAmount === amount}
                onPress={() => setSelectedAmount(amount)}
                isFirst={index === 0}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom bar pakai nilai dari cart */}
      <BottomBar
        itemCount={itemCount}
        total={totalBayar}
        buttonText="Selesaikan Transaksi"
        onPress={() => router.push("/receipt")}
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
  row: { flexDirection: "row", justifyContent: "space-between", marginVertical: 2 },
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
  moneyButtons: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
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
