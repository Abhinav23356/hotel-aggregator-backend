import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities";

export async function runWorker() {
  const connection = await NativeConnection.connect({ address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233" });
  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE ?? "default",
    taskQueue: process.env.TEMPORAL_TASK_QUEUE ?? "hotel-aggregation",
    workflowsPath: require.resolve("./workflows"),
    activities
  });
  await worker.run();
}
