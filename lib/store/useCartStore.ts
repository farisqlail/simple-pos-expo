import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string; // unik: kombinasi nama + opsi
  name: string;
  unitBasePrice: number;   // harga dasar per unit
  unitAddonsPrice: number; // total harga addons per unit (size+sugar+toppings)
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
  removeItem: (id: string) => void;
  incItem: (id: string) => void;
  decItem: (id: string) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const exist = state.items.find((it) => it.id === item.id);
          if (exist) {
            return {
              items: state.items.map((it) =>
                it.id === item.id
                  ? { ...it, quantity: it.quantity + item.quantity }
                  : it
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((it) => it.id !== id) })),
      incItem: (id) =>
        set((state) => ({
          items: state.items.map((it) =>
            it.id === id ? { ...it, quantity: it.quantity + 1 } : it
          ),
        })),
      decItem: (id) =>
        set((state) => ({
          items: state.items
            .map((it) =>
              it.id === id
                ? { ...it, quantity: Math.max(it.quantity - 1, 0) }
                : it
            )
            .filter((it) => it.quantity > 0),
        })),
      clearCart: () => set({ items: [] }),
    }),
    { name: "cart-storage" }
  )
);
