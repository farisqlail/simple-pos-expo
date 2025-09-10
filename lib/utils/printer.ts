// lib/printer.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform, PermissionsAndroid } from "react-native";
import RNBluetoothClassic from "react-native-bluetooth-classic";

// ===== Types =====
export type ReceiptItem = {
  name: string;
  qty: number;
  price: number;
  details?: string;
  note?: {
    size?: string;
    sugar?: string;
    // Dukung string atau objek { name, price }
    toppings?: Array<string | { name: string; price?: number }>;
    message?: string;
    takeaway?: boolean;
  };
};

export type ReceiptData = {
  storeName: string;
  storeAddress: string;
  invoice: string;
  date: string;
  paymentMethod: string;
  subtotal: number;

  // berbagai kemungkinan field fee
  adminFee?: number;
  service?: number;

  total: number;
  amountReceived: number;
  change: number;
  items: ReceiptItem[];

  // opsi-opsi tambahan yang kadang ada di schema lain
  fees?: Array<{ type: string; name?: string; amount: number }>;
  meta?: Record<string, any>;
  storeLogoUrl?: string;
};

const STORAGE_ACTIVE_PRINTER = "printer:active_mac";
const WIDTH = 32; // 58mm tipikal
const DEBUG_MODE = false; // set true sementara untuk melihat ringkasan debug di struk

const R = (n: number) =>
  "Rp " + (Number(n) || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

// ===== ESC/POS =====
const ESC = "\x1B";
const GS = "\x1D";
const CMD = {
  INIT: ESC + "@",
  TEXT_NORMAL: ESC + "!" + "\x00",
  TEXT_2H: ESC + "!" + "\x10",
  ALIGN_L: ESC + "a" + "\x00",
  ALIGN_C: ESC + "a" + "\x01",
  FEED: "\n",
  CUT_FULL: GS + "V" + "\x41" + "\x00",
};

let activeDevice: { address: string } | null = null;

// ===== Utils =====
async function ensureAndroidBtPermissions() {
  if (Platform.OS !== "android") return;

  const perms: Array<PermissionsAndroid.Permission> = [
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN as any,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT as any,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  ].filter(Boolean);

  const statuses = await PermissionsAndroid.requestMultiple(perms);
  const denied = Object.values(statuses).some(
    (s) => s !== PermissionsAndroid.RESULTS.GRANTED
  );
  if (denied) throw new Error("Izin Bluetooth ditolak");
}

const line = (ch = "-") => ch.repeat(WIDTH);
const padR = (s: string, len: number) =>
  s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length);
const kv = (k: string, v: string) => padR(k, WIDTH - v.length) + v;

const wrap = (text: string, indent = 0) => {
  const space = " ".repeat(indent);
  const max = WIDTH - indent;
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const words = clean.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + (cur ? " " : "") + w).length > max) {
      if (cur) lines.push(space + cur);
      if (w.length > max) {
        let i = 0;
        while (i < w.length) {
          lines.push(space + w.slice(i, i + max));
          i += max;
        }
        cur = "";
      } else {
        cur = w;
      }
    } else {
      cur = cur ? cur + " " + w : w;
    }
  }
  if (cur) lines.push(space + cur);
  return lines;
};

// Normalisasi angka aman
const N = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Ambil fee dari berbagai kemungkinan field
function extractFees(data: ReceiptData) {
  // alias-aliasku untuk admin & service
  const adminAliases = [
    "adminFee",
    "admin_fee",
    "admin",
    "biaya_admin",
    "fee",
  ];
  const serviceAliases = [
    "service",
    "serviceFee",
    "service_fee",
    "service_charge",
    "layanan",
    "biaya_layanan",
  ];

  // baca dari root data
  let admin = 0;
  let service = 0;

  for (const k of adminAliases) {
    if ((data as any)[k] != null) {
      admin = N((data as any)[k]);
      break;
    }
  }
  for (const k of serviceAliases) {
    if ((data as any)[k] != null) {
      service = N((data as any)[k]);
      break;
    }
  }

  // baca dari fees[] jika ada
  if (Array.isArray(data.fees)) {
    for (const f of data.fees) {
      const type = (f.type || f.name || "").toString().toLowerCase();
      if (type.includes("admin")) admin += N(f.amount);
      else if (type.includes("service") || type.includes("layanan"))
        service += N(f.amount);
    }
  }

  // baca dari meta umum bila ada
  if (data.meta && typeof data.meta === "object") {
    for (const k of Object.keys(data.meta)) {
      const lk = k.toLowerCase();
      if (lk.includes("admin")) admin += N((data.meta as any)[k]);
      if (lk.includes("service") || lk.includes("layanan"))
        service += N((data.meta as any)[k]);
    }
  }

  return { admin, service };
}

// Build baris opsi item (ASCII safe)
function buildItemOptionsLines(it: ReceiptItem): string[] {
  const bullets: string[] = [];

  const sz = it?.note?.size;
  const sugar = it?.note?.sugar;
  const tops = it?.note?.toppings ?? [];
  const msg = it?.note?.message;
  const takeaway = it?.note?.takeaway;

  if (sz) bullets.push(`- Size: ${sz}`);
  if (sugar) bullets.push(`- Sugar: ${sugar}`);

  if (Array.isArray(tops) && tops.length > 0) {
    for (const t of tops) {
      if (typeof t === "string") {
        bullets.push(`- Topping: ${t}`);
      } else if (t && typeof t === "object") {
        const nm = t.name ?? "Topping";
        const pr = N(t.price) > 0 ? ` (+${R(N(t.price))})` : "";
        bullets.push(`- Topping: ${nm}${pr}`);
      }
    }
  }

  if (typeof takeaway === "boolean") {
    bullets.push(`- ${takeaway ? "Takeaway" : "Dine-in"}`);
  }
  if (msg) bullets.push(`- Note: ${msg}`);

  return bullets.flatMap((b) => wrap(b, 2));
}

// helper kecil untuk jeda async
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// ===== Core Service =====
export const PrinterService = {
  isAvailable(): boolean {
    return !!RNBluetoothClassic;
  },

  getStatus(): { available: boolean; suggestions: string[] } {
    if (this.isAvailable()) return { available: true, suggestions: [] };
    return {
      available: false,
      suggestions: [
        "Gunakan Expo Dev Client / EAS (bukan Expo Go).",
        "Install: expo install react-native-bluetooth-classic",
        "Jalankan: npx expo prebuild && npx expo run:android",
        "Pastikan izin Bluetooth Android 12+ sudah di app.json",
      ],
    };
  },

  async getPaired(): Promise<{ name: string; address: string }[]> {
    if (!this.isAvailable()) throw new Error("Bluetooth module tidak tersedia");

    await ensureAndroidBtPermissions();

    const enabled = await RNBluetoothClassic.isBluetoothEnabled();
    if (!enabled) {
      const ok = await RNBluetoothClassic.requestBluetoothEnabled?.();
      if (ok === false) throw new Error("Bluetooth dimatikan");
    }

    const bonded = await RNBluetoothClassic.getBondedDevices();
    return bonded.map((d: any) => ({
      name: d.name || d.deviceName || "Unknown Device",
      address: d.address || d.id,
    }));
  },

  async setActive(mac: string) {
    await AsyncStorage.setItem(STORAGE_ACTIVE_PRINTER, mac);
  },
  async getActive(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_ACTIVE_PRINTER);
  },

  async ensureConnected(mac: string) {
    await ensureAndroidBtPermissions();

    const connected = await RNBluetoothClassic.getConnectedDevices?.();
    const already = (connected || []).find(
      (d: any) => (d.address || d.id) === mac
    );
    if (already) {
      activeDevice = { address: mac };
      return;
    }

    try {
      await RNBluetoothClassic.disconnectFromDevice?.(activeDevice?.address);
    } catch {}

    await RNBluetoothClassic.connectToDevice(mac, {
      CONNECTOR_TYPE: "rfcomm",
      DELIMITER: "\n",
      DEVICE_CHARSET: "ASCII", // pakai ASCII agar aman di ESC/POS murah
    });
    activeDevice = { address: mac };
  },

  async disconnect() {
    try {
      if (activeDevice)
        await RNBluetoothClassic.disconnectFromDevice?.(activeDevice.address);
    } finally {
      activeDevice = null;
    }
  },

  // === writeRaw dengan CHUNKING agar tidak terpotong
  async writeRaw(data: string | Uint8Array) {
    if (!activeDevice) throw new Error("Belum terhubung ke printer");

    let payload: string;
    if (typeof data === "string") payload = data;
    else payload = String.fromCharCode(...data);

    const CHUNK_SIZE = 256;
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const part = payload.slice(i, i + CHUNK_SIZE);
      await RNBluetoothClassic.writeToDevice(activeDevice.address, part);
      await delay(8);
    }
  },

  async printReceipt(mac: string, data: ReceiptData) {
    if (!this.isAvailable()) throw new Error("Bluetooth module tidak tersedia");
    await this.ensureConnected(mac);

    // Normalisasi fee
    const { admin, service } = extractFees(data);

    const computedTotal =
      N(data.subtotal) + N(admin) + N(service);

    const totalToPrint = Number.isFinite(N(data.total))
      ? N(data.total)
      : computedTotal;

    const chunks: string[] = [];
    const p = (s: string) => chunks.push(s);

    const inferredOrderType = data.items?.some((it) => it?.note?.takeaway)
      ? "Takeaway"
      : "Dine-in";

    p(CMD.INIT);
    p(CMD.ALIGN_C);
    p(CMD.TEXT_2H);
    p(`${data.storeName}\n`);
    p(CMD.TEXT_NORMAL);
    p(`${data.storeAddress}\n`);
    p(`${line()}\n`);

    p(CMD.ALIGN_L);
    p(`${kv("Invoice", data.invoice)}\n`);
    p(`${kv("Tanggal", data.date)}\n`);
    p(`${kv("Metode", data.paymentMethod)}\n`);
    p(`${kv("Tipe Order", inferredOrderType)}\n`);
    p(`${line()}\n`);

    for (const it of data.items) {
      const left = `${it.qty}x ${it.name}`;
      const right = R(N(it.price));
      p(`${kv(left, right)}\n`);

      if (it.details) for (const c of wrap(it.details, 2)) p(`${c}\n`);

      const optLines = buildItemOptionsLines(it);
      for (const c of optLines) p(`${c}\n`);
    }

    p(`${line()}\n`);
    p(`${kv("Subtotal", R(N(data.subtotal)))}\n`);
    if (N(admin) !== 0) p(`${kv("Biaya Admin", `${admin > 0 ? "+ " : ""}${R(Math.abs(N(admin)))}`)}\n`);
    if (N(service) !== 0) p(`${kv("Service", `${service > 0 ? "+ " : ""}${R(Math.abs(N(service)))}`)}\n`);

    p(CMD.TEXT_2H);
    p(`${kv("Total", R(totalToPrint))}\n`);
    p(CMD.TEXT_NORMAL);
    p(`${kv("Uang Diterima", R(N(data.amountReceived)))}\n`);
    p(`${kv("Kembalian", R(N(data.change)))}\n`);
    p(`${line()}\n`);
    p(CMD.ALIGN_C);
    p(`Terima kasih\n`);
    p(CMD.FEED + CMD.FEED + CMD.FEED + CMD.FEED);
    p(CMD.CUT_FULL);

    if (DEBUG_MODE) {
      // Tambahkan blok debug di akhir (opsional)
      const dbg: string[] = [];
      dbg.push(CMD.INIT, CMD.ALIGN_L, "DEBUG:\n");
      dbg.push(`admin=${admin}, service=${service}\n`);
      dbg.push(`items=${data.items?.length || 0}\n`);
      try {
        const first = data.items?.[0];
        const tcount = Array.isArray(first?.note?.toppings)
          ? first!.note!.toppings!.length
          : 0;
        dbg.push(`firstItemToppings=${tcount}\n`);
      } catch {}
      dbg.push(CMD.FEED + CMD.FEED);
      await this.writeRaw(dbg.join(""));
    }

    await this.writeRaw(chunks.join(""));
  },

  async testPrint(mac: string) {
    await this.ensureConnected(mac);
    await this.writeRaw(
      CMD.INIT +
        CMD.ALIGN_C +
        CMD.TEXT_2H +
        "TEST PRINT\n" +
        CMD.TEXT_NORMAL +
        "Printer OK\n\n\n" +
        CMD.CUT_FULL
    );
  },

  showSetupInstructions() {
    const s = this.getStatus();
    if (s.available) return;
    Alert.alert("Bluetooth Setup", s.suggestions.join("\n"), [{ text: "OK" }]);
  },
};
