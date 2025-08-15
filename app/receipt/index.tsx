// app/receipt/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PrinterService, ReceiptData } from "@/lib/utils/printer";

type TxResponse = any; // bentuk response bisa bervariasi

const formatCurrency = (num: number = 0) =>
  "Rp " + (Number(num) || 0).toLocaleString("id-ID");

const RowBetween = ({
  label,
  value,
  bold = false,
  valueColor,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
}) => (
  <View style={styles.rowBetween}>
    <Text style={bold && styles.bold}>{label}</Text>
    <Text style={[bold && styles.bold, valueColor && { color: valueColor }]}>
      {value}
    </Text>
  </View>
);

export default function ReceiptScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resp, setResp] = useState<TxResponse | null>(null);
  const [storeName, setStoreName] = useState("N7 Coffee");
  const [storeAddress, setStoreAddress] = useState("—");
  const [storeLogo, setStoreLogo] = useState(
    "https://via.placeholder.com/40x40.png?text=N7"
  );
  const [printerOpen, setPrinterOpen] = useState(false);
  const [paired, setPaired] = useState<{ name: string; address: string }[]>([]);
  const [activeMac, setActiveMac] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          setLoading(true);
          const raw = await AsyncStorage.getItem("tx:last_response");
          const rawLoc = await AsyncStorage.getItem("selected_location");
          if (rawLoc) {
            const loc = JSON.parse(rawLoc);
            setStoreName(loc?.loc_name || "N7 Coffee");
            setStoreAddress(loc?.loc_addr || "—");
            setStoreLogo(
              loc?.loc_logo || "https://via.placeholder.com/40x40.png?text=N7"
            );
          }
          if (!active) return;
          setResp(raw ? JSON.parse(raw) : null);
          // Debug optional:
          console.log("[Receipt] tx:last_response:", raw);
        } catch (e) {
          console.log("Load receipt error:", e);
          setResp(null);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  useEffect(() => {
    (async () => {
      const mac = await PrinterService.getActive();
      setActiveMac(mac);
    })();
  }, []);

  const openPrinterPicker = async () => {
    try {
      const list = await PrinterService.getPaired();
      setPaired(list);
      setPrinterOpen(true);
    } catch (e) {
      console.log("BT list error:", e);
      setPaired([]);
      setPrinterOpen(true);
    }
  };

  const handleChoosePrinter = async (mac: string) => {
    await PrinterService.setActive(mac);
    setActiveMac(mac);
    setPrinterOpen(false);
  };

  const handlePrint = async () => {
    try {
      if (!activeMac) {
        // kalau belum pilih printer -> buka picker
        await openPrinterPicker();
        return;
      }
      setPrinting(true);

      const data: ReceiptData = {
        storeName,
        storeAddress,
        invoice,
        date,
        paymentMethod,
        subtotal,
        adminFee,
        service,
        total,
        amountReceived,
        change,
        items, // hasil mapping di memo kamu
      };

      await PrinterService.printReceipt(activeMac, data);
    } catch (e: any) {
      console.log("Print error:", e);
      // boleh tampilkan alert/toast
    } finally {
      setPrinting(false);
    }
  };

  // Ambil field aman dengan fallback
  const {
    invoice,
    date,
    paymentMethod,
    subtotal,
    service,
    adminFee,
    total,
    amountReceived,
    change,
    items,
  } = useMemo(() => {
    const r = resp ?? {};
    const data = r?.data ?? {};

    // Nomor nota & tanggal
    const invoice = data?.no_nota || "#INV-XXXX";
    const date =
      data?.tranbayar?.tglsetor ||
      data?.created_at ||
      new Date().toLocaleString("id-ID");

    // Items dari data.details
    const rawDetails = Array.isArray(data?.details) ? data.details : [];
    const items = rawDetails.map((d: any) => ({
      name: d?.nmbrg || "-",
      // harga baris; di respons ada d.totals = total line, d.hgsatmkt = harga satuan
      price: Number(d?.totals ?? d?.hgsatmkt ?? 0),
      qty: Number(d?.qty ?? 1),
      // jika kamu punya modifiers/catatan, bisa disusun di sini
      details: undefined,
    }));

    // Subtotal = jumlahkan total per baris dari details
    const subtotal = rawDetails.reduce(
      (acc: number, d: any) => acc + Number(d?.totals ?? 0),
      0
    );

    // Total dari field gtotal; service = selisih total - subtotal (jika ada)
    const total = Number(data?.gtotal ?? subtotal);
    const service = Math.max(total - subtotal, 0);
    const adminFee = 0; // responsmu tidak ada admin fee → 0

    // Pembayaran
    const bayar = data?.tranbayar ?? {};
    const amountReceived = Number(bayar?.jmlBayar ?? 0); // Uang diterima langsung dari API
    const change = Number(bayar?.jmlKembali ?? 0);

    // Metode pembayaran
    const paymentMethodRaw = bayar?.payment_method || bayar?.caraBayar || "—";
    // Normalisasi: kalau "Cash" atau id 19 -> tampilkan "Tunai"
    const paymentMethod =
      String(paymentMethodRaw).toLowerCase() === "cash" ||
      String(paymentMethodRaw) === "19"
        ? "Tunai"
        : String(paymentMethodRaw);

    return {
      storeName,
      storeAddress,
      storeLogo,
      invoice,
      date,
      paymentMethod,
      subtotal,
      service,
      adminFee,
      total,
      amountReceived,
      change,
      items,
    };
  }, [resp]);

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}>
        <ActivityIndicator />
        <Text style={{ color: "#6b7280", marginTop: 8 }}>Memuat struk…</Text>
      </View>
    );
  }

  if (!resp) {
    return (
      <View
        style={[styles.container, { justifyContent: "center", padding: 16 }]}>
        <Text style={{ textAlign: "center", marginBottom: 12 }}>
          Tidak ada data struk ditemukan.
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)")}
          style={styles.newTransactionButton}>
          <Ionicons name="cart" size={16} color="#fff" />
          <Text style={styles.newTransactionText}>Transaksi Baru</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status */}
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={70} color="#4CAF50" />
        </View>
        <Text style={styles.successText}>Transaksi Berhasil</Text>

        {/* Card Info */}
        <View style={styles.card}>
          {/* Store Info */}
          <View style={styles.storeRow}>
            <Image source={{ uri: storeLogo }} style={styles.storeLogo} />
            <View>
              <Text style={styles.storeName}>{storeName}</Text>
              <Text style={styles.storeAddress}>{storeAddress}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.invoice}>{invoice}</Text>
          <Text style={styles.date}>{date}</Text>

          <RowBetween label="Metode Pembayaran" value={paymentMethod} bold />
          <RowBetween label="Subtotal" value={formatCurrency(subtotal)} />
          {/* tampilkan jika ada admin fee */}
          {adminFee > 0 ? (
            <RowBetween
              label="Biaya Admin"
              value={`+ ${formatCurrency(adminFee)}`}
              valueColor="red"
            />
          ) : null}
          {/* tampilkan jika ada service */}
          {service > 0 ? (
            <RowBetween
              label="Service"
              value={`+ ${formatCurrency(service)}`}
              valueColor="red"
            />
          ) : null}
          <RowBetween label="Total Bayar" value={formatCurrency(total)} bold />
          <RowBetween
            label="Uang Diterima"
            value={formatCurrency(amountReceived)}
          />

          {/* Change */}
          <View style={styles.changeBox}>
            <Text style={styles.changeLabel}>Kembalian</Text>
            <Text style={styles.changeValue}>{formatCurrency(change)}</Text>
          </View>
        </View>

        {/* Detail Pembelian */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>DETAIL PEMBELIAN</Text>
          {items.map((item: any, index: number) => (
            <View key={index} style={styles.itemWrapper}>
              <RowBetween
                label={`${item.qty}x ${item.name}`}
                value={formatCurrency(item.price)}
              />
              {item.details ? (
                <Text style={styles.itemDetails}>{item.details}</Text>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.printButton}
          onPress={handlePrint}
          disabled={printing}>
          <Ionicons name="print" size={16} color="#DA2424" />
          <Text style={styles.printText}>
            {printing
              ? "Mencetak..."
              : activeMac
                ? "Cetak Struk"
                : "Pilih Printer"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.newTransactionButton}
          onPress={() => router.push("/(tabs)")}>
          <Ionicons name="cart" size={16} color="#fff" />
          <Text style={styles.newTransactionText}>Transaksi Baru</Text>
        </TouchableOpacity>
      </View>

      {printerOpen && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}>
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 10,
              width: "100%",
              maxWidth: 420,
            }}>
            <View
              style={{
                padding: 14,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: "#eee",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
              <Text style={{ fontWeight: "800" }}>Pilih Printer Bluetooth</Text>
              <TouchableOpacity onPress={() => setPrinterOpen(false)}>
                <Ionicons name="close" size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {paired.length === 0 ? (
                <View style={{ padding: 16 }}>
                  <Text style={{ color: "#6b7280" }}>
                    Tidak ada perangkat terpasang.
                  </Text>
                </View>
              ) : (
                paired.map((d) => (
                  <TouchableOpacity
                    key={d.address}
                    onPress={() => handleChoosePrinter(d.address)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: "#eee",
                      backgroundColor:
                        activeMac === d.address ? "#FEE2E2" : "#fff",
                    }}>
                    <Text style={{ fontWeight: "700" }}>
                      {d.name || "(Tanpa nama)"}
                    </Text>
                    <Text style={{ color: "#6b7280", fontSize: 12 }}>
                      {d.address}
                    </Text>
                    {activeMac === d.address ? (
                      <Text
                        style={{
                          color: "#b91c1c",
                          fontSize: 12,
                          marginTop: 4,
                        }}>
                        Aktif
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View
              style={{
                padding: 12,
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 10,
              }}>
              <TouchableOpacity
                onPress={() => setPrinterOpen(false)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#b91c1c",
                }}>
                <Text style={{ color: "#b91c1c", fontWeight: "700" }}>
                  Tutup
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },
  scrollContent: { padding: 16, paddingBottom: 100 },
  successIcon: { alignItems: "center", marginTop: 50 },
  successText: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  storeRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  storeLogo: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  storeName: { fontWeight: "bold", fontSize: 16 },
  storeAddress: { fontSize: 12, color: "#666" },
  divider: { height: 1, backgroundColor: "#E0E0E0", marginVertical: 8 },
  invoice: { marginTop: 4, fontWeight: "bold" },
  date: { fontSize: 12, color: "#666", marginBottom: 8 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  bold: { fontWeight: "bold" },
  changeBox: {
    borderWidth: 1,
    borderColor: "#FFD700",
    backgroundColor: "#FFF9E6",
    padding: 8,
    marginTop: 6,
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  changeLabel: { color: "#333" },
  changeValue: { fontWeight: "bold", color: "#333" },
  sectionTitle: { fontWeight: "bold", marginBottom: 8 },
  itemWrapper: { marginBottom: 10 },
  itemDetails: { fontSize: 12, color: "#666", marginTop: 2 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    width: "100%",
    padding: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  printButton: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  printText: { color: "#DA2424", marginLeft: 4, fontWeight: "bold" },
  newTransactionButton: {
    flex: 1,
    backgroundColor: "#DA2424",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  newTransactionText: { color: "#fff", fontWeight: "bold" },
});
