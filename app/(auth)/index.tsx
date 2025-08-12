import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { login, LoginResponse } from "@/lib/api/fetch";

const STORAGE = {
  TOKEN: "auth_token",
  USER: "auth_user",
};

export default function Index() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE.TOKEN);
        if (token) {
          router.replace("/(tabs)");
          return;
        }
      } catch (e) {
        console.log("Boot auth check error:", e);
      } finally {
        setBooting(false);
      }
    })();
  }, [router]);

  const canSubmit = useMemo(() => {
    if (!email || !password) return false;
    const okEmail = /\S+@\S+\.\S+/.test(email.trim());
    return okEmail && password.length >= 6;
  }, [email, password]);

  const persistAuth = async (token: string, user?: any) => {
    await AsyncStorage.setItem(STORAGE.TOKEN, token);
    if (user) await AsyncStorage.setItem(STORAGE.USER, JSON.stringify(user));
  };

  const onSubmit = async () => {
    setError(null);
    if (!canSubmit || submitting) return;

    try {
      setSubmitting(true);

      const res: LoginResponse = await login(email.trim(), password);

      const token =
        res?.data?.token || (res as any)?.token || (res as any)?.access_token;

      const user = res?.data?.user;

      if (!token) {
        const message =
          (res as any)?.message || "Login gagal. Cek kredensial kamu.";
        throw new Error(message);
      }

      await persistAuth(token, user);

      router.replace("/(auth)/locations");
    } catch (e: any) {
      console.log("Login error:", e);
      setError(e?.message ?? "Terjadi kesalahan saat login.");
    } finally {
      setSubmitting(false);
    }
  };

  if (booting) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: "#B81D1D" }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-white mt-3">Memeriksa sesi...</Text>
      </View>
    );
  }

  return (
    <View
      className="flex-1 justify-center items-center"
      style={{ backgroundColor: "#B81D1D" }}>
      <View className="w-11/12 max-w-md bg-white p-6 rounded-lg shadow-lg">
        <Text className="text-2xl font-bold text-center text-gray-800 mb-6">
          Login
        </Text>

        {/* Error global */}
        {error ? (
          <View className="mb-4 bg-red-50 border border-red-200 rounded p-3">
            <Text className="text-red-700">{error}</Text>
          </View>
        ) : null}

        {/* Email */}
        <View className="mb-4">
          <Text className="text-gray-700 mb-1">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            className="border border-gray-300 rounded px-3 py-2 bg-white text-gray-900"
            placeholderTextColor="#999"
          />
        </View>

        {/* Password */}
        <View className="mb-6">
          <Text className="text-gray-700 mb-1">Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            className="border border-gray-300 rounded px-3 py-2 bg-white text-gray-900"
            placeholderTextColor="#999"
          />
          <Text className="text-xs text-gray-500 mt-1">
            Minimal 6 karakter.
          </Text>
        </View>

        {/* Button */}
        <TouchableOpacity
          onPress={onSubmit}
          disabled={!canSubmit || submitting}
          className={`py-3 rounded ${!canSubmit || submitting ? "bg-red-400" : "bg-red-600"}`}>
          {submitting ? (
            <ActivityIndicator />
          ) : (
            <Text className="text-white text-center font-semibold">Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
