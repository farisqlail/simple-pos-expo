// components/ui/ProductListCard.tsx
import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { UiProduct } from "@/hooks/useFavouriteProducts";
import { formatIDR } from "@/lib/utils/format";
import { toImageSource } from "@/lib/utils/image";

type Props = {
  title?: string;
  loading?: boolean;
  error?: string | null;
  products: UiProduct[];
  emptyText?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
};

// Cache untuk menyimpan processed image sources
const imageCache = new Map<string, any>();

type ProductItemProps = {
  product: UiProduct;
  isLast: boolean;
};

// ===== ProductItem (named) =====
const ProductItemBase: React.FC<ProductItemProps> = ({ product, isLast }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Memoize image source dengan cache
  const imageSource = useMemo(() => {
    if (imageCache.has(product.image)) {
      return imageCache.get(product.image);
    }
    const src = toImageSource(product.image);
    if (src) {
      imageCache.set(product.image, src);
      return src;
    }
    return null;
  }, [product.image]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
    if (imageCache.has(product.image)) {
      imageCache.delete(product.image);
    }
  }, [product.image]);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const formatSoldText = useCallback((sold: number) => {
    if (sold >= 1000) return `${(sold / 1000).toFixed(1)}k terjual`;
    return `${sold} terjual`;
  }, []);

  return (
    <View>
      <View className="flex-row items-center py-2">
        {/* Product Image */}
        <View className="relative">
          {imageSource && !imageError ? (
            <View className="relative">
              <Image
                source={imageSource}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                  backgroundColor: "#F3F4F6",
                }}
                resizeMode="cover"
                onError={handleImageError}
                onLoad={handleImageLoad}
                onLoadEnd={handleImageLoad}
              />
              {imageLoading && (
                <View className="absolute inset-0 bg-gray-100 rounded-lg items-center justify-center">
                  <ActivityIndicator size="small" color="#DC2626" />
                </View>
              )}
            </View>
          ) : (
            <Image
              source={require("@/assets/images/produk.png")}
              style={{
                width: 56,
                height: 56,
                borderRadius: 10,
                backgroundColor: "#F3F4F6",
              }}
              resizeMode="cover"
            />
          )}
        </View>

        {/* Product Info */}
        <View className="flex-1" style={{ marginLeft: 12 }}>
          <Text
            className="text-[15px] text-gray-900 font-medium"
            numberOfLines={1}
            style={{ lineHeight: 20 }}
          >
            {product.name}
          </Text>
          <Text className="text-[12px] text-gray-500 mt-1">
            {formatSoldText(product.sold)}
          </Text>
        </View>

        {/* Price */}
        <View style={{ minWidth: 100, alignItems: "flex-end" }}>
          <Text className="text-[14px] text-gray-900 font-semibold">
            {formatIDR(product.price)}
          </Text>
        </View>
      </View>

      {/* Separator */}
      {!isLast && (
        <View className="h-[1px] bg-gray-100 ml-20" style={{ marginVertical: 8 }} />
      )}
    </View>
  );
};

const ProductItem = React.memo(ProductItemBase);
ProductItem.displayName = "ProductItem";

// ===== Skeleton (named) =====
const ProductSkeletonBase: React.FC = () => (
  <View className="animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <View key={i}>
        <View className="flex-row items-center py-2">
          {/* Image placeholder */}
          <View className="bg-gray-200 rounded-lg mr-3" style={{ width: 56, height: 56 }} />

          {/* Content placeholder */}
          <View className="flex-1">
            <View className="h-4 bg-gray-200 rounded mb-2" style={{ width: "70%" }} />
            <View className="h-3 bg-gray-200 rounded" style={{ width: "40%" }} />
          </View>

          {/* Price placeholder */}
          <View className="h-4 bg-gray-200 rounded" style={{ width: 80 }} />
        </View>

        {i < 5 && <View className="h-[1px] bg-gray-100 ml-20 my-2" />}
      </View>
    ))}
  </View>
);

const ProductSkeleton = React.memo(ProductSkeletonBase);
ProductSkeleton.displayName = "ProductSkeleton";

// ===== Error state (named) =====
type ErrorStateProps = { error: string; onRefresh?: () => void };

const ErrorStateBase: React.FC<ErrorStateProps> = ({ error, onRefresh }) => (
  <View className="py-6 items-center">
    <Text className="text-red-600 text-center mb-3">{error}</Text>
    {onRefresh && (
      <TouchableOpacity
        onPress={onRefresh}
        className="px-4 py-2 bg-red-50 rounded-lg border border-red-200"
      >
        <Text className="text-red-600 text-sm font-medium">Coba Lagi</Text>
      </TouchableOpacity>
    )}
  </View>
);

const ErrorState = React.memo(ErrorStateBase);
ErrorState.displayName = "ErrorState";

// ===== Empty state (named) =====
const EmptyStateBase: React.FC<{ emptyText: string }> = ({ emptyText }) => (
  <View className="py-8 items-center">
    <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-3">
      <Text className="text-2xl">📦</Text>
    </View>
    <Text className="text-gray-500 text-center">{emptyText}</Text>
  </View>
);

const EmptyState = React.memo(EmptyStateBase);
EmptyState.displayName = "EmptyState";

// ===== Main component =====
export default function ProductListCard({
  title = "Produk Paling Laris Hari Ini",
  loading,
  error,
  products,
  emptyText = "Belum ada data produk favorit.",
  onRefresh,
  refreshing = false,
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL_DISPLAY_COUNT = 5;

  // Memoize filtered products
  const displayedProducts = useMemo(() => {
    if (showAll || products.length <= INITIAL_DISPLAY_COUNT) return products;
    return products.slice(0, INITIAL_DISPLAY_COUNT);
  }, [products, showAll]);

  const hasMoreProducts = products.length > INITIAL_DISPLAY_COUNT;
  const hiddenCount = Math.max(0, products.length - INITIAL_DISPLAY_COUNT);

  // Render product item
  const renderProduct = useCallback(
    ({ item, index }: { item: UiProduct; index: number }) => (
      <ProductItem product={item} isLast={index === displayedProducts.length - 1} />
    ),
    [displayedProducts.length]
  );

  const keyExtractor = useCallback((item: UiProduct) => item.id.toString(), []);
  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: 76, offset: 76 * index, index }),
    []
  );

  return (
    <View
      className="bg-white rounded-2xl p-4"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-gray-500 text-[13px]">{title}</Text>
        {refreshing && <ActivityIndicator size="small" color="#DC2626" />}
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <ProductSkeleton />
      ) : error ? (
        <ErrorState error={error} onRefresh={onRefresh} />
      ) : products.length === 0 ? (
        <EmptyState emptyText={emptyText} />
      ) : (
        <View>
          {/* Products List */}
          <FlatList
            data={displayedProducts}
            renderItem={renderProduct}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            scrollEnabled={false}
            removeClippedSubviews
            maxToRenderPerBatch={5}
            initialNumToRender={5}
            windowSize={5}
          />

          {/* Show More/Less Button */}
          {hasMoreProducts && (
            <TouchableOpacity
              onPress={() => setShowAll(!showAll)}
              className="mt-3 py-2 px-4 bg-red-50 rounded-lg border border-red-100 items-center"
              activeOpacity={0.7}
            >
              <Text className="text-red-600 text-sm font-medium">
                {showAll ? "Tampilkan Lebih Sedikit" : `Lihat ${hiddenCount} Produk Lainnya`}
              </Text>
            </TouchableOpacity>
          )}

          {/* Statistics Footer */}
          {products.length > 0 && (
            <View className="mt-3 pt-3 border-t border-gray-100">
              <Text className="text-gray-400 text-xs text-center">
                Menampilkan {displayedProducts.length} dari {products.length} produk terlaris
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
