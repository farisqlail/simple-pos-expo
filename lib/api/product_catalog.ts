import { getResource } from "@/lib/api/fetch";

export type ProductNode = {
  product_id: number;
  product_name: string;
  product_images: string;
  product_pricenow: number;
};

export type CategoryNode = {
  pcategory_id: number;
  pcategory_name: string;
  data_products: ProductNode[];
};

export type ProductCatalogResponse = {
  status: string;
  message?: string;
  data: CategoryNode[];
  data_categories?: number;
  cou?: number;
};

export async function getProducts(appid: string, locationId: number | string, token: string) {
  const ep = `product/get-products?appid=${encodeURIComponent(appid)}&location=${encodeURIComponent(String(locationId))}`;
  return getResource<ProductCatalogResponse>(ep, token); // token mentah
}
