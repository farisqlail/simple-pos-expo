import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type CartItem = {
  id: string;               // key unik (nama+opsi)
  prodId: string;           // ⬅️ WAJIB: id produk utk API
  name: string;
  unitBasePrice: number;
  unitAddonsPrice: number;
  quantity: number;
  note?: {
    size?: string;
    sugar?: string;
    toppings?: string[];
    message?: string;
    takeaway?: boolean;
  };
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  inc: (id: string) => void;
  dec: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((s) => {
          // gabungkan kalau id sama
          const idx = s.items.findIndex((x) => x.id === item.id);
          if (idx >= 0) {
            const next = [...s.items];
            next[idx] = {
              ...next[idx],
              quantity: next[idx].quantity + item.quantity,
            };
            return { items: next };
          }
          return { items: [...s.items, item] };
        }),
      inc: (id) =>
        set((s) => ({
          items: s.items.map((x) => (x.id === id ? { ...x, quantity: x.quantity + 1 } : x)),
        })),
      dec: (id) =>
        set((s) => ({
          items: s.items
            .map((x) => (x.id === id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)),
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "cart_v1",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);