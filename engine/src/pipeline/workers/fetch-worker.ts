import { Worker } from '@temporalio/worker';
import { fetchActivity } from '../activities/fetch';

async function main() {
  const worker = await Worker.create({
    workflowsPath: require.resolve('../workflows/source-ingestion'),
    activities: { fetchActivity },
    taskQueue: 'fetch',
    maxConcurrentActivityTaskExecutions: 50,
  });
  await worker.run();
}

main().catch(console.error);
