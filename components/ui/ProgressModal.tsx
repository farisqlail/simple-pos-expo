import React from "react";
import { Modal, View, Text, ActivityIndicator, TouchableOpacity } from "react-native";

export type StepState = "pending" | "loading" | "done" | "error";

export type ProgressStep = {
  key: string;
  label: string;
  state: StepState;
  error?: string | null;
};

type Props = {
  visible: boolean;
  title?: string;
  steps: ProgressStep[];
  onRequestClose?: () => void;
  closable?: boolean;
};

export default function ProgressModal({
  visible,
  title = "Memproses…",
  steps,
  onRequestClose,
  closable = true,
}: Props) {
  const doneCount = steps.filter((s) => s.state === "done").length;
  const percent = Math.round((doneCount / Math.max(steps.length, 1)) * 100);

  return (
    <Modal transparent visible={visible} onRequestClose={onRequestClose} animationType="fade">
      {/* Backdrop */}
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          justifyContent: "center",
          padding: 24,
        }}>
        {/* Card */}
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 6,
          }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>{title}</Text>

          {/* Progress bar */}
          <View
            style={{
              height: 8,
              backgroundColor: "#F3F4F6",
              borderRadius: 999,
              marginTop: 12,
              overflow: "hidden",
            }}>
            <View
              style={{
                width: `${percent}%`,
                height: "100%",
                backgroundColor: "#EF4444",
              }}
            />
          </View>
          <Text style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>{percent}%</Text>

          {/* Steps */}
          <View style={{ marginTop: 12, gap: 10 }}>
            {steps.map((s) => (
              <View key={s.key} style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: 22, alignItems: "center", marginRight: 8 }}>
                  {s.state === "loading" ? (
                    <ActivityIndicator size="small" />
                  ) : s.state === "done" ? (
                    <Text style={{ color: "#10B981", fontWeight: "700" }}>✓</Text>
                  ) : s.state === "error" ? (
                    <Text style={{ color: "#EF4444", fontWeight: "700" }}>!</Text>
                  ) : (
                    <Text style={{ color: "#9CA3AF" }}>•</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#111827" }}>{s.label}</Text>
                  {s.error ? (
                    <Text style={{ color: "#EF4444", fontSize: 12 }}>{s.error}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          {closable ? (
            <TouchableOpacity
              onPress={onRequestClose}
              style={{
                marginTop: 14,
                alignSelf: "flex-end",
                paddingHorizontal: 14,
                paddingVertical: 8,
                backgroundColor: "#F3F4F6",
                borderRadius: 10,
              }}>
              <Text style={{ color: "#111827" }}>Tutup</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
