// screens/History.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  FlatList,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  StyleSheet,
  Platform 
} from "react-native";
import Constants from 'expo-constants';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import Header from "@/components/ui/Header";
import { useStoredAuth } from "@/hooks/useStoredAuth";
import { getResource } from "@/lib/api/fetch";

interface Transaction {
  appid: string;
  loc_id: number;
  transaction_id: number;
  transaction_type: string;
  transaction_status: string;
  nota: string | null; // bisa null dari API
  transaction_date: string | null;
  date_process: string | null;
  date_done: string | null;
  date_paid_received: string | null;
  stotal: number;
  gtotal: number;
  payment_id: number;
  payment_name: string | null;
  tax: number;
  tax_id: number;
  tax_name: string;
  tax_percent: number;
  tax_rule: string;
  service: number;
  service_id: number;
  service_name: string;
  service_percent: number;
  tablenumber: string | null;
  service_rule: string;
  is_using_admin_fee: string;
  admin_fee_type: string;
  admin_fee_percent: number;
  admin_fee: number;
  revenue_share_cust_percentage: string | null;
  payment_status: string;
  void_status: string;
  void_reason: string | null;
  void_date: string | null;
  void_by: string | null;
  void_by_id: number | null;
  hl_takeaway: string;
  guest_detail: string | null;
  cashier_first_name: string | null;
  cashier_last_name: string | null;
  cashier_position: string | null;
  bukti_bayar: string | null;
}

interface TransactionResponse {
  status: string;
  message: string;
  grand_total_all: number;
  grand_total_paid: number;
  grand_total_unpaid: number;
  grand_total_void: number;
  count: number;
  data: Transaction[];
}

// Cache untuk menyimpan data transaksi
const transactionCache = new Map<
  string,
  { data: Transaction[]; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 menit

const History: React.FC = () => {
  const { auth, location, ready } = useStoredAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const ITEMS_PER_PAGE = 20;

  // Tanggal awal: hari ini
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date>(today);
  const [tempStartDate, setTempStartDate] = useState<Date>(today);
  const [tempEndDate, setTempEndDate] = useState<Date>(today);

  const appid = auth.user?.appid;
  const locId = location?.loc_id ?? 3365;

  // Util functions (memoized)
  const formatCurrency = useCallback(
    (amount: number) => `Rp ${Number(amount || 0).toLocaleString("id-ID")}`,
    []
  );

  const formatDateForDisplay = useCallback((date: Date) => {
    const months = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }, []);

  const formatDateForAPI = useCallback(
    (date: Date) => date.toISOString().split("T")[0],
    []
  );

  const getDateRangeText = useCallback(() => {
    if (formatDateForAPI(startDate) === formatDateForAPI(endDate)) {
      return formatDateForDisplay(startDate);
    }
    return `${formatDateForDisplay(startDate)} - ${formatDateForDisplay(
      endDate
    )}`;
  }, [startDate, endDate, formatDateForAPI, formatDateForDisplay]);

  const dateRange = useMemo(() => getDateRangeText(), [getDateRangeText]);

  // Formatter tanggal aman
  const formatDate = useCallback((dateString?: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  }, []);

  const getStatusInfo = useCallback((transaction: Transaction) => {
    if (transaction.void_status === "void") {
      return { color: "#DC2626", text: "Void", bgColor: "#FEE2E2" };
    }
    switch (transaction.payment_status) {
      case "lunas":
        return { color: "#059669", text: "Sukses", bgColor: "#D1FAE5" };
      case "belum_lunas":
        return { color: "#D97706", text: "Pending", bgColor: "#FED7AA" };
      default:
        return { color: "#6B7280", text: "Unknown", bgColor: "#F3F4F6" };
    }
  }, []);

  // Cache key generator
  const getCacheKey = useCallback(
    (start: Date, end: Date, pageNum: number) => {
      return `${formatDateForAPI(start)}_${formatDateForAPI(end)}_${pageNum}`;
    },
    [formatDateForAPI]
  );

  // Check cache validity
  const isValidCache = useCallback((timestamp: number) => {
    return Date.now() - timestamp < CACHE_DURATION;
  }, []);

  // Fetch transaksi dengan optimasi
  const fetchTransactions = useCallback(
    async (isRefresh = false, pageNumber = 1, isLoadMore = false) => {
      if (!ready || !appid || !auth.token) return;

      const cacheKey = getCacheKey(startDate, endDate, pageNumber);

      // Check cache first untuk page pertama
      if (!isRefresh && pageNumber === 1) {
        const cached = transactionCache.get(cacheKey);
        if (cached && isValidCache(cached.timestamp)) {
          setTransactions(cached.data);
          setLoading(false);
          setHasMoreData(cached.data.length >= ITEMS_PER_PAGE);
          return;
        }
      }

      if (isRefresh) {
        setRefreshing(true);
      } else if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        // Gunakan tanggal yang dipilih untuk API call
        const startDateStr = formatDateForAPI(startDate);
        const endDateStr = formatDateForAPI(endDate);

        const endpoint = `transaction/get-transaction-list?appid=${appid}&location=${locId}&date_start=${startDateStr}&date_end=${endDateStr}&show_all=no&page=${pageNumber}&limit=${ITEMS_PER_PAGE}`;

        const data: TransactionResponse = await getResource(
          endpoint,
          auth.token
        );

        if (data.status === "success") {
          const newTransactions = data.data ?? [];

          if (isLoadMore && pageNumber > 1) {
            setTransactions((prev) => [...prev, ...newTransactions]);
          } else {
            setTransactions(newTransactions);
            // Cache data untuk page pertama
            if (pageNumber === 1) {
              transactionCache.set(cacheKey, {
                data: newTransactions,
                timestamp: Date.now(),
              });
            }
          }

          setHasMoreData(newTransactions.length >= ITEMS_PER_PAGE);

          if (isLoadMore) {
            setPage(pageNumber);
          } else {
            setPage(1);
          }
        } else {
          Alert.alert("Error", data.message || "Failed to fetch transactions");
        }
      } catch (error: any) {
        console.error("Error fetching transactions:", error);

        let errorMessage = "Failed to fetch transaction data";
        if (error?.status === 401) {
          errorMessage = "Authentication failed. Please login again.";
        } else if (error?.status === 403) {
          errorMessage = "Access denied. Check your permissions.";
        } else if (error?.status >= 500) {
          errorMessage = "Server error. Please try again later.";
        } else if (error?.message) {
          errorMessage = error.message;
        }

        Alert.alert("Error", errorMessage);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [
      ready,
      appid,
      auth.token,
      startDate,
      endDate,
      locId,
      getCacheKey,
      isValidCache,
      formatDateForAPI,
    ]
  );

  // Load more data
  const loadMoreData = useCallback(() => {
    if (!loadingMore && hasMoreData) {
      fetchTransactions(false, page + 1, true);
    }
  }, [loadingMore, hasMoreData, page, fetchTransactions]);

  // Filter pencarian dengan debounce effect
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // null-safe helper untuk filter
  const safeLower = useCallback(
    (v?: string | null) => (v ?? "").toLowerCase(),
    []
  );

  const filteredTransactions = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return transactions;
    const q = debouncedSearchQuery.toLowerCase();

    return transactions.filter(
      (t) =>
        safeLower(t.nota).includes(q) ||
        safeLower(t.cashier_first_name).includes(q) ||
        safeLower(t.cashier_last_name).includes(q)
    );
  }, [transactions, debouncedSearchQuery, safeLower]);

  // Load saat mount & ketika tanggal berubah
  useEffect(() => {
    setPage(1);
    setHasMoreData(true);
    // Clear cache when date changes
    transactionCache.clear();
    fetchTransactions();
  }, [ready, startDate, endDate, fetchTransactions]);

  const onRefresh = useCallback(() => {
    setPage(1);
    setHasMoreData(true);
    transactionCache.clear();
    fetchTransactions(true);
  }, [fetchTransactions]);

  // Date picker handlers
  const handleDatePickerConfirm = useCallback(() => {
    let s = tempStartDate;
    let e = tempEndDate;
    if (e < s) {
      const tmp = s;
      s = e;
      e = tmp;
    }
    setStartDate(s);
    setEndDate(e);
    setShowDatePicker(false);
  }, [tempStartDate, tempEndDate]);

  const handleDatePickerCancel = useCallback(() => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setShowDatePicker(false);
  }, [startDate, endDate]);

  // Komponen modal pilih tanggal (optimized)
  const DatePickerModal = React.memo(() => {
    const years = useMemo(
      () =>
        Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i),
      []
    );

    const months = useMemo(
      () => [
        "Januari",
        "Februari",
        "Maret",
        "April",
        "Mei",
        "Juni",
        "Juli",
        "Agustus",
        "September",
        "Oktober",
        "November",
        "Desember",
      ],
      []
    );

    const getDaysInMonth = useCallback(
      (year: number, month: number) => new Date(year, month + 1, 0).getDate(),
      []
    );

    const renderDatePicker = useCallback(
      (date: Date, setDate: (d: Date) => void, title: string) => {
        const currentYear = date.getFullYear();
        const currentMonth = date.getMonth();
        const currentDay = date.getDate();
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        return (
          <View className="mb-6">
            <Text className="text-lg font-semibold mb-4 text-center">
              {title}
            </Text>

            {/* Tahun */}
            <Text className="text-sm font-medium mb-2">Tahun</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={years}
              keyExtractor={(item) => item.toString()}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={({ item: year }) => (
                <TouchableOpacity
                  onPress={() =>
                    setDate(
                      new Date(
                        year,
                        currentMonth,
                        Math.min(currentDay, getDaysInMonth(year, currentMonth))
                      )
                    )
                  }
                  className={`px-4 py-2 rounded-lg border mr-2 ${
                    currentYear === year
                      ? "bg-red-600 border-red-600"
                      : "bg-white border-gray-300"
                  }`}>
                  <Text
                    className={`font-medium ${
                      currentYear === year ? "text-white" : "text-gray-700"
                    }`}>
                    {year}
                  </Text>
                </TouchableOpacity>
              )}
            />

            {/* Bulan */}
            <Text className="text-sm font-medium mb-2 mt-4">Bulan</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={months}
              keyExtractor={(item, index) => index.toString()}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={({ item: month, index }) => (
                <TouchableOpacity
                  onPress={() =>
                    setDate(
                      new Date(
                        currentYear,
                        index,
                        Math.min(currentDay, getDaysInMonth(currentYear, index))
                      )
                    )
                  }
                  className={`px-3 py-2 rounded-lg border mr-2 ${
                    currentMonth === index
                      ? "bg-red-600 border-red-600"
                      : "bg-white border-gray-300"
                  }`}>
                  <Text
                    className={`font-medium text-sm ${
                      currentMonth === index ? "text-white" : "text-gray-700"
                    }`}>
                    {month}
                  </Text>
                </TouchableOpacity>
              )}
            />

            {/* Tanggal */}
            <Text className="text-sm font-medium mb-2 mt-4">Tanggal</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={days}
              keyExtractor={(item) => item.toString()}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              renderItem={({ item: day }) => (
                <TouchableOpacity
                  onPress={() =>
                    setDate(new Date(currentYear, currentMonth, day))
                  }
                  className={`px-3 py-2 rounded-lg border min-w-[40px] items-center mr-2 ${
                    currentDay === day
                      ? "bg-red-600 border-red-600"
                      : "bg-white border-gray-300"
                  }`}>
                  <Text
                    className={`font-medium ${
                      currentDay === day ? "text-white" : "text-gray-700"
                    }`}>
                    {day}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        );
      },
      [getDaysInMonth, months, years]
    );

    return (
      <Modal visible={showDatePicker} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[80%]">
            <View className="p-4 border-b border-gray-200 flex-row justify-between items-center">
              <Text className="text-xl font-bold">Pilih Tanggal</Text>
              <TouchableOpacity onPress={handleDatePickerCancel}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Ganti FlatList pembungkus -> ScrollView untuk hindari nested VirtualizedList crash */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16 }}>
              {renderDatePicker(
                tempStartDate,
                setTempStartDate,
                "Tanggal Mulai"
              )}
              {renderDatePicker(tempEndDate, setTempEndDate, "Tanggal Selesai")}
            </ScrollView>

            <View className="p-4 border-t border-gray-200 flex-row gap-3">
              <TouchableOpacity
                onPress={handleDatePickerCancel}
                className="flex-1 py-3 rounded-lg border border-gray-300 items-center">
                <Text className="font-semibold text-gray-700">Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDatePickerConfirm}
                className="flex-1 py-3 rounded-lg bg-red-600 items-center">
                <Text className="font-semibold text-white">Terapkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  });

  // Transaction item component (memoized untuk performa)
  const TransactionItem = React.memo(
    ({ transaction }: { transaction: Transaction }) => {
      const statusInfo = getStatusInfo(transaction);

      return (
        <View className="bg-white mx-4 mb-3 rounded-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <View className="px-4 py-3 border-b border-gray-100">
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="text-gray-500 text-sm">
                  {formatDate(transaction.transaction_date)}
                </Text>
                <Text className="text-gray-900 font-semibold mt-1">
                  {transaction.nota ?? "-"}
                </Text>
              </View>
              <View
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: statusInfo.bgColor }}>
                <Text
                  className="text-sm font-semibold"
                  style={{ color: statusInfo.color }}>
                  {statusInfo.text}
                </Text>
              </View>
            </View>
          </View>

          {/* Content */}
          <View className="px-4 py-3">
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-gray-900 font-bold text-lg">
                  {formatCurrency(transaction.gtotal)}
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  #{transaction.nota ?? "-"}
                </Text>
              </View>

              <View className="items-end">
                <Text className="text-gray-600 text-sm">
                  {transaction.payment_name ?? "-"}
                </Text>
                <Text className="text-gray-400 text-xs mt-1">
                  {(transaction.cashier_first_name ?? "").trim()}{" "}
                  {(transaction.cashier_last_name ?? "").trim()}
                </Text>
              </View>
            </View>

            {transaction.void_status === "void" && transaction.void_reason && (
              <View className="mt-3 pt-3 border-t border-gray-100">
                <Text className="text-red-600 text-sm">
                  Alasan void: {transaction.void_reason}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    }
  );

  TransactionItem.displayName = "TransactionItem";
  DatePickerModal.displayName = "DatePickerModal";

  // Footer component untuk loading more
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;

    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#DC2626" />
        <Text className="text-gray-500 text-center mt-2 text-sm">
          Memuat lebih banyak...
        </Text>
      </View>
    );
  }, [loadingMore]);

  // Empty state component
  const renderEmptyComponent = useCallback(
    () => (
      <View className="flex-1 justify-center items-center py-20">
        <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
        <Text className="text-gray-500 mt-4 text-center">
          Tidak ada transaksi ditemukan
        </Text>
      </View>
    ),
    []
  );

  return (
    <SafeAreaProvider>
      <View className="bg-gray-100 flex-1">
        <Header title="Riwayat Transaksi" showBackButton={false} />

        {/* Date Range Picker */}
        <View className="mx-4 mt-4">
          <TouchableOpacity
            className="bg-white p-4 rounded-lg border border-gray-200 flex-row items-center justify-between"
            onPress={() => setShowDatePicker(true)}>
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text className="text-gray-900 ml-3 font-medium">
                {dateRange}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="mx-4 mt-3 mb-4">
          <View className="bg-white rounded-lg border border-gray-200 flex-row items-center px-4 py-3">
            <Ionicons name="search-outline" size={20} color="#6B7280" />
            <TextInput
              placeholder="Cari Transaksi..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="ml-3 flex-1 text-gray-900"
              returnKeyType="search"
            />
          </View>
        </View>

        {/* Transaction List */}
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#DC2626" />
            <Text className="text-gray-500 mt-4">Memuat transaksi...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) =>
              `${item.transaction_id}-${item.nota ?? "nonota"}`
            }
            renderItem={({ item }) => <TransactionItem transaction={item} />}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onEndReached={loadMoreData}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmptyComponent}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
          />
        )}

        {/* Date Picker Modal */}
        <DatePickerModal />
      </View>
    </SafeAreaProvider>
  );
};

export default History;
