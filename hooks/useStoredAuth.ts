import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "@/lib/storage/keys";

export type AuthUser = {
  first_name?: string;
  appid?: string;
  id?: number;
};

export type SelectedLocation = {
  loc_id?: number;
  loc_name?: string;
  loc_addr?: string;
};

export function useStoredAuth() {
  const [auth, setAuth] = useState<{ user: AuthUser | null; token: string | null }>({
    user: null,
    token: null,
  });
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rawUser, rawToken, rawLoc] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.SELECTED_LOCATION),
        ]);
        if (cancelled) return;

        setAuth({
          user: rawUser ? JSON.parse(rawUser) : null,
          token: rawToken ?? null,
        });
        setLocation(rawLoc ? JSON.parse(rawLoc) : null);
      } catch (e) {
        console.log("Load storage error:", e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { auth, location, ready, setLocation };
}
