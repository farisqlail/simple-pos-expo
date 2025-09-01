// lib/printer.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform, PermissionsAndroid } from "react-native";
import RNBluetoothClassic from "react-native-bluetooth-classic";
// Docs: https://kenjdavidson.github.io/react-native-bluetooth-classic/
import * as UPNG from "upng-js";
import { decode as b64ToArrayBuffer } from "base64-arraybuffer";

/* =========================
 *  Tipe Data & Util Umum
 * ========================= */

export type ReceiptItem = {
  name: string;
  qty: number;
  price: number;
  details?: string; // gabungan "Jenis/Topping/Catatan" bila ada
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
  storeLogoUrl?: string; // URL/base64 PNG/WebP untuk logo
};

const STORAGE_ACTIVE_PRINTER = "printer:active_mac";
const R = (n: number) =>
  "Rp " +
  (Number(n) || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

// ESC/POS constants
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

/* =========================
 *  Izin Bluetooth Android
 * ========================= */
async function ensureAndroidBtPermissions() {
  if (Platform.OS !== "android") return;

  const perms: Array<PermissionsAndroid.Permission> = [
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN as unknown as PermissionsAndroid.Permission,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT as unknown as PermissionsAndroid.Permission,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION as unknown as PermissionsAndroid.Permission,
  ];

  const statuses = await PermissionsAndroid.requestMultiple(perms);
  const denied = Object.values(statuses).some(
    (s) => s !== PermissionsAndroid.RESULTS.GRANTED
  );
  if (denied) throw new Error("Izin Bluetooth ditolak");
}

/* ==========================================
 *  Gambar → ESC/POS Raster (GS v 0) Utils
 * ========================================== */

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

/** Resize RGBA (nearest-neighbor) ke lebar target */
function resizeRGBA(
  src: Uint8Array,
  sw: number,
  sh: number,
  tw: number
): { data: Uint8Array; w: number; h: number } {
  const scale = tw / sw;
  const th = Math.max(1, Math.round(sh * scale));
  const dst = new Uint8Array(tw * th * 4);

  for (let y = 0; y < th; y++) {
    const sy = Math.min(sh - 1, Math.floor(y / scale));
    for (let x = 0; x < tw; x++) {
      const sx = Math.min(sw - 1, Math.floor(x / scale));
      const si = (sy * sw + sx) * 4;
      const di = (y * tw + x) * 4;
      dst[di] = src[si];
      dst[di + 1] = src[si + 1];
      dst[di + 2] = src[si + 2];
      dst[di + 3] = src[si + 3];
    }
  }
  return { data: dst, w: tw, h: th };
}

/** RGBA → 1-bit packed (MSB→LSB) thresholding sederhana */
function rgbaToMonoPacked(
  rgba: Uint8Array,
  w: number,
  h: number,
  threshold = 185
): Uint8Array {
  const rowBytes = Math.ceil(w / 8);
  const out = new Uint8Array(rowBytes * h);
  let oi = 0;

  for (let y = 0; y < h; y++) {
    let byte = 0,
      bit = 7;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = rgba[i],
        g = rgba[i + 1],
        b = rgba[i + 2],
        a = rgba[i + 3];
      // luminance + alpha
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) * (a / 255);
      const isBlack = lum < threshold ? 1 : 0; // 1 = tinta (hitam)
      if (isBlack) byte |= 1 << bit;
      bit--;
      if (bit < 0) {
        out[oi++] = byte;
        byte = 0;
        bit = 7;
      }
    }
    if (bit !== 7) out[oi++] = byte; // sisa pada akhir baris
  }
  return out;
}

/** Tulis GS v 0 (raster bit image) ke printer */
async function writeRasterImage(
  write: (data: string | Uint8Array) => Promise<void>,
  mono: Uint8Array,
  w: number,
  h: number,
  mode: number = 0
) {
  // GS v 0 m xL xH yL yH [data]
  const cmd = new Uint8Array(8);
  cmd[0] = 0x1d; // GS
  cmd[1] = 0x76; // 'v'
  cmd[2] = 0x30; // '0'
  cmd[3] = mode & 0x03; // 0 normal
  const bytesPerRow = Math.ceil(w / 8);
  cmd[4] = bytesPerRow & 0xff; // xL
  cmd[5] = (bytesPerRow >> 8) & 0xff; // xH
  cmd[6] = h & 0xff; // yL
  cmd[7] = (h >> 8) & 0xff; // yH

  await write(cmd);
  await write(mono);
  await write("\n"); // feed 1 line
}

/** Ambil PNG/WebP dari URL/base64 → cetak sebagai raster pada lebar maxWidth */
async function printLogoFromUrl(
  url: string,
  write: (d: string | Uint8Array) => Promise<void>,
  maxWidth = 384
) {
  try {
    let arrBuf: ArrayBuffer;

    if (/^data:image\/png;base64,/.test(url)) {
      arrBuf = b64ToArrayBuffer(url.split(",")[1]);
    } else {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      arrBuf = await res.arrayBuffer();
    }

    // Decode (PNG/WebP) → RGBA
    const img = UPNG.decode(arrBuf);
    const frames = UPNG.toRGBA8(img); // ArrayBuffer[]
    const rgba = new Uint8Array(frames[0]);
    const sw = img.width,
      sh = img.height;

    // Skala bila perlu (target 58mm ≈ 384px; 80mm ≈ 576–832px)
    const targetW = clamp(maxWidth, 48, 832);
    const resized =
      sw > targetW ? resizeRGBA(rgba, sw, sh, targetW) : { data: rgba, w: sw, h: sh };

    // Ke 1-bit
    const mono = rgbaToMonoPacked(resized.data, resized.w, resized.h, 185);

    // Center
    await write(ESC + "a" + "\x01");
    await writeRasterImage(write, mono, resized.w, resized.h, 0);
  } catch (e) {
    console.log("Print logo failed:", e);
    // Jangan block cetak struk kalau logo gagal
  }
}

/* =========================
 *  Printer Service
 * ========================= */

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

    // Kalau sudah connected, skip
    const connected = await RNBluetoothClassic.getConnectedDevices?.();
    const already = (connected || []).find(
      (d: any) => (d.address || d.id) === mac
    );
    if (already) {
      activeDevice = { address: mac };
      return;
    }

    // Putuskan koneksi lama jika ada
    try {
      await RNBluetoothClassic.disconnectFromDevice?.(activeDevice?.address);
    } catch {}

    // Connect SPP (RFCOMM)
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

  async writeRaw(data: string | Uint8Array) {
    if (!activeDevice) throw new Error("Belum terhubung ke printer");

    if (typeof data !== "string") {
      // Convert bytes → latin-1 string
      data = String.fromCharCode(...data);
    }
    await RNBluetoothClassic.writeToDevice(activeDevice.address, data);
  },

  /** Cetak struk lengkap + logo (opsional) */
  async printReceipt(mac: string, data: ReceiptData) {
    if (!this.isAvailable()) throw new Error("Bluetooth module tidak tersedia");
    await this.ensureConnected(mac);

    // Lebar karakter 32 kolom (font normal) untuk 58mm
    const width = 32;
    const line = (ch = "-") => ch.repeat(width);
    const padR = (s: string, len: number) =>
      s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length);
    const kv = (k: string, v: string) => padR(k, width - v.length) + v;

    const chunks: string[] = [];
    const p = (s: string) => chunks.push(s);

    p(CMD.INIT);

    // === Cetak Logo (jika ada) ===
    if (data.storeLogoUrl) {
      // flush yang sudah terkumpul agar state ESC bersih
      if (chunks.length) {
        await this.writeRaw(chunks.join(""));
        chunks.length = 0;
      }
      try {
        // 384px cocok untuk printer 58mm. Untuk 80mm gunakan 576–832.
        await printLogoFromUrl(
          data.storeLogoUrl,
          (d) => this.writeRaw(d),
          384
        );
      } catch (e) {
        console.log("Logo print error:", e);
      }
    }

    // === Header Toko ===
    p(CMD.ALIGN_C);
    p(CMD.TEXT_2H);
    p(`${data.storeName}\n`);
    p(CMD.TEXT_NORMAL);
    p(`${data.storeAddress}\n`);
    p(`${line()}\n`);

    // === Info Transaksi ===
    p(CMD.ALIGN_L);
    p(`${kv("Invoice", data.invoice)}\n`);
    p(`${kv("Tanggal", data.date)}\n`);
    p(`${kv("Metode", data.paymentMethod)}\n`);
    p(`${line()}\n`);

    // === Item ===
    for (const it of data.items) {
      const left = `${it.qty}x ${it.name}`;
      const right = R(it.price);
      p(`${kv(left, right)}\n`);
      if (it.details) {
        const clean = it.details.replace(/\s+/g, " ");
        const wrap = new RegExp(`.{1,${width - 2}}`, "g");
        for (const c of clean.match(wrap) || []) p(`  ${c}\n`);
      }
    }

    // === Ringkasan ===
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

    // === Footer ===
    p(CMD.ALIGN_C);
    p(`Terima kasih 🙏\n\n\n`);
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

export default PrinterService;
