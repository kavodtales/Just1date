import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { AppState } from "react-native";
const secure = {
  async getItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(`${key}-count`));
    if (!count) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        SecureStore.getItemAsync(`${key}-${i}`),
      ),
    );
    return chunks.every((x) => x !== null) ? chunks.join("") : null;
  },
  async setItem(key: string, value: string) {
    const old = Number(await SecureStore.getItemAsync(`${key}-count`));
    const count = Math.ceil(value.length / 1500);
    await SecureStore.deleteItemAsync(`${key}-count`);
    for (let i = 0; i < count; i++)
      await SecureStore.setItemAsync(
        `${key}-${i}`,
        value.slice(i * 1500, (i + 1) * 1500),
        { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY },
      );
    await SecureStore.setItemAsync(`${key}-count`, String(count));
    for (let i = count; i < old; i++)
      await SecureStore.deleteItemAsync(`${key}-${i}`);
  },
  async removeItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(`${key}-count`));
    await SecureStore.deleteItemAsync(`${key}-count`);
    for (let i = 0; i < count; i++)
      await SecureStore.deleteItemAsync(`${key}-${i}`);
  },
};
export const configured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);
export const auth = configured
  ? createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage: secure,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: "pkce",
        },
      },
    )
  : null;
AppState.addEventListener("change", (state) => {
  if (state === "active") auth?.auth.startAutoRefresh();
  else auth?.auth.stopAutoRefresh();
});
