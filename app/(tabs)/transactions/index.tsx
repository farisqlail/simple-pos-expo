// app/(tabs)/transactions/index.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Dimensions,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useCartStore } from "@/lib/store/useCartStore";

import Header from "@/components/ui/Header";
import Input from "@/components/ui/Input";
import ProductCard from "@/components/ui/ProductCard";
import ProductModification from "@/components/ui/ProductModification";
import productImg from "@/assets/images/produk.png";

import { Ionicons } from "@expo/vector-icons";
import FloatingCartSummary from "@/components/ui/FloatingCartSummary";
import { useRouter } from "expo-router";

interface Option {
  name: string;
  price: number;
}

interface Product {
  productId: string;
  name: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  image?: any;
  initials?: string;
  outOfStock?: boolean;
  sizeOptions?: Option[];
  sugarOptions?: Option[];
  toppingOptions?: Option[];
}

interface CachedProducts {
  cachedAt: number;
  data: CategoryNode[];
}

interface CategoryNode {
  pcategory_id: number;
  pcategory_name: string;
  data_products: ProductNode[];
}

interface ModNode {
  mdf_id: number;
  mdf_parent: number;
  mdf_name: string;
  mdf_price: number | null;
  is_active?: "0" | "1";
}

interface ProductNode {
  product_id: number;
  product_name: string;
  product_images: string;
  product_pricenow: number;
  is_using_stock?: string | boolean;
  stockonhand?: number;
  stock?: number;
  discount_tag?: string | null;
  data_modifiers?: ModNode[];
}

const STORAGE_KEYS = {
  USER: "auth_user",
  SELECTED_LOCATION: "selected_location",
} as const;

// Configuration untuk partial loading
const BATCH_SIZE = 20; // Jumlah produk per batch
const INITIAL_LOAD_SIZE = 30; // Produk yang dimuat pertama kali

function formatPriceNoRp(n: number | string) {
  const num = typeof n === "string" ? Number(n.replace(/[^\d]/g, "")) : n;
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    num as number
  );
}

const normalizeStr = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

function toImageProp(url?: string) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return { uri: url };
  if (url.startsWith("data:image")) return { uri: url };
  if (/^[A-Za-z0-9+/=]+$/.test(url))
    return { uri: `data:image/jpeg;base64,${url}` };
  return null;
}

function extractToppings(mods?: ModNode[]): Option[] {
  if (!Array.isArray(mods) || mods.length === 0) return [];
  const children = mods.filter(
    (m) =>
      (m.mdf_parent ?? 0) !== 0 && (m.is_active ? m.is_active === "1" : true)
  );
  return children.map((m) => ({
    name: m.mdf_name ?? "-",
    price: Number(m.mdf_price ?? 0) || 0,
  }));
}

function convertProductNodeToProduct(p: ProductNode): Product {
  const outOfStock =
    (p.is_using_stock === "yes" || p.is_using_stock === true) &&
    (Number(p.stock) <= 0 || Number(p.stockonhand) <= 0);

  const imgProp = toImageProp(p.product_images) ?? null;
  const toppingOptions = extractToppings(p.data_modifiers);

  return {
    productId: String(p.product_id),
    name: p.product_name || "-",
    price: formatPriceNoRp(p.product_pricenow ?? 0),
    discount: p.discount_tag ?? undefined,
    image: imgProp || productImg,
    initials: (p.product_name || "-").slice(0, 2).toUpperCase(),
    outOfStock,
    sizeOptions: [],
    sugarOptions: [],
    toppingOptions,
  };
}

const TransactionScreen = () => {
  const [showModification, setShowModification] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const router = useRouter();

  const addItem = useCartStore((s) => s.addItem);
  const clearCart = useCartStore((s) => s.clearCart);

  // Loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [allProductsData, setAllProductsData] = useState<ProductNode[]>([]);
  const [displayedItems, setDisplayedItems] = useState<Product[]>([]);
  const [hasMoreData, setHasMoreData] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);

  // Search
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  // Grid size calculation
  const screenWidth = Dimensions.get("window").width;
  const numColumns = 3;
  const horizontalPadding = 16;
  const gap = 8;
  const itemWidth =
    (screenWidth - horizontalPadding * 2 - gap * (numColumns - 1)) / numColumns;

  // Load data dari cache dan setup initial batch
  useEffect(() => {
    (async () => {
      try {
        setInitialLoading(true);
        setError(null);

        const [rawUser, rawLoc] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.SELECTED_LOCATION),
        ]);

        const user = rawUser ? JSON.parse(rawUser) : null;
        const loc = rawLoc ? JSON.parse(rawLoc) : null;

        const appid: string | undefined = user?.appid;
        const locId: number = loc?.loc_id ?? 3365;

        if (!appid)
          throw new Error(
            "APP ID tidak ditemukan di storage. Silakan login ulang."
          );

        const cacheKey = `products:${appid}:${locId}`;
        const rawCache = await AsyncStorage.getItem(cacheKey);
        if (!rawCache) {
          setDisplayedItems([]);
          setAllProductsData([]);
          setError("Data produk belum tersedia. Silakan Sync Data di beranda.");
          return;
        }

        const parsed: CachedProducts = JSON.parse(rawCache);
        const flatProductNodes: ProductNode[] = (parsed.data || [])
          .flatMap((cat) => cat?.data_products || [])
          .filter(Boolean);

        setAllProductsData(flatProductNodes);

        // Load initial batch
        const initialBatch = flatProductNodes
          .slice(0, INITIAL_LOAD_SIZE)
          .map(convertProductNodeToProduct);

        setDisplayedItems(initialBatch);
        setCurrentBatchIndex(1);
        setHasMoreData(flatProductNodes.length > INITIAL_LOAD_SIZE);

      } catch (e: any) {
        console.log("Load local products error:", e);
        setError(e?.message ?? "Gagal memuat produk lokal.");
        setDisplayedItems([]);
        setAllProductsData([]);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  // Load more data function
  const loadMoreData = useCallback(async () => {
    if (loadingMore || !hasMoreData) return;

    setLoadingMore(true);

    // Simulasi delay untuk UX yang lebih smooth
    await new Promise(resolve => setTimeout(resolve, 200));

    const startIndex = currentBatchIndex * BATCH_SIZE;
    const endIndex = startIndex + BATCH_SIZE;
    
    const nextBatch = allProductsData
      .slice(startIndex, endIndex)
      .map(convertProductNodeToProduct);

    if (nextBatch.length > 0) {
      setDisplayedItems(prev => [...prev, ...nextBatch]);
      setCurrentBatchIndex(prev => prev + 1);
    }

    setHasMoreData(endIndex < allProductsData.length);
    setLoadingMore(false);
  }, [allProductsData, currentBatchIndex, loadingMore, hasMoreData]);

  // Filtered items berdasarkan search
  const filteredItems = useMemo(() => {
    const q = normalizeStr(debounced);
    if (!q) return displayedItems;

    // Jika ada search query, cari di semua data untuk hasil yang lengkap
    if (q) {
      const allConverted = allProductsData.map(convertProductNodeToProduct);
      return allConverted.filter((it) => {
        const name = normalizeStr(it.name);
        const price = normalizeStr(it.price);
        return name.includes(q) || price.includes(q);
      });
    }

    return displayedItems;
  }, [displayedItems, allProductsData, debounced]);

  const handleProductPress = (product: Product) => {
    if (!product.outOfStock) {
      setSelectedProduct(product);
      setShowModification(true);
    }
  };

  const handleSaveModification = (mods: {
    size?: string;
    sugar?: string;
    toppings?: string[];
    quantity: number;
    total: number;
  }) => {
    if (!selectedProduct) return;

    const base =
      parseInt((selectedProduct.price || "0").replace(/[^\d]/g, "")) || 0;
    const perUnit = Math.round(mods.total / Math.max(mods.quantity, 1));
    const unitAddons = Math.max(perUnit - base, 0);

    const key = `${selectedProduct.productId}|${selectedProduct.name}|${
      mods.size || ""
    }|${mods.sugar || ""}|${(mods.toppings || []).sort().join(",")}`;

    addItem({
      id: key,
      prodId: selectedProduct.productId,
      name: selectedProduct.name,
      unitBasePrice: base,
      unitAddonsPrice: unitAddons,
      quantity: mods.quantity,
      note: {
        size: mods.size,
        sugar: mods.sugar,
        toppings: mods.toppings,
        takeaway: true,
      },
    });

    setShowModification(false);
  };

  // Handle scroll untuk infinite scroll
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 200; // Trigger load more saat 200px dari bottom
    
    if (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom
    ) {
      loadMoreData();
    }
  }, [loadMoreData]);

  return (
    <SafeAreaProvider>
      <ScrollView 
        className="bg-gray-100 flex-1"
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        <Header title="Transaksi Baru" showBackButton={false} />

        <View className="p-4">
          <Input
            placeholder="Cari Produk...."
            value={query}
            onChangeText={setQuery}
            icon={<Ionicons name="search" size={20} color="#6b7280" />}
          />

          {/* Initial Loading State */}
          {initialLoading ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={{ marginTop: 8, color: "#6b7280" }}>
                Memuat produk...
              </Text>
            </View>
          ) : error ? (
            <View style={{ paddingVertical: 24 }}>
              <Text style={{ color: "#b91c1c", fontSize: 16 }}>{error}</Text>
              <Text style={{ color: "#6b7280", marginTop: 4, fontSize: 12 }}>
                Buka beranda dan lakukan Sync Data untuk mengisi cache produk.
              </Text>
            </View>
          ) : filteredItems.length === 0 && debounced ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <Ionicons name="search-outline" size={48} color="#9ca3af" />
              <Text style={{ color: "#6b7280", marginTop: 8, fontSize: 16 }}>
                Tidak ada hasil untuk "{debounced}"
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>
                Coba kata kunci lain atau periksa ejaan
              </Text>
            </View>
          ) : filteredItems.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <Ionicons name="cube-outline" size={48} color="#9ca3af" />
              <Text style={{ color: "#6b7280", marginTop: 8, fontSize: 16 }}>
                Belum ada produk tersedia
              </Text>
            </View>
          ) : (
            <>
              {/* Products Grid */}
              <View
                className="mt-4"
                style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
                {filteredItems.map((item, index) => (
                  <View
                    key={`${item.productId}-${index}`}
                    style={{ width: itemWidth }}>
                    <ProductCard
                      name={item.name}
                      price={item.price}
                      image={item.image}
                      initials={item.initials}
                      outOfStock={item.outOfStock}
                      cardWidth={itemWidth}
                      onPress={() => handleProductPress(item)}
                    />
                  </View>
                ))}
              </View>

              {/* Load More Indicator */}
              {loadingMore && (
                <View style={{ paddingVertical: 16, alignItems: "center" }}>
                  <ActivityIndicator color="#3b82f6" />
                  <Text style={{ marginTop: 8, color: "#6b7280", fontSize: 12 }}>
                    Memuat produk lainnya...
                  </Text>
                </View>
              )}

              {/* End of Data Indicator */}
              {!hasMoreData && !debounced && displayedItems.length > 0 && (
                <View style={{ paddingVertical: 16, alignItems: "center" }}>
                  <Text style={{ color: "#9ca3af", fontSize: 12 }}>
                    Semua produk telah ditampilkan ({displayedItems.length} produk)
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Product Modification Modal */}
      <ProductModification
        productName={selectedProduct?.name || ""}
        productPrice={selectedProduct?.price || ""}
        originalPrice={selectedProduct?.originalPrice}
        discount={selectedProduct?.discount}
        productImage={selectedProduct?.image || productImg}
        sizeOptions={selectedProduct?.sizeOptions || []}
        sugarOptions={selectedProduct?.sugarOptions || []}
        toppingOptions={selectedProduct?.toppingOptions || []}
        isVisible={showModification}
        onClose={() => setShowModification(false)}
        onSave={handleSaveModification}
      />

      <FloatingCartSummary
        itemCount={8}
        totalPrice={400000}
        onCancel={clearCart}
        onPay={() => router.push("/checkout")}
      />
    </SafeAreaProvider>
  );
};

export default TransactionScreen;