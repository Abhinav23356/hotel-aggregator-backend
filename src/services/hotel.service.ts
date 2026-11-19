import { randomUUID } from "node:crypto";
import { Client, Connection } from "@temporalio/client";
import type { HotelOffer } from "../types/hotel";
import { readCachedOffers, writeOffers } from "../redis/redis.client";

let temporalConnection: Connection | undefined;
let temporalClient: Client | undefined;

export async function connectTemporalClient() {
  temporalConnection = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233" });
  temporalClient = new Client({ connection: temporalConnection, namespace: process.env.TEMPORAL_NAMESPACE ?? "default" });
  return temporalClient;
}

export async function closeTemporalClient() {
  temporalConnection?.close();
}

export async function getHotelOffers(city: string, minPrice?: number, maxPrice?: number): Promise<HotelOffer[]> {
  const cached = await readCachedOffers(city, minPrice, maxPrice);
  if (cached !== null) return cached;
  if (!temporalClient) throw new Error("Temporal client is not connected");
  const allOffers = await temporalClient.workflow.execute("hotelAggregationWorkflow", {
    taskQueue: process.env.TEMPORAL_TASK_QUEUE ?? "hotel-aggregation",
    workflowId: `hotel-aggregation-${city}-${randomUUID()}`,
    args: [city]
  }) as HotelOffer[];
  await writeOffers(city, allOffers);
  // The initial request also uses Redis for all price filtering.
  return (await readCachedOffers(city, minPrice, maxPrice)) ?? [];
}
