import { ImageSourcePropType } from "react-native";

export const toImageSource = (val?: string | null): { uri: string } | null => {
  if (!val) return null;
  if (val.startsWith("data:image")) return { uri: val };
  if (/^https?:\/\//i.test(val)) return { uri: val };
  // base64 mentah (tanpa prefix)
  if (/^[A-Za-z0-9+/=]+$/.test(val)) return { uri: `data:image/jpeg;base64,${val}` };
  return null;
};
