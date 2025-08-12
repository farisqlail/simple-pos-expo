import { getResource } from "@/lib/api/fetch";

export type ApiFavourite = {
  id?: string | number;
  name?: string;
  count_sell?: number;
  price?: number;
  image?: string | null;
};

export type FavouriteResponse = {
  status?: string;
  message?: string;
  data?: ApiFavourite[];
};

export async function getFavouriteProducts(appid: string, locationId: number | string, token: string) {
  const endpoint = `product/get-favourite-products?appid=${encodeURIComponent(appid)}&location=${encodeURIComponent(String(locationId))}`;
  // token dikirim mentah (tanpa "Bearer ")
  return getResource<FavouriteResponse>(endpoint, token);
}
