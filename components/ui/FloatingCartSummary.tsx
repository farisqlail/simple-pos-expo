// components/ui/FloatingCartSummary.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from "react-native";
import { useCartStore, CartItem } from "@/lib/store/useCartStore";

const RED = "#B81D1D";
const R = (n: number) =>
  `Rp ${n.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

const Badge = ({ label }: { label: string }) => (
  <View style={styles.badge}>
    <Text style={styles.badgeText}>{label}</Text>
  </View>
);

const QtyControl = ({
  value,
  onDec,
  onInc,
}: {
  value: number;
  onDec: () => void;
  onInc: () => void;
}) => (
  <View style={styles.qtyWrap}>
    <TouchableOpacity style={styles.qtyBtn} onPress={onDec}>
      <Text style={styles.qtyBtnText}>−</Text>
    </TouchableOpacity>
    <Text style={styles.qtyValue}>{value}</Text>
    <TouchableOpacity style={styles.qtyBtn} onPress={onInc}>
      <Text style={styles.qtyBtnText}>+</Text>
    </TouchableOpacity>
  </View>
);

const ItemCard = ({
  item,
  onDec,
  onInc,
  onRemove,
  onEdit,
}: {
  item: CartItem;
  onDec: () => void;
  onInc: () => void;
  onRemove?: () => void;
  onEdit?: () => void;
}) => {
  const unitTotal = item.unitBasePrice + item.unitAddonsPrice;
  const hasToppings = !!item.note?.toppings?.length;

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
        {item.note?.takeaway ? <Badge label="Takeaway" /> : null}
      </View>

      <Text style={styles.cardPrice}>{R(unitTotal)}</Text>

      <View style={styles.detailRow}>
        {item.note?.size ? (
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Ukuran Cup </Text>
            <Text style={styles.detailStrong}>{item.note.size}</Text>
          </Text>
        ) : null}
        {item.note?.sugar ? (
          <Text style={[styles.detailText, { marginLeft: 12 }]}>
            <Text style={styles.detailLabel}>Takaran Gula </Text>
            <Text style={styles.detailStrong}>{item.note.sugar}</Text>
          </Text>
        ) : null}
      </View>

      {hasToppings ? (
        <Text style={[styles.detailText, { marginTop: 6 }]}>
          <Text style={styles.detailLabel}>Topping </Text>
          <Text style={styles.detailStrong}>
            {item.note!.toppings!.join(", ")}
          </Text>
        </Text>
      ) : null}

      {item.note?.message ? (
        <Text style={styles.noteLine}>• {item.note.message}</Text>
      ) : null}

      <View style={styles.actionsRow}>
        <View style={{ flexDirection: "row", gap: 18 }}>
          <TouchableOpacity onPress={onRemove} activeOpacity={0.8}>
            <Text style={styles.linkDanger}>Hapus</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onEdit} activeOpacity={0.8}>
            <Text style={styles.linkPrimary}>Edit</Text>
          </TouchableOpacity>
        </View>

        <QtyControl value={item.quantity} onDec={onDec} onInc={onInc} />
      </View>
    </View>
  );
};

interface Props {
  onCancel: () => void;
  onPay: () => void;
  onEditItem?: (id: string) => void;
  onAddVariant?: () => void;
}

const FloatingCartSummary: React.FC<Props> = ({
  onCancel,
  onPay,
  onEditItem,
  onAddVariant,
}) => {
  const [open, setOpen] = useState(false);
  const items = useCartStore((s) => s.items);
  const incItem = useCartStore((s) => s.inc);
  const decItem = useCartStore((s) => s.dec);
  const removeItem = useCartStore((s) => s.remove);

  const { itemCount, subtotal } = useMemo(() => {
    let count = 0;
    let sub = 0;
    for (const it of items) {
      count += it.quantity;
      sub += (it.unitBasePrice + it.unitAddonsPrice) * it.quantity;
    }
    return { itemCount: count, subtotal: sub };
  }, [items]);

  return (
    <>
      {/* Floating bar */}
      <View style={styles.bar}>
        <View>
          <TouchableOpacity onPress={() => setOpen(true)}>
            <Text style={styles.barItemText}>{itemCount} item</Text>
          </TouchableOpacity>
          <Text style={styles.barPrice}>{R(subtotal)}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity style={styles.barCancel} onPress={onCancel}>
            <Text style={styles.barCancelText}>Batalkan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.barPay}
            onPress={() => (itemCount > 0 ? setOpen(true) : null)}>
            <Text style={styles.barPayText}>Bayar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal */}
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {/* Cart Items Summary */}
            <View style={styles.cartItemsSummary}>
              <ScrollView
                style={styles.summaryScrollView}
                showsVerticalScrollIndicator={false}>
                {items.map((item) => (
                  <View key={item.id} style={styles.summaryItem}>
                    <View style={styles.summaryItemLeft}>
                      <Text style={styles.summaryItemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.summaryItemPrice}>
                        {R(item.unitBasePrice + item.unitAddonsPrice)}
                      </Text>
                    </View>
                    <View style={styles.summaryItemActions}>
                      <TouchableOpacity
                        style={styles.summaryQtyBtn}
                        onPress={() => decItem(item.id)}>
                        <Text style={styles.summaryQtyText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.summaryQtyValue}>
                        {item.quantity}
                      </Text>
                      <TouchableOpacity
                        style={styles.summaryQtyBtn}
                        onPress={() => incItem(item.id)}>
                        <Text style={styles.summaryQtyText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 14, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}>
              {items.length === 0 ? (
                <View style={{ padding: 16 }}>
                  <Text style={{ color: "#6b7280" }}>
                    Keranjang masih kosong.
                  </Text>
                </View>
              ) : (
                items.map((it) => (
                  <ItemCard
                    key={it.id}
                    item={it}
                    onDec={() => decItem(it.id)}
                    onInc={() => incItem(it.id)}
                    onRemove={() => removeItem(it.id)}
                    onEdit={() => onEditItem?.(it.id)}
                  />
                ))
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <View style={styles.totalRow}>
                <Text style={{ color: "#374151" }}>Subtotal</Text>
                <Text style={{ fontWeight: "700" }}>{R(subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={{ color: "#374151" }}>Biaya Admin</Text>
                <Text style={{ color: RED, fontWeight: "700" }}>
                  + {R(items.length ? 1000 : 0)}
                </Text>
              </View>
              <View style={[styles.totalRow, { marginTop: 4 }]}>
                <Text style={{ fontWeight: "800" }}>Total Pembayaran</Text>
                <Text style={{ fontWeight: "800" }}>
                  {R(subtotal + (items.length ? 1000 : 0))}
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  style={styles.footerCancel}
                  onPress={() => {
                    setOpen(false);
                    onCancel();
                  }}>
                  <Text style={{ color: RED, fontWeight: "700" }}>
                    Batalkan
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.footerPay}
                  onPress={() => {
                    setOpen(false);
                    onPay();
                  }}>
                  <Text style={{ color: "#fff", fontWeight: "800" }}>
                    Bayar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: RED,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
  },
  barItemText: { fontWeight: "600", color: "#fff" },
  barPrice: { marginTop: 2, color: "#fff", fontWeight: "700" },
  barCancel: {
    borderWidth: 1,
    borderColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  barCancelText: { color: "#fff", fontWeight: "600" },
  barPay: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  barPayText: { color: RED, fontWeight: "800" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    maxHeight: "88%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },

  cartItemsSummary: {
    backgroundColor: "#fff",
    maxHeight: 200,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  summaryScrollView: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f3f4f6",
  },
  summaryItemLeft: { flex: 1, marginRight: 12 },
  summaryItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  summaryItemPrice: { fontSize: 12, color: "#6b7280", fontWeight: "500" },
  summaryItemActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryQtyBtn: {
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#FECACA",
    minWidth: 28,
    alignItems: "center",
  },
  summaryQtyText: { color: RED, fontWeight: "700", fontSize: 12 },
  summaryQtyValue: {
    minWidth: 20,
    textAlign: "center",
    fontWeight: "600",
    color: "#111827",
    fontSize: 14,
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#EFEFEF",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontWeight: "700",
    fontSize: 14,
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: { color: RED, fontSize: 11, fontWeight: "700" },
  cardPrice: { marginTop: 2, color: "#374151", fontWeight: "700" },
  detailRow: { flexDirection: "row", marginTop: 8, flexWrap: "wrap" },
  detailText: { color: "#6B7280", fontSize: 12 },
  detailLabel: { color: "#6B7280" },
  detailStrong: { color: "#111827", fontWeight: "600" },
  noteLine: { marginTop: 6, fontSize: 12, color: "#6B7280" },

  actionsRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkDanger: { color: RED, fontWeight: "700" },
  linkPrimary: { color: "#111827", fontWeight: "700" },

  qtyWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  qtyBtnText: { color: RED, fontWeight: "900", fontSize: 14 },
  qtyValue: {
    minWidth: 20,
    textAlign: "center",
    fontWeight: "700",
    color: "#111827",
  },

  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  footerCancel: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: RED,
    alignItems: "center",
  },
  footerPay: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: RED,
    alignItems: "center",
  },
});

export default FloatingCartSummary;
