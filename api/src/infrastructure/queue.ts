import { Queue, Worker, type Job, type WorkerOptions } from "bullmq";
import Redis from "ioredis";

const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();

/** BullMQ requires maxRetriesPerRequest: null for blocking commands. */
function createBullMQConnection(): Redis {
  return new Redis(process.env.REDIS_URL ?? "redis://localhost:6380", {
    maxRetriesPerRequest: null,
  });
}

export function getOrCreateQueue(name: string): Queue {
  if (queues.has(name)) return queues.get(name)!;
  const queue = new Queue(name, {
    connection: createBullMQConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: false,
    },
  });
  queues.set(name, queue);
  return queue;
}

export function registerWorker(
  queueName: string,
  processor: (job: Job) => Promise<void>,
  opts?: Partial<WorkerOptions>
): Worker {
  const worker = new Worker(queueName, processor, {
    connection: createBullMQConnection(),
    concurrency: 1,
    ...opts,
  });

  worker.on("failed", (job, err) => {
    console.error(`[queue:${queueName}] job ${job?.id} failed:`, err.message);
  });
  worker.on("completed", (job) => {
    console.log(`[queue:${queueName}] job ${job.id} completed`);
  });

  workers.set(queueName, worker);
  return worker;
}

export async function closeAllQueues(): Promise<void> {
  for (const [name, worker] of workers) {
    await worker.close();
    console.log(`[queue] worker ${name} closed`);
  }
  for (const [name, queue] of queues) {
    await queue.close();
    console.log(`[queue] queue ${name} closed`);
  }
}
