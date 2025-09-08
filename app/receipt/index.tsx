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
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PrinterService, ReceiptData } from "@/lib/utils/printer";
import { useCartStore } from "@/lib/store/useCartStore";

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
  value: string | number;
  bold?: boolean;
  valueColor?: string;
}) => (
  <View style={styles.rowBetween}>
    <Text style={[bold && styles.bold]}>{label}</Text>
    <Text style={[bold && styles.bold, valueColor && { color: valueColor }]}>
      {typeof value === "number" ? String(value) : value}
    </Text>
  </View>
);

// ===== parse helper singkat (etxt) =====
const parseEtxt = (
  etxt?: string
): { toppings?: string[]; message?: string } => {
  if (!etxt || typeof etxt !== "string") return {};
  const out: { toppings?: string[]; message?: string } = {};
  etxt.split("|").forEach((seg) => {
    const s = seg.trim();
    const [rawK, ...rest] = s.split(":");
    if (!rawK || rest.length === 0) return;
    const key = rawK.trim().toLowerCase();
    const val = rest.join(":").trim();
    if (!val) return;
    if (key.includes("topping")) {
      const arr = val
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      if (arr.length) out.toppings = arr;
    } else if (
      key.includes("catatan") ||
      key.includes("note") ||
      key.includes("message")
    ) {
      out.message = val;
    }
  });
  return out;
};
const toArrayOfStrings = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .map((x) => {
        if (x == null) return null as any;
        if (typeof x === "string") return x.trim();
        if (typeof x === "number") return String(x);
        if (typeof x === "object") {
          const nm =
            x.name || x.nm || x.nama || x.title || x.label || x.kode || x.kd;
          const q = x.qty ?? x.quantity ?? x.jml ?? x.jumlah;
          return nm ? (q ? `${nm} x${q}` : `${nm}`) : null;
        }
        return String(x);
      })
      .filter(Boolean) as string[];
  }
  if (typeof val === "object") {
    const entries = Object.entries(val)
      .filter(([_, v]) => v)
      .map(([k, v]) => (typeof v === "string" ? v : k));
    return entries.length ? entries : [];
  }
  return [String(val)];
};
const normalizeJenis = (d: any): string | undefined => {
  const isTake =
    d?.note?.takeaway === true ||
    d?.takeaway === true ||
    d?.istakeaway === 1 ||
    d?.istakeaway === "1";
  if (isTake) return "Takeaway";
  const raw = d?.jenis_pesanan || d?.order_type || d?.jenis || d?.note?.jenis;
  if (!raw) return "Dine-in";
  const s = String(raw).trim().toLowerCase();
  if (["dine-in", "dine in", "makan ditempat", "dinein"].includes(s))
    return "Dine-in";
  if (["takeaway", "take away", "bungkus", "take-out", "takeout"].includes(s))
    return "Takeaway";
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const ambilCatatan = (d: any): string | undefined => {
  const fromObj =
    d?.note?.message ??
    d?.note?.catatan ??
    d?.catatan ??
    d?.keterangan ??
    (typeof d?.note === "string" ? d?.note : undefined);
  if (fromObj && String(fromObj).trim()) return String(fromObj).trim();
  const fromEtxt = parseEtxt(d?.etxt).message;
  return fromEtxt && String(fromEtxt).trim()
    ? String(fromEtxt).trim()
    : undefined;
};
const ambilTopping = (d: any): string[] => {
  const fromEtxt = parseEtxt(d?.etxt).toppings ?? [];
  const merged = [
    ...fromEtxt,
    ...(Array.isArray(d?.note?.toppings)
      ? d.note.toppings
      : toArrayOfStrings(d?.note?.toppings)),
    ...toArrayOfStrings(d?.toppings),
    ...toArrayOfStrings(d?.addons),
    ...toArrayOfStrings(d?.addon_names),
  ].filter(Boolean) as string[];
  return Array.from(new Set(merged.map((s) => String(s).trim()))).filter(
    (s) => s.length > 0
  );
};

const OrderTypeBadge = ({ type }: { type?: string }) => {
  const isTakeaway = type?.toLowerCase() === "takeaway";
  return (
    <View
      style={[
        styles.orderTypeBadge,
        { backgroundColor: isTakeaway ? "#fff7ed" : "#f0fdf4" },
      ]}>
      <Ionicons
        name={isTakeaway ? "bag-outline" : "restaurant-outline"}
        size={12}
        color={isTakeaway ? "#ea580c" : "#059669"}
      />
      <Text
        style={[
          styles.orderTypeText,
          { color: isTakeaway ? "#ea580c" : "#059669" },
        ]}>
        {isTakeaway ? "Takeaway" : "Dine-in"}
      </Text>
    </View>
  );
};

export default function ReceiptScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resp, setResp] = useState<TxResponse | null>(null);
  const [storeName, setStoreName] = useState("N7 Coffee");
  const [storeAddress, setStoreAddress] = useState("-");
  const [storeLogo, setStoreLogo] = useState(
    "https://via.placeholder.com/40x40.png?text=N7"
  );

  // printer state
  const [printerOpen, setPrinterOpen] = useState(false);
  const [paired, setPaired] = useState<{ name: string; address: string }[]>([]);
  const [activeMac, setActiveMac] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  const [printerLoading, setPrinterLoading] = useState(false);

  const clearCart = useCartStore((s) => s.clear);

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
            setStoreAddress(loc?.loc_addr || "-");
            setStoreLogo(
              loc?.loc_logo || "https://via.placeholder.com/40x40.png?text=N7"
            );
          }
          if (!active) return;
          setResp(raw ? JSON.parse(raw) : null);
        } catch {
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
      setPrinterOpen(true); // <-- ini yang nampilin modal
    } catch (error: any) {
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
      Alert.alert(
        "Error Print",
        error.message || "Gagal melakukan test print",
        [
          { text: "OK" },
          {
            text: "Bantuan",
            onPress: () => PrinterService.showSetupInstructions(),
          },
        ]
      );
    } finally {
      setPrinting(false);
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

    const rawDetails = Array.isArray(data?.details)
      ? data.details
      : Array.isArray(data?.detail)
        ? data.detail
        : Array.isArray(data?.items)
          ? data.items
          : [];

    const items = rawDetails.map((d: any) => {
      const name = d?.nmbrg || d?.name || "-";
      const qty = Number(d?.qty ?? d?.quantity ?? 1);
      const unit =
        Number(d?.hgsatmkt ?? d?.price ?? 0) +
        Number(d?.addon_total ?? d?.addons_price ?? 0);
      const lineTotal = Number(d?.totals ?? unit * qty);

      const et = parseEtxt(d?.etxt);
      const jenis = normalizeJenis(d);
      const toppingsArr = ambilTopping(d);
      const catatan = ambilCatatan(d);

      const isTakeFlag =
        d?.istakeaway === 1 ||
        d?.istakeaway === "1" ||
        (jenis ? jenis.toLowerCase() === "takeaway" : false);

      const noteObj =
        typeof d?.note === "object" && d?.note !== null ? d?.note : {};
      const normalizedNote = {
        ...noteObj,
        size: noteObj?.size ?? d?.size,
        sugar: noteObj?.sugar ?? d?.sugar,
        toppings: toppingsArr.length > 0 ? toppingsArr : noteObj?.toppings,
        message: (catatan ?? et?.message) as string | undefined,
        takeaway: (noteObj as any)?.takeaway ?? d?.takeaway ?? isTakeFlag,
      };

      return {
        name,
        qty,
        price: lineTotal,
        jenis: jenis ?? (normalizedNote.takeaway ? "Takeaway" : "Dine-in"),
        toppings: toppingsArr,
        note: normalizedNote,
        catatan,
      };
    });

    const subtotal = rawDetails.reduce((acc: number, d: any) => {
      const q = Number(d?.qty ?? d?.quantity ?? 1);
      const unit =
        Number(d?.hgsatmkt ?? d?.price ?? 0) +
        Number(d?.addon_total ?? d?.addons_price ?? 0);
      const line = Number(d?.totals ?? unit * q);
      return acc + (isNaN(line) ? 0 : line);
    }, 0);

    const total = Number(data?.gtotal ?? subtotal);
    const service = Math.max(total - subtotal, 0);
    const adminFee = Number(data?.admin_fee ?? 0);

    const bayar = data?.tranbayar ?? {};
    const amountReceived = Number(bayar?.jmlBayar ?? data?.jmlBayar ?? 0);
    const change = Number(bayar?.jmlKembali ?? data?.jmlKembali ?? 0);

    const paymentMethodRaw =
      bayar?.payment_method || bayar?.caraBayar || data?.caraBayar || "—";
    const pm = String(paymentMethodRaw);
    const paymentMethod =
      pm.toLowerCase() === "cash" || pm === "19" ? "Tunai" : pm;

    return {
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

  const showTroubleshootingHelp = () => {
    Alert.alert(
      "Tips Troubleshooting",
      "• Pastikan printer sudah menyala\n" +
        "• Bluetooth aktif & perangkat sudah paired\n" +
        "• Coba Test Print dulu\n" +
        "• Hindari emoji/non-ASCII di header/alamat\n" +
        "• Coba putus-sambung ulang printer",
      [{ text: "OK" }]
    );
  };

  const handlePrint = async () => {
    try {
      if (!activeMac) {
        await openPrinterPicker(); // <-- ini akan set printerOpen=true
        return;
      }
      if (!PrinterService.isAvailable()) {
        PrinterService.showSetupInstructions();
        return;
      }

      setPrinting(true);

      // Normalisasi items:
      const normalizedItems = items.map((it: any) => {
        // gabungkan toppings (dari it.toppings dan it.note?.toppings)
        const mergedToppings = Array.from(
          new Set([...(it.note?.toppings || []), ...(it.toppings || [])])
        );

        // susun note final (masukkan takeaway level item bila ada)
        const note = {
          ...it.note,
          ...(typeof it.takeaway === "boolean"
            ? { takeaway: it.takeaway }
            : {}),
          ...(mergedToppings.length ? { toppings: mergedToppings } : {}),
        };

        // rapikan details dari jenis/catatan
        const detailsParts: string[] = [];
        if (it.jenis) detailsParts.push(`Jenis: ${it.jenis}`);
        if (it.catatan)
          detailsParts.push(`Catatan: ${String(it.catatan).trim()}`);
        const details = detailsParts.length
          ? detailsParts.join(" | ")
          : undefined;

        return {
          name: it.name,
          qty: it.qty,
          price: it.price,
          note, // <— note final
          ...(details ? { details } : {}),
        };
      });

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
        items: normalizedItems, // <— gunakan yang sudah dinormalisasi
        storeLogoUrl: storeLogo,
      };

      await PrinterService.printReceipt(activeMac, data);
      Alert.alert("Sukses", "Struk berhasil dicetak!");
    } catch (error: any) {
      console.log("Print error:", error);
      Alert.alert("Error Print", error.message || "Gagal mencetak struk", [
        { text: "OK" },
        { text: "Bantuan", onPress: () => showTroubleshootingHelp() },
      ]);
    } finally {
      setPrinting(false);
    }
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

  const toHome = () => {
    clearCart();
    router.push("/(tabs)");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#DA2424" />
          <Text style={{ color: "#6b7280", marginTop: 8 }}>Memuat struk…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!resp) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={70} color="#4CAF50" />
        </View>
        <Text style={styles.successText}>Transaksi Berhasil</Text>

        <View style={styles.card}>
          <View style={styles.storeRow}>
            <Image source={{ uri: storeLogo }} style={styles.storeLogo} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={styles.storeName}
                numberOfLines={1}
                ellipsizeMode="tail">
                {storeName}
              </Text>
              <Text
                style={styles.storeAddress}
                numberOfLines={2}
                ellipsizeMode="tail">
                {storeAddress}
              </Text>
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
          <RowBetween label="Total Bayar" value={formatCurrency(total)} bold />
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

          {items.map((item: any, index: number) => {
            const tipe =
              item?.jenis ??
              (item?.note?.takeaway ? "Takeaway" : "Dine-in") ??
              "Dine-in";

            const rows: string[] = [];
            if (item?.note?.size) rows.push(`Size: ${item.note.size}`);
            if (item?.note?.sugar) rows.push(`Sugar: ${item.note.sugar}`);
            const tops = ambilTopping(item);
            if (tops.length > 0) rows.push(`Toppings: ${tops.join(", ")}`);
            const ctt = ambilCatatan(item);
            if (ctt) rows.push(`Note: ${ctt}`);

            return (
              <View key={index} style={styles.itemWrapper}>
                <RowBetween
                  label={`${item.qty}x ${item.name}`}
                  value={formatCurrency(item.price)}
                />
                <View style={styles.orderTypeContainer}>
                  <OrderTypeBadge type={tipe} />
                </View>
                {rows.length > 0 && (
                  <View style={styles.modifiersList}>
                    {rows.map((r, i) => (
                      <Text key={i} style={styles.modifierItem}>
                        • {r}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
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
          onPress={() => toHome()}>
          <Ionicons name="cart" size={16} color="#fff" />
          <Text style={styles.newTransactionText}>Transaksi Baru</Text>
        </TouchableOpacity>
      </View>

      {/* ===== Printer Picker Modal ===== */}
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
                    Pastikan printer sudah dipasangkan di pengaturan Bluetooth.
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
                      <Text style={styles.deviceAddress}>{device.address}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 20 },
  successIcon: { alignItems: "center", marginTop: 20 },
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

  itemWrapper: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f3f4f6",
  },
  orderTypeContainer: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  orderTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  orderTypeText: { fontSize: 11, fontWeight: "600", marginLeft: 4 },
  modifiersList: { marginTop: 4, marginLeft: 4 },
  modifierItem: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    lineHeight: 16,
  },

  bottomBar: {
    flexDirection: "row",
    padding: 12,
    paddingBottom: Platform.OS === "android" ? 16 : 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  printButton: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    padding: 14,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    gap: 8,
  },
  printText: { color: "#DA2424", fontWeight: "bold", fontSize: 14 },
  newTransactionButton: {
    flex: 1,
    backgroundColor: "#DA2424",
    padding: 14,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  newTransactionText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

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
  modalTitle: { fontWeight: "800", fontSize: 16 },
  deviceList: { maxHeight: 300 },
  loadingContainer: { padding: 40, alignItems: "center" },
  loadingText: { marginTop: 12, color: "#6b7280" },
  emptyContainer: { padding: 20, alignItems: "center" },
  emptyText: { color: "#6b7280", fontSize: 16, fontWeight: "600" },
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
  activeDevice: { backgroundColor: "#FEE2E2" },
  deviceInfo: { flex: 1 },
  deviceName: { fontWeight: "700", fontSize: 14 },
  deviceAddress: { color: "#6b7280", fontSize: 12, marginTop: 2 },
  activeLabel: { color: "#b91c1c", fontSize: 12, marginTop: 4 },
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
  refreshText: { color: "#6b7280", fontSize: 12 },
  testButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  testButtonText: { color: "#374151", fontWeight: "600", fontSize: 12 },
  closeButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#b91c1c",
  },
  closeButtonText: { color: "#b91c1c", fontWeight: "700" },
});
