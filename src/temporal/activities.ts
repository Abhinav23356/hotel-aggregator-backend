import type { SupplierOffer } from "../types/hotel";

async function fetchSupplier(path: string, city: string): Promise<SupplierOffer[]> {
  const baseUrl = process.env.SUPPLIER_API_BASE_URL ?? "http://localhost:3000";
  const response = await fetch(`${baseUrl}/${path}?city=${encodeURIComponent(city)}`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
  return response.json() as Promise<SupplierOffer[]>;
}

export const fetchSupplierA = (city: string) => fetchSupplier("supplierA/hotels", city);
export const fetchSupplierB = (city: string) => fetchSupplier("supplierB/hotels", city);
