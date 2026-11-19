export interface SupplierOffer {
  hotelId: string;
  name: string;
  city: string;
  price: number;
  commissionPct: number;
  supplier: string;
}

export type HotelOffer = SupplierOffer;
