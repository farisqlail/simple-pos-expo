import { getResource } from "@/lib/api/fetch";

export type ApiPayment = {
  idpayme: number;
  methodname: string;
  imagefile: string;
  hl_platform: string;
  hl_category: string;
};

export type PaymentListResponse = {
  status: string;
  message?: string;
  data: ApiPayment[];
};

export async function getPaymentMethods(appid: string, locationId: number | string, token: string) {
  const ep = `location/get-payment-method?appid=${encodeURIComponent(appid)}&location=${encodeURIComponent(String(locationId))}`;
  return getResource<PaymentListResponse>(ep, token); // token mentah (tanpa Bearer)
}
