// lib/printer.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform, PermissionsAndroid } from "react-native";
import RNBluetoothClassic from "react-native-bluetooth-classic"; // <- library utama & maintained
// Docs: https://kenjdavidson.github.io/react-native-bluetooth-classic/

// ===== Types =====
export type ReceiptItem = {
  name: string;
  qty: number;
  price: number;
  details?: string;

  // Tambahan agar cocok dengan useCartStore
  note?: {
    size?: string;
    sugar?: string;
    toppings?: string[];
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
  adminFee?: number;
  service?: number;
  total: number;
  amountReceived: number;
  change: number;
  items: ReceiptItem[];
  storeLogoUrl?: string;
};

const STORAGE_ACTIVE_PRINTER = "printer:active_mac";
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
  CUT_FULL: GS + "V" + "\x41" + "\x00", // full cut, jika printer mendukung
};

let activeDevice: { address: string } | null = null;

// ===== Utils =====
async function ensureAndroidBtPermissions() {
  if (Platform.OS !== "android") return;

  const perms: Array<PermissionsAndroid.Permission> = [
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN as any,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT as any,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, // beberapa vendor masih mengecek lokasi
  ].filter(Boolean);

  const statuses = await PermissionsAndroid.requestMultiple(perms);
  const denied = Object.values(statuses).some(
    (s) => s !== PermissionsAndroid.RESULTS.GRANTED
  );
  if (denied) throw new Error("Izin Bluetooth ditolak");
}

const WIDTH = 32; // karakter lebar kertas 58mm tipikal
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
      // kata panjang melebihi max -> potong paksa
      if (w.length > max) {
        let i = 0;
        while (i < w.length) {
          const chunk = w.slice(i, i + max);
          lines.push(space + chunk);
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

// Build baris "opsi" untuk item berdasarkan note
function buildItemOptionsLines(it: ReceiptItem): string[] {
  const bullets: string[] = [];

  const sz = it?.note?.size;
  const sugar = it?.note?.sugar;
  const tops =
    it?.note?.toppings && it.note.toppings.length > 0
      ? it.note.toppings.join(", ")
      : undefined;
  const msg = it?.note?.message;
  const takeaway = it?.note?.takeaway;

  if (sz) bullets.push(`• Size: ${sz}`);
  if (sugar) bullets.push(`• Sugar: ${sugar}`);
  if (tops) bullets.push(`• Toppings: ${tops}`);
  if (typeof takeaway === "boolean") {
    bullets.push(`• ${takeaway ? "Takeaway" : "Dine-in"}`);
  }
  if (msg) bullets.push(`• Note: ${msg}`);

  // Bungkus dengan indent 2 spasi
  return bullets.flatMap((b) => wrap(b, 2));
}

// helper kecil untuk jeda async
const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

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
      // akan buka dialog enable pada Android
      const ok = await RNBluetoothClassic.requestBluetoothEnabled?.();
      if (ok === false) throw new Error("Bluetooth dimatikan");
    }

    // Ambil perangkat yang sudah paired/bonded
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

    // Jika sudah nyambung dan sama, lewati
    const connected = await RNBluetoothClassic.getConnectedDevices?.();
    const already = (connected || []).find(
      (d: any) => (d.address || d.id) === mac
    );
    if (already) {
      activeDevice = { address: mac };
      return;
    }

    // Putuskan yg lama
    try {
      await RNBluetoothClassic.disconnectFromDevice?.(activeDevice?.address);
    } catch {}

    // Connect ke SPP (RFCOMM). Banyak printer ESC/POS pakai ini.
    await RNBluetoothClassic.connectToDevice(mac, {
      CONNECTOR_TYPE: "rfcomm",
      DELIMITER: "\n",
      DEVICE_CHARSET: "ASCII",
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

  // === writeRaw dengan CHUNKING agar tidak terpotong ===
  async writeRaw(data: string | Uint8Array) {
    if (!activeDevice) throw new Error("Belum terhubung ke printer");

    // Konversi ke string (byte Latin-1 -> string)
    let payload: string;
    if (typeof data === "string") {
      payload = data;
    } else {
      payload = String.fromCharCode(...data);
    }

    // Banyak printer/RFCOMM drop data jika terlalu panjang dalam sekali tulis.
    // 256–512 byte biasanya aman; pakai 256 agar konservatif.
    const CHUNK_SIZE = 256;
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const part = payload.slice(i, i + CHUNK_SIZE);
      await RNBluetoothClassic.writeToDevice(activeDevice.address, part);
      // jeda singkat agar buffer printer sempat memproses
      await delay(8);
    }
  },

  async printReceipt(mac: string, data: ReceiptData) {
    if (!this.isAvailable()) throw new Error("Bluetooth module tidak tersedia");
    await this.ensureConnected(mac);

    const chunks: string[] = [];
    const p = (s: string) => chunks.push(s);

    // Infer tipe order dari catatan item
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
      const right = R(it.price);
      p(`${kv(left, right)}\n`);

      if (it.details) {
        for (const c of wrap(it.details, 2)) p(`${c}\n`);
      }

      const optLines = buildItemOptionsLines(it);
      for (const c of optLines) p(`${c}\n`);
    }

    p(`${line()}\n`);
    p(`${kv("Subtotal", R(data.subtotal))}\n`);
    if ((data.adminFee || 0) > 0)
      p(`${kv("Biaya Admin", `+ ${R(data.adminFee!)}`)}\n`);
    if ((data.service || 0) > 0)
      p(`${kv("Service", `+ ${R(data.service!)}`)}\n`);
    p(CMD.TEXT_2H);
    p(`${kv("Total", R(data.total))}\n`);
    p(CMD.TEXT_NORMAL);
    p(`${kv("Uang Diterima", R(data.amountReceived))}\n`);
    p(`${kv("Kembalian", R(data.change))}\n`);
    p(`${line()}\n`);
    p(CMD.ALIGN_C);
    p(`Terima kasih 🙏\n`);
    // feed ekstra agar baris terakhir tidak kepotong sebelum cut
    p(CMD.FEED + CMD.FEED + CMD.FEED + CMD.FEED);
    p(CMD.CUT_FULL);

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
