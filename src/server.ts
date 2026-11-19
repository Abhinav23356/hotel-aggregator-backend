import express from "express";
import pino from "pino";
import pinoHttp from "pino-http";
import { hotelRouter } from "./routes/hotel.routes";
import { supplierAHandler, supplierBHandler } from "./suppliers/handlers";
import { closeTemporalClient, connectTemporalClient } from "./services/hotel.service";
import { redis } from "./redis/redis.client";
import { runWorker } from "./temporal/worker";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });
const app = express();
app.use(pinoHttp({ logger }));
app.use(express.json());
app.get("/health", async (_req, res) => {
  const checks: Record<string, string> = { redis: "down", temporal: "down", supplierA: "down", supplierB: "down" };
  try { await redis.ping(); checks.redis = "up"; } catch { /* reported below */ }
  try {
    const base = process.env.SUPPLIER_API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`;
    const [a, b] = await Promise.all([
      fetch(`${base}/supplierA/hotels?city=delhi`, { signal: AbortSignal.timeout(1500) }),
      fetch(`${base}/supplierB/hotels?city=delhi`, { signal: AbortSignal.timeout(1500) })
    ]);
    checks.supplierA = a.ok ? "up" : "down";
    checks.supplierB = b.ok ? "up" : "down";
  } catch { /* reported below */ }
  try {
    const temporalAddress = process.env.TEMPORAL_ADDRESS ?? "localhost:7233";
    const { Connection } = await import("@temporalio/client");
    const connection = await Connection.connect({ address: temporalAddress, connectTimeout: 2000 });
    await connection.close();
    checks.temporal = "up";
  } catch { /* reported below */ }
  const healthy = Object.values(checks).every((status) => status === "up");
  return res.status(healthy ? 200 : 503).json({ status: healthy ? "ok" : "degraded", checks });
});
app.get("/supplierA/hotels", supplierAHandler);
app.get("/supplierB/hotels", supplierBHandler);
app.use("/api", hotelRouter);
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err: error }, "Request failed");
  return res.status(502).json({ error: "Hotel aggregation failed", message: error instanceof Error ? error.message : "Unknown error" });
});

async function start() {
  await redis.connect();
  await connectTemporalClient();
  const port = Number(process.env.PORT ?? 3000);
  const server = app.listen(port, () => logger.info({ port }, "Hotel aggregator API listening"));
  const workerPromise = runWorker();
  const shutdown = async () => {
    server.close();
    await Promise.allSettled([closeTemporalClient(), redis.quit()]);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  workerPromise.catch((error) => { logger.error({ err: error }, "Temporal worker stopped"); process.exitCode = 1; });
}

start().catch((error) => { logger.fatal({ err: error }, "Startup failed"); process.exit(1); });
