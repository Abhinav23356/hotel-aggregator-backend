import type { HotelOffer, SupplierOffer } from "../types/hotel";

export function chooseCheapestOffers(...supplierResults: SupplierOffer[][]): HotelOffer[] {
  const cheapest = new Map<string, HotelOffer>();
  for (const offer of supplierResults.flat()) {
    const key = `${offer.city.trim().toLocaleLowerCase()}|${offer.name.trim().toLocaleLowerCase()}`;
    const current = cheapest.get(key);
    if (!current || offer.price < current.price) cheapest.set(key, offer);
  }
  return [...cheapest.values()].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}
