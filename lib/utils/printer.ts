// lib/printer.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BluetoothManager,
  BluetoothEscposPrinter,
} from "react-native-bluetooth-escpos-printer";

export type ReceiptItem = { name: string; qty: number; price: number; details?: string };
export type ReceiptData = {
  storeName: string;
  storeAddress: string;
  invoice: string;
  date: string;
  paymentMethod: string; // e.g. "Tunai"
  subtotal: number;
  adminFee?: number;
  service?: number;
  total: number;
  amountReceived: number;
  change: number;
  items: ReceiptItem[];
  storeLogoUrl?: string; // opsional
};

const STORAGE_ACTIVE_PRINTER = "printer:active_mac";

const R = (n: number) =>
  "Rp " + (Number(n) || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

export const PrinterService = {
  async getPaired(): Promise<{ name: string; address: string }[]> {
    const isEnabled = await BluetoothManager.isBluetoothEnabled();
    if (!isEnabled) {
      // coba enable (akan prompt)
      try { await BluetoothManager.enableBluetooth(); } catch {}
    }
    const paired = await BluetoothManager.getBondedPeripherals();
    // paired: [{name, address, ...}]
    return paired?.map((d: any) => ({ name: d.name, address: d.address })) ?? [];
  },

  async setActive(mac: string) {
    await AsyncStorage.setItem(STORAGE_ACTIVE_PRINTER, mac);
  },

  async getActive(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_ACTIVE_PRINTER);
  },

  async ensureConnected(mac: string) {
    // jika sudah connect biarkan, kalau gagal connect -> connect
    try {
      await BluetoothManager.connect(mac); // idempotent on lib ini
    } catch (e) {
      // retry sekali
      await BluetoothManager.connect(mac);
    }
  },

  // Print struk sederhana teks ESC/POS (58/80mm)
  async printReceipt(mac: string, data: ReceiptData) {
    await this.ensureConnected(mac);

    // Lebar char untuk 58mm biasanya 32, 80mm bisa 48. Kita pakai 32 default.
    const width = 32;

    const line = (ch = "-") => ch.repeat(width);
    const padR = (s: string, len: number) => (s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length));
    const padL = (s: string, len: number) => (s.length >= len ? s.slice(-len) : " ".repeat(len - s.length) + s);
    const kv = (k: string, v: string) => padR(k, width - v.length) + v;

    await BluetoothEscposPrinter.printerInit();
    await BluetoothEscposPrinter.setBlob(0); // text mode
    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    await BluetoothEscposPrinter.setTextSize(1, 1);
    await BluetoothEscposPrinter.printText(`${data.storeName}\n`, {});
    await BluetoothEscposPrinter.setTextSize(0, 0);
    await BluetoothEscposPrinter.printText(`${data.storeAddress}\n`, {});
    await BluetoothEscposPrinter.printText(`${line()}\n`, {});

    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
    await BluetoothEscposPrinter.printText(`${kv("Invoice", data.invoice)}\n`, {});
    await BluetoothEscposPrinter.printText(`${kv("Tanggal", data.date)}\n`, {});
    await BluetoothEscposPrinter.printText(`${kv("Metode", data.paymentMethod)}\n`, {});
    await BluetoothEscposPrinter.printText(`${line()}\n`, {});

    // Items
    for (const it of data.items) {
      const left = `${it.qty}x ${it.name}`;
      const right = R(it.price);
      await BluetoothEscposPrinter.printText(`${kv(left, right)}\n`, {});
      if (it.details) {
        // detail di bawah, wrap sederhana
        const details = it.details.replace(/\s+/g, " ");
        // pecah manual agar tak kepanjangan
        const chunk = (str: string, n: number) =>
          str.match(new RegExp(`.{1,${n}}`, "g")) || [];
        for (const c of chunk(details, width)) {
          await BluetoothEscposPrinter.printText(`  ${c}\n`, {});
        }
      }
    }

    await BluetoothEscposPrinter.printText(`${line()}\n`, {});
    await BluetoothEscposPrinter.printText(`${kv("Subtotal", R(data.subtotal))}\n`, {});
    if ((data.adminFee || 0) > 0) {
      await BluetoothEscposPrinter.printText(`${kv("Biaya Admin", `+ ${R(data.adminFee!)}`)}\n`, {});
    }
    if ((data.service || 0) > 0) {
      await BluetoothEscposPrinter.printText(`${kv("Service", `+ ${R(data.service!)}`)}\n`, {});
    }
    await BluetoothEscposPrinter.setTextSize(1, 1);
    await BluetoothEscposPrinter.printText(`${kv("Total", R(data.total))}\n`, {});
    await BluetoothEscposPrinter.setTextSize(0, 0);
    await BluetoothEscposPrinter.printText(`${kv("Uang Diterima", R(data.amountReceived))}\n`, {});
    await BluetoothEscposPrinter.printText(`${kv("Kembalian", R(data.change))}\n`, {});
    await BluetoothEscposPrinter.printText(`${line()}\n`, {});

    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
    await BluetoothEscposPrinter.printText(`Terima kasih 🙏\n`, {});
    await BluetoothEscposPrinter.printText(`\n\n`, {}); // feed
    await BluetoothEscposPrinter.cutPaper(); // beberapa printer abaikan (ok)
  },
};
