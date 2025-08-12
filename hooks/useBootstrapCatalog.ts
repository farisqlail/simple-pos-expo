import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPaymentMethods } from "@/lib/api/payment";
import { getProducts } from "@/lib/api/product_catalog";

export type BootstrapResult = {
  paymentsKey: string | null;
  productsKey: string | null;
};

export type BootstrapState = {
  visible: boolean;
  steps: { key: string; label: string; state: "pending" | "loading" | "done" | "error"; error?: string | null }[];
};

const makeSteps = (): BootstrapState["steps"] => [
  { key: "payments", label: "Mengambil metode pembayaran…", state: "pending" },
  { key: "products", label: "Mengambil daftar produk…", state: "pending" },
];

export function useBootstrapCatalog() {
  const [state, setState] = useState<BootstrapState>({ visible: false, steps: makeSteps() });

  const setStep = (key: string, patch: Partial<BootstrapState["steps"][number]>) => {
    setState((s) => ({
      ...s,
      steps: s.steps.map((st) => (st.key === key ? { ...st, ...patch } : st)),
    }));
  };

  const start = useCallback(
    async (params: { appid: string; locationId: number | string; token: string }) => {
      const { appid, locationId, token } = params;
      const paymentsKey = `payments:${appid}:${locationId}`;
      const productsKey = `products:${appid}:${locationId}`;
      setState({ visible: true, steps: makeSteps() });

      try {
        // 1) Payment methods
        setStep("payments", { state: "loading", error: null });
        const pmRes = await getPaymentMethods(appid, locationId, token);
        if (pmRes.status !== "success") throw new Error(pmRes.message || "Gagal memuat metode pembayaran.");
        await AsyncStorage.setItem(paymentsKey, JSON.stringify({ cachedAt: Date.now(), data: pmRes.data || [] }));
        setStep("payments", { state: "done" });

        // 2) Products
        setStep("products", { state: "loading", error: null });
        const prodRes = await getProducts(appid, locationId, token);
        if (prodRes.status !== "success") throw new Error(prodRes.message || "Gagal memuat katalog produk.");
        await AsyncStorage.setItem(productsKey, JSON.stringify({ cachedAt: Date.now(), data: prodRes.data || [] }));
        setStep("products", { state: "done" });

        return { paymentsKey, productsKey } as BootstrapResult;
      } catch (e: any) {
        // tandai step yang sedang berjalan ke error (kalau ada)
        const current = state.steps.find((s) => s.state === "loading")?.key || "products";
        setStep(current, { state: "error", error: e?.message ?? "Terjadi kesalahan." });
        throw e;
      }
    },
    [state.steps]
  );

  const hide = useCallback(() => setState((s) => ({ ...s, visible: false })), []);

  return {
    visible: state.visible,
    steps: state.steps,
    start,
    hide,
  };
}