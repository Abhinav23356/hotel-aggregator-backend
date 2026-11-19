import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "./activities";
import { chooseCheapestOffers } from "../utils/compare-hotels";
import type { HotelOffer } from "../types/hotel";

const { fetchSupplierA, fetchSupplierB } = proxyActivities<typeof activities>({
  startToCloseTimeout: "10 seconds",
  retry: { initialInterval: "1 second", backoffCoefficient: 2, maximumInterval: "10 seconds", maximumAttempts: 3 }
});

export async function hotelAggregationWorkflow(city: string): Promise<HotelOffer[]> {
  const [supplierA, supplierB] = await Promise.all([fetchSupplierA(city), fetchSupplierB(city)]);
  return chooseCheapestOffers(supplierA, supplierB);
}
