export const formatIDR = (n: number | string) => {
  const num = typeof n === "string" ? Number(n.replace(/[^\d]/g, "")) : n;
  if (!Number.isFinite(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num as number);
};