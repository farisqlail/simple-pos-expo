// app/receipt/index.tsx - Updated with fixed Bluetooth printer
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PrinterService, ReceiptData } from "@/lib/utils/printer";

type TxResponse = any;

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
  const [printerLoading, setPrinterLoading] = useState(false);

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
    if (!PrinterService.isAvailable()) {
      PrinterService.showSetupInstructions();
      return;
    }

    setPrinterLoading(true);
    try {
      const list = await PrinterService.getPaired();
      setPaired(list);
      setPrinterOpen(true);
    } catch (error: any) {
      console.log("Bluetooth list error:", error);
      Alert.alert(
        "Error Bluetooth",
        error.message || "Failed to get Bluetooth devices",
        [
          { text: "OK" },
          {
            text: "Bantuan Setup",
            onPress: () => PrinterService.showSetupInstructions(),
          },
        ]
      );
      setPaired([]);
    } finally {
      setPrinterLoading(false);
    }
  };

  const handleChoosePrinter = async (mac: string) => {
    try {
      await PrinterService.setActive(mac);
      setActiveMac(mac);
      setPrinterOpen(false);

      // Test connection immediately
      Alert.alert(
        "Test Printer",
        "Apakah Anda ingin test print untuk memverifikasi koneksi?",
        [
          { text: "Skip", style: "cancel" },
          { text: "Test Print", onPress: () => handleTestPrint(mac) },
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to set active printer");
    }
  };

  const handleTestPrint = async (mac?: string) => {
    const printerMac = mac || activeMac;
    if (!printerMac) return;

    setPrinting(true);
    try {
      await PrinterService.testPrint(printerMac);
      Alert.alert("Sukses", "Test print berhasil dilakukan!");
    } catch (error: any) {
      console.log("Test print error:", error);
      Alert.alert(
        "Error Print",
        error.message || "Gagal melakukan test print",
        [
          { text: "OK" },
          {
            text: "Bantuan",
            onPress: () => showTroubleshootingHelp(),
          },
        ]
      );
    } finally {
      setPrinting(false);
    }
  };

  const handlePrint = async () => {
    try {
      if (!activeMac) {
        await openPrinterPicker();
        return;
      }

      if (!PrinterService.isAvailable()) {
        PrinterService.showSetupInstructions();
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
        adminFee: adminFee || 0,
        service: service || 0,
        total,
        amountReceived,
        change,
        items,
      };

      await PrinterService.printReceipt(activeMac, data);
      Alert.alert("Sukses", "Struk berhasil dicetak!");
    } catch (error: any) {
      console.log("Print error:", error);
      Alert.alert("Error Print", error.message || "Gagal mencetak struk", [
        { text: "OK" },
        {
          text: "Coba Lagi",
          onPress: () => {
            // Disconnect and try again
            PrinterService.disconnect();
            setTimeout(() => handlePrint(), 1000);
          },
        },
        {
          text: "Bantuan",
          onPress: () => showTroubleshootingHelp(),
        },
      ]);
    } finally {
      setPrinting(false);
    }
  };

  const showTroubleshootingHelp = () => {
    Alert.alert(
      "Tips Troubleshooting",
      "• Pastikan printer sudah menyala\n" +
        "• Cek Bluetooth sudah aktif\n" +
        "• Pastikan printer sudah dipasangkan di pengaturan HP\n" +
        "• Coba matikan dan hidupkan printer\n" +
        "• Dekatkan HP dengan printer\n" +
        "• Pastikan printer ada kertas",
      [
        { text: "OK" },
        {
          text: "Bantuan Setup",
          onPress: () => PrinterService.showSetupInstructions(),
        },
      ]
    );
  };

  const handleRefreshPrinters = async () => {
    setPrinterLoading(true);
    try {
      const list = await PrinterService.getPaired();
      setPaired(list);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Gagal refresh daftar printer");
    } finally {
      setPrinterLoading(false);
    }
  };

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

    const invoice = data?.no_nota || "#INV-XXXX";
    const date =
      data?.tranbayar?.tglsetor ||
      data?.created_at ||
      new Date().toLocaleString("id-ID");

    const rawDetails = Array.isArray(data?.details) ? data.details : [];
    const items = rawDetails.map((d: any) => ({
      name: d?.nmbrg || "-",
      price: Number(d?.totals ?? d?.hgsatmkt ?? 0),
      qty: Number(d?.qty ?? 1),
      details: undefined,
    }));

    const subtotal = rawDetails.reduce(
      (acc: number, d: any) => acc + Number(d?.totals ?? 0),
      0
    );

    const total = Number(data?.gtotal ?? subtotal);
    const service = Math.max(total - subtotal, 0);
    const adminFee = 0;

    const bayar = data?.tranbayar ?? {};
    const amountReceived = Number(bayar?.jmlBayar ?? 0);
    const change = Number(bayar?.jmlKembali ?? 0);

    const paymentMethodRaw = bayar?.payment_method || bayar?.caraBayar || "—";
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
  }, [resp, storeName, storeAddress, storeLogo]);

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}>
        <ActivityIndicator size="large" color="#DA2424" />
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
    <SafeAreaProvider>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={70} color="#4CAF50" />
          </View>
          <Text style={styles.successText}>Transaksi Berhasil</Text>

          <View style={styles.card}>
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
            {adminFee > 0 && (
              <RowBetween
                label="Biaya Admin"
                value={`+ ${formatCurrency(adminFee)}`}
                valueColor="red"
              />
            )}
            {service > 0 && (
              <RowBetween
                label="Service"
                value={`+ ${formatCurrency(service)}`}
                valueColor="red"
              />
            )}
            <RowBetween
              label="Total Bayar"
              value={formatCurrency(total)}
              bold
            />
            <RowBetween
              label="Uang Diterima"
              value={formatCurrency(amountReceived)}
            />

            <View style={styles.changeBox}>
              <Text style={styles.changeLabel}>Kembalian</Text>
              <Text style={styles.changeValue}>{formatCurrency(change)}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>DETAIL PEMBELIAN</Text>
            {items.map((item: any, index: number) => (
              <View key={index} style={styles.itemWrapper}>
                <RowBetween
                  label={`${item.qty}x ${item.name}`}
                  value={formatCurrency(item.price)}
                />
                {item.details && (
                  <Text style={styles.itemDetails}>{item.details}</Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.printButton}
            onPress={handlePrint}
            disabled={printing || printerLoading}>
            {printing || printerLoading ? (
              <ActivityIndicator size="small" color="#DA2424" />
            ) : (
              <Ionicons name="print" size={16} color="#DA2424" />
            )}
            <Text style={styles.printText}>
              {printing
                ? "Mencetak..."
                : printerLoading
                ? "Loading..."
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

        {/* Enhanced Printer Picker Modal */}
        {printerOpen && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pilih Printer Bluetooth</Text>
                <TouchableOpacity onPress={() => setPrinterOpen(false)}>
                  <Ionicons name="close" size={20} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.deviceList}>
                {printerLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#DA2424" />
                    <Text style={styles.loadingText}>Mencari printer...</Text>
                  </View>
                ) : paired.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      Tidak ada perangkat terpasang.
                    </Text>
                    <Text style={styles.emptySubText}>
                      Pastikan printer sudah dipasangkan di pengaturan
                      Bluetooth.
                    </Text>
                  </View>
                ) : (
                  paired.map((device) => (
                    <TouchableOpacity
                      key={device.address}
                      onPress={() => handleChoosePrinter(device.address)}
                      style={[
                        styles.deviceItem,
                        activeMac === device.address && styles.activeDevice,
                      ]}>
                      <View style={styles.deviceInfo}>
                        <Text style={styles.deviceName}>
                          {device.name || "(Tanpa nama)"}
                        </Text>
                        <Text style={styles.deviceAddress}>
                          {device.address}
                        </Text>
                        {activeMac === device.address && (
                          <Text style={styles.activeLabel}>Aktif</Text>
                        )}
                      </View>
                      <Ionicons
                        name={
                          activeMac === device.address
                            ? "checkmark-circle"
                            : "chevron-forward"
                        }
                        size={20}
                        color={
                          activeMac === device.address ? "#b91c1c" : "#6b7280"
                        }
                      />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={handleRefreshPrinters}
                  style={styles.refreshButton}
                  disabled={printerLoading}>
                  <Ionicons name="refresh" size={16} color="#6b7280" />
                  <Text style={styles.refreshText}>Refresh</Text>
                </TouchableOpacity>

                {activeMac && (
                  <TouchableOpacity
                    onPress={() => handleTestPrint()}
                    style={styles.testButton}
                    disabled={printing}>
                    <Text style={styles.testButtonText}>Test Print</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => setPrinterOpen(false)}
                  style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>Tutup</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaProvider>
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
    paddingTop: 10,
    paddingBottom: 30,
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
    gap: 8,
  },
  printText: { color: "#DA2424", fontWeight: "bold" },
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

  // Modal styles
  modalOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontWeight: "800",
    fontSize: 16,
  },
  deviceList: {
    maxHeight: 300,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#6b7280",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubText: {
    color: "#9ca3af",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  activeDevice: {
    backgroundColor: "#FEE2E2",
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontWeight: "700",
    fontSize: 14,
  },
  deviceAddress: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 2,
  },
  activeLabel: {
    color: "#b91c1c",
    fontSize: 12,
    marginTop: 4,
  },
  modalActions: {
    padding: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  refreshText: {
    color: "#6b7280",
    fontSize: 12,
  },
  testButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  testButtonText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 12,
  },
  closeButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#b91c1c",
  },
  closeButtonText: {
    color: "#b91c1c",
    fontWeight: "700",
  },
});
