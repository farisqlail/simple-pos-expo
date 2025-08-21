// lib/printer.ts - Robust printer service with fallback options
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform } from "react-native";

// Multiple library options - try different approaches
let BluetoothClassic: any = null;
let isLibraryLoaded = false;
let loadError: string = '';

// Try to load different bluetooth libraries
const tryLoadBluetoothLibrary = () => {
  if (isLibraryLoaded) return;
  
  // Method 1: Try react-native-bluetooth-classic
  try {
    BluetoothClassic = require('react-native-bluetooth-classic');
    if (BluetoothClassic && BluetoothClassic.default) {
      BluetoothClassic = BluetoothClassic.default;
    }
    if (BluetoothClassic && typeof BluetoothClassic.isBluetoothEnabled === 'function') {
      isLibraryLoaded = true;
      console.log('✅ react-native-bluetooth-classic loaded successfully');
      return;
    }
  } catch (error) {
    console.log('❌ react-native-bluetooth-classic failed:', error.message);
    loadError = error.message;
  }

  // Method 2: Try @react-native-bluetooth-classic/bluetooth-classic
  try {
    BluetoothClassic = require('@react-native-bluetooth-classic/bluetooth-classic');
    if (BluetoothClassic && BluetoothClassic.default) {
      BluetoothClassic = BluetoothClassic.default;
    }
    if (BluetoothClassic && typeof BluetoothClassic.isBluetoothEnabled === 'function') {
      isLibraryLoaded = true;
      console.log('✅ @react-native-bluetooth-classic/bluetooth-classic loaded successfully');
      return;
    }
  } catch (error) {
    console.log('❌ @react-native-bluetooth-classic/bluetooth-classic failed:', error.message);
  }

  // Method 3: Try react-native-bluetooth-serial
  try {
    BluetoothClassic = require('react-native-bluetooth-serial');
    if (BluetoothClassic && BluetoothClassic.default) {
      BluetoothClassic = BluetoothClassic.default;
    }
    // This library has different method names
    if (BluetoothClassic && typeof BluetoothClassic.isEnabled === 'function') {
      // Create adapter for consistent API
      BluetoothClassic.isBluetoothEnabled = BluetoothClassic.isEnabled;
      BluetoothClassic.getBondedDevices = BluetoothClassic.list;
      BluetoothClassic.connectToDevice = BluetoothClassic.connect;
      isLibraryLoaded = true;
      console.log('✅ react-native-bluetooth-serial loaded successfully');
      return;
    }
  } catch (error) {
    console.log('❌ react-native-bluetooth-serial failed:', error.message);
  }

  console.log('❌ No bluetooth library could be loaded');
};

// Initialize on import
tryLoadBluetoothLibrary();

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

let activeConnection: any = null;

export const PrinterService = {
  // Check if any bluetooth library is available
  isAvailable(): boolean {
    return isLibraryLoaded && BluetoothClassic !== null;
  },

  // Get detailed status
  getStatus(): { available: boolean; error?: string; suggestions: string[] } {
    if (this.isAvailable()) {
      return { available: true, suggestions: [] };
    }

    const suggestions = [
      "Install a Bluetooth library:",
      "",
      "Option 1 (Recommended):",
      "npm install react-native-bluetooth-classic",
      "",
      "Option 2:",
      "npm install react-native-bluetooth-serial",
      "",
      "Option 3:",
      "npm install @react-native-bluetooth-classic/bluetooth-classic",
      "",
      "After installation:",
      "- For React Native 0.60+: cd ios && pod install",
      "- Add Android permissions to AndroidManifest.xml",
      "- Rebuild the app: npx react-native run-android"
    ];

    return {
      available: false,
      error: loadError || "No bluetooth library found",
      suggestions
    };
  },

  async getPaired(): Promise<{ name: string; address: string }[]> {
    if (!this.isAvailable()) {
      const status = this.getStatus();
      throw new Error(`Bluetooth not available: ${status.error}\n\nPlease install:\n${status.suggestions.slice(0, 4).join('\n')}`);
    }

    try {
      const isEnabled = await BluetoothClassic.isBluetoothEnabled();
      if (!isEnabled) {
        // Try to enable bluetooth
        if (Platform.OS === 'android' && BluetoothClassic.requestBluetoothEnabled) {
          try {
            await BluetoothClassic.requestBluetoothEnabled();
          } catch (e) {
            throw new Error('Bluetooth is disabled. Please enable Bluetooth in settings.');
          }
        } else {
          throw new Error('Bluetooth is disabled. Please enable Bluetooth in settings.');
        }
      }
      
      const devices = await BluetoothClassic.getBondedDevices();
      return devices.map((device: any) => ({
        name: device.name || device.deviceName || 'Unknown Device',
        address: device.address || device.id
      }));
    } catch (error) {
      console.error('Error getting paired devices:', error);
      throw new Error(`Failed to get Bluetooth devices: ${error.message}`);
    }
  },

  async setActive(mac: string) {
    await AsyncStorage.setItem(STORAGE_ACTIVE_PRINTER, mac);
  },

  async getActive(): Promise<string | null> {
    return AsyncStorage.getItem(STORAGE_ACTIVE_PRINTER);
  },

  async ensureConnected(mac: string) {
    if (!this.isAvailable()) {
      throw new Error('Bluetooth library not available');
    }

    try {
      // Check existing connection
      if (activeConnection && 
          activeConnection.address === mac && 
          typeof activeConnection.isConnected === 'function' &&
          await activeConnection.isConnected()) {
        return;
      }

      // Disconnect existing
      if (activeConnection) {
        try {
          if (typeof activeConnection.disconnect === 'function') {
            await activeConnection.disconnect();
          }
        } catch (e) {
          console.log('Disconnect warning:', e);
        }
      }

      // Connect to device
      activeConnection = await BluetoothClassic.connectToDevice(mac);
      
      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Verify connection
      if (typeof activeConnection.isConnected === 'function') {
        const connected = await activeConnection.isConnected();
        if (!connected) {
          throw new Error('Connection failed - device not connected');
        }
      }

    } catch (e) {
      activeConnection = null;
      throw new Error(`Failed to connect to printer ${mac}: ${e.message}`);
    }
  },

  async disconnect() {
    try {
      if (activeConnection && typeof activeConnection.disconnect === 'function') {
        await activeConnection.disconnect();
      }
    } catch (error) {
      console.log('Disconnect error:', error);
    } finally {
      activeConnection = null;
    }
  },

  async printText(text: string) {
    if (!activeConnection) {
      throw new Error('No printer connection');
    }
    
    try {
      if (typeof activeConnection.write === 'function') {
        await activeConnection.write(text);
      } else if (typeof activeConnection.writeToDevice === 'function') {
        await activeConnection.writeToDevice(text);
      } else {
        throw new Error('Printer write method not found');
      }
    } catch (error) {
      throw new Error(`Print failed: ${error.message}`);
    }
  },

  // Mock print function for testing when bluetooth is not available
  async mockPrintReceipt(data: ReceiptData) {
    console.log('=== MOCK PRINT RECEIPT ===');
    console.log(`Store: ${data.storeName}`);
    console.log(`Address: ${data.storeAddress}`);
    console.log(`Invoice: ${data.invoice}`);
    console.log(`Date: ${data.date}`);
    console.log(`Payment: ${data.paymentMethod}`);
    console.log('--- Items ---');
    data.items.forEach(item => {
      console.log(`${item.qty}x ${item.name} - ${R(item.price)}`);
      if (item.details) console.log(`  ${item.details}`);
    });
    console.log('--- Summary ---');
    console.log(`Subtotal: ${R(data.subtotal)}`);
    if (data.adminFee) console.log(`Admin Fee: ${R(data.adminFee)}`);
    if (data.service) console.log(`Service: ${R(data.service)}`);
    console.log(`Total: ${R(data.total)}`);
    console.log(`Received: ${R(data.amountReceived)}`);
    console.log(`Change: ${R(data.change)}`);
    console.log('=== END MOCK RECEIPT ===');
    
    return Promise.resolve();
  },

  async printReceipt(mac: string, data: ReceiptData) {
    if (!this.isAvailable()) {
      // Fallback to mock print for development
      console.log('⚠️ Bluetooth not available, using mock print');
      await this.mockPrintReceipt(data);
      return;
    }

    await this.ensureConnected(mac);

    const width = 32;
    const line = (ch = "-") => ch.repeat(width);
    const padR = (s: string, len: number) =>
      s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length);
    const kv = (k: string, v: string) => padR(k, width - v.length) + v;

    try {
      await this.printText(Commands.INIT);
      await this.printText(Commands.ALIGN_CENTER);
      await this.printText(Commands.TEXT_FORMAT_2H);
      await this.printText(`${data.storeName}\n`);
      
      await this.printText(Commands.TEXT_FORMAT_NORMAL);
      await this.printText(`${data.storeAddress}\n`);
      await this.printText(`${line()}\n`);

      await this.printText(Commands.ALIGN_LEFT);
      await this.printText(`${kv("Invoice", data.invoice)}\n`);
      await this.printText(`${kv("Tanggal", data.date)}\n`);
      await this.printText(`${kv("Metode", data.paymentMethod)}\n`);
      await this.printText(`${line()}\n`);

      for (const it of data.items) {
        const left = `${it.qty}x ${it.name}`;
        const right = R(it.price);
        await this.printText(`${kv(left, right)}\n`);
        
        if (it.details) {
          const details = it.details.replace(/\s+/g, " ");
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

      await this.printText(Commands.TEXT_FORMAT_2H);
      await this.printText(`${kv("Total", R(data.total))}\n`);
      await this.printText(Commands.TEXT_FORMAT_NORMAL);
      
      await this.printText(`${kv("Uang Diterima", R(data.amountReceived))}\n`);
      await this.printText(`${kv("Kembalian", R(data.change))}\n`);
      await this.printText(`${line()}\n`);

      await this.printText(Commands.ALIGN_CENTER);
      await this.printText(`Terima kasih 🙏\n`);
      await this.printText(`\n\n`);
      await this.printText(Commands.CUT_PAPER);
      
    } catch (error) {
      throw new Error(`Print failed: ${error.message}`);
    }
  },

  async testPrint(mac: string) {
    if (!this.isAvailable()) {
      console.log('=== MOCK TEST PRINT ===');
      console.log('TEST PRINT');
      console.log('Printer connected successfully!');
      console.log(`Date: ${new Date().toLocaleString('id-ID')}`);
      console.log('=== END MOCK TEST ===');
      return;
    }
    
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
      throw new Error(`Test print failed: ${error.message}`);
    }
  },

  // Show setup instructions
  showSetupInstructions() {
    const status = this.getStatus();
    Alert.alert(
      'Bluetooth Setup Required',
      status.suggestions.join('\n'),
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Copy Install Command', 
          onPress: () => {
            // You can implement clipboard copy here if needed
            console.log('Copy: npm install react-native-bluetooth-classic');
          }
        }
      ]
    );
  }
};