// lib/printer.ts - Alternative using react-native-bluetooth-classic
import AsyncStorage from "@react-native-async-storage/async-storage";
import BluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';

export type ReceiptItem = {
  name: string;
  qty: number;
  price: number;
  details?: string;
};

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
  "Rp " +
  (Number(n) || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';

const Commands = {
  INIT: ESC + '@',
  TEXT_FORMAT_NORMAL: ESC + '!' + '\x00',
  TEXT_FORMAT_2H: ESC + '!' + '\x10',
  TEXT_FORMAT_2W: ESC + '!' + '\x20',
  TEXT_FORMAT_2H2W: ESC + '!' + '\x30',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  FEED_LINE: '\n',
  CUT_PAPER: GS + 'V' + '\x42' + '\x00',
  DRAWER_OPEN: ESC + 'p' + '\x00' + '\x19' + '\xFA',
};

let activeConnection: BluetoothDevice | null = null;

export const PrinterService = {
  async getPaired(): Promise<{ name: string; address: string }[]> {
    try {
      const isEnabled = await BluetoothClassic.isBluetoothEnabled();
      if (!isEnabled) {
        try {
          await BluetoothClassic.requestBluetoothEnabled();
        } catch (e) {
          console.log('Bluetooth enable failed:', e);
        }
      }
      
      const devices = await BluetoothClassic.getBondedDevices();
      return devices.map((device: BluetoothDevice) => ({
        name: device.name || 'Unknown Device',
        address: device.address
      }));
    } catch (error) {
      console.error('Error getting paired devices:', error);
      return [];
    }
  },

  async setActive(mac: string) {
    await AsyncStorage.setItem(STORAGE_ACTIVE_PRINTER, mac);
  },

  async getActive(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_ACTIVE_PRINTER);
  },

  async ensureConnected(mac: string) {
    try {
      // Check if we already have an active connection to this device
      if (activeConnection && activeConnection.address === mac && activeConnection.isConnected()) {
        return;
      }

      // Disconnect any existing connection
      if (activeConnection && activeConnection.isConnected()) {
        await activeConnection.disconnect();
      }

      // Get device and connect
      const devices = await BluetoothClassic.getBondedDevices();
      const device = devices.find(d => d.address === mac);
      
      if (!device) {
        throw new Error(`Device with address ${mac} not found in paired devices`);
      }

      activeConnection = await BluetoothClassic.connectToDevice(device.address);
      
      // Wait a bit for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (e) {
      // Retry once
      try {
        const devices = await BluetoothClassic.getBondedDevices();
        const device = devices.find(d => d.address === mac);
        if (device) {
          activeConnection = await BluetoothClassic.connectToDevice(device.address);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (retryError) {
        throw new Error(`Failed to connect to printer: ${retryError}`);
      }
    }
  },

  async disconnect() {
    try {
      if (activeConnection && activeConnection.isConnected()) {
        await activeConnection.disconnect();
        activeConnection = null;
      }
    } catch (error) {
      console.log('Disconnect error (may already be disconnected):', error);
    }
  },

  async printText(text: string) {
    if (!activeConnection || !activeConnection.isConnected()) {
      throw new Error('No active printer connection');
    }
    
    try {
      await activeConnection.write(text);
    } catch (error) {
      throw new Error(`Failed to print: ${error}`);
    }
  },

  // Print struk sederhana teks ESC/POS (58/80mm)
  async printReceipt(mac: string, data: ReceiptData) {
    await this.ensureConnected(mac);

    // Lebar char untuk 58mm biasanya 32, 80mm bisa 48. Kita pakai 32 default.
    const width = 32;

    const line = (ch = "-") => ch.repeat(width);
    const padR = (s: string, len: number) =>
      s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length);
    const padL = (s: string, len: number) =>
      s.length >= len ? s.slice(-len) : " ".repeat(len - s.length) + s;
    const kv = (k: string, v: string) => padR(k, width - v.length) + v;

    try {
      // Initialize printer
      await this.printText(Commands.INIT);
      
      // Store header - centered, double height
      await this.printText(Commands.ALIGN_CENTER);
      await this.printText(Commands.TEXT_FORMAT_2H);
      await this.printText(`${data.storeName}\n`);
      
      // Store address - normal text
      await this.printText(Commands.TEXT_FORMAT_NORMAL);
      await this.printText(`${data.storeAddress}\n`);
      await this.printText(`${line()}\n`);

      // Invoice details - left aligned
      await this.printText(Commands.ALIGN_LEFT);
      await this.printText(`${kv("Invoice", data.invoice)}\n`);
      await this.printText(`${kv("Tanggal", data.date)}\n`);
      await this.printText(`${kv("Metode", data.paymentMethod)}\n`);
      await this.printText(`${line()}\n`);

      // Items
      for (const it of data.items) {
        const left = `${it.qty}x ${it.name}`;
        const right = R(it.price);
        await this.printText(`${kv(left, right)}\n`);
        
        if (it.details) {
          // detail di bawah, wrap sederhana
          const details = it.details.replace(/\s+/g, " ");
          // pecah manual agar tak kepanjangan
          const chunk = (str: string, n: number) =>
            str.match(new RegExp(`.{1,${n}}`, "g")) || [];
          for (const c of chunk(details, width)) {
            await this.printText(`  ${c}\n`);
          }
        }
      }

      await this.printText(`${line()}\n`);
      await this.printText(`${kv("Subtotal", R(data.subtotal))}\n`);
      
      if ((data.adminFee || 0) > 0) {
        await this.printText(`${kv("Biaya Admin", `+ ${R(data.adminFee!)}`)}\n`);
      }
      
      if ((data.service || 0) > 0) {
        await this.printText(`${kv("Service", `+ ${R(data.service!)}`)}\n`);
      }

      // Total - double height
      await this.printText(Commands.TEXT_FORMAT_2H);
      await this.printText(`${kv("Total", R(data.total))}\n`);
      await this.printText(Commands.TEXT_FORMAT_NORMAL);
      
      await this.printText(`${kv("Uang Diterima", R(data.amountReceived))}\n`);
      await this.printText(`${kv("Kembalian", R(data.change))}\n`);
      await this.printText(`${line()}\n`);

      // Footer - centered
      await this.printText(Commands.ALIGN_CENTER);
      await this.printText(`Terima kasih 🙏\n`);
      await this.printText(`\n\n`); // feed
      
      // Cut paper (if supported)
      await this.printText(Commands.CUT_PAPER);
      
    } catch (error) {
      throw new Error(`Print failed: ${error}`);
    }
  },

  // Test print function
  async testPrint(mac: string) {
    await this.ensureConnected(mac);
    
    try {
      await this.printText(Commands.INIT);
      await this.printText(Commands.ALIGN_CENTER);
      await this.printText(Commands.TEXT_FORMAT_2H);
      await this.printText("TEST PRINT\n");
      await this.printText(Commands.TEXT_FORMAT_NORMAL);
      await this.printText("Printer connected successfully!\n");
      await this.printText(`Date: ${new Date().toLocaleString('id-ID')}\n`);
      await this.printText("\n\n");
      await this.printText(Commands.CUT_PAPER);
    } catch (error) {
      throw new Error(`Test print failed: ${error}`);
    }
  }
};