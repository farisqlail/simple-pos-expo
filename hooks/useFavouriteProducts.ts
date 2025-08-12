import { useEffect, useState } from "react";
import { getFavouriteProducts, ApiFavourite } from "@/lib/api/product";

export type UiProduct = {
  id: string | number;
  name: string;
  sold: number;
  price: number;
  image: string | null;
};

const normalize = (p: ApiFavourite): UiProduct => ({
  id: p?.id ?? String(Math.random()),
  name: p?.name ?? "-",
  sold: p?.count_sell ?? 0,
  price: p?.price ?? 0,
  image: p?.image ?? null,
});

export function useFavouriteProducts(params: { appid?: string; locationId?: number; token?: string | null }) {
  const { appid, locationId, token } = params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<UiProduct[]>([]);

  useEffect(() => {
    if (!appid || !token || !locationId) return;
    const ctrl = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getFavouriteProducts(appid, locationId, token);
        if (ctrl.signal.aborted) return;
        const list = Array.isArray(res?.data) ? res.data! : [];
        setItems(list.map(normalize));
      } catch (e: any) {
        if (!ctrl.signal.aborted) {
          console.log("Fav products error:", e);
          setError(e?.message ?? "Gagal memuat produk favorit.");
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [appid, locationId, token]);

  return { loading, error, items };
}
